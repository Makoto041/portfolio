// src/app/api/quickpost/posts/route.ts
// タイムラインに投稿を作る。
// - 入力は src/lib/quickpost/input.ts で確かめる（本文・タイトル・種類・写真・二重投稿防止キー）
// - 同じキーの投稿がすでにあれば、新しく作らずにそれを返す（二度押し・電波切れでの再送）
// - 投稿は「その端末のユーザー」として作る（Payload のアクセス制御・フックをそのまま通す）
import type { NextRequest } from 'next/server'
import type { Payload } from 'payload'
import type { Timeline } from '@/payload-types'
import { textToLexical } from '@/lib/richtext'
import { QP } from '@/lib/quickpost/config'
import { parseQuickPost } from '@/lib/quickpost/input'
import { takeRate } from '@/lib/quickpost/policy'
import {
  fail,
  getSession,
  json,
  readJson,
  refreshSessionCookies,
  rejectCrossSite,
} from '@/lib/quickpost/server'
import { firstLine } from '@/features/site/cardViews'

export const dynamic = 'force-dynamic'

type MediaRow = { id: number; alt?: string | null }

async function findByKey(payload: Payload, key: string) {
  const found = await payload.find({
    collection: 'timeline',
    where: { quickPostKey: { equals: key } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return found.docs[0] as { id: number | string } | undefined
}

export async function POST(req: NextRequest) {
  const blocked = rejectCrossSite(req)
  if (blocked) return blocked

  const parsed = parseQuickPost(await readJson(req))
  if (!parsed.ok) return fail(400, parsed.error)
  const input = parsed.value

  try {
    const active = await getSession(req)
    if (!active) return fail(401, 'unauthorized')
    const { payload, session, user } = active

    // 再送なら、すでに作った投稿を返す（回数制限も消費しない）
    const existing = await findByKey(payload, input.key)
    if (existing) return json({ id: existing.id, duplicate: true })

    const rate = takeRate(session, 'posts', QP.rate)
    if (!rate.ok) return fail(429, 'rate_limited')
    await payload.update({
      collection: 'post-sessions',
      id: session.id,
      data: rate.next,
      depth: 0,
      overrideAccess: true,
    })

    // 写真がすべて存在するか（消された写真を指していないか）
    const media: MediaRow[] = []
    for (const id of input.images) {
      const doc = await payload.findByID({
        collection: 'media',
        id,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      })
      if (!doc) return fail(400, 'invalid_images')
      media.push(doc as unknown as MediaRow)
    }

    let post: { id: number | string }
    try {
      post = await payload.create({
        collection: 'timeline',
        data: {
          title: input.title,
          postType: input.postType,
          text: textToLexical(input.text) as Timeline['text'],
          images: input.images.map((image) => ({ image })),
          publishedAt: new Date().toISOString(),
          quickPostKey: input.key,
        },
        user,
        overrideAccess: false,
        depth: 0,
      })
    } catch (e) {
      // 同じキーの投稿が同時に届いた場合は一意制約で片方が失敗する。できた方を返す
      const raced = await findByKey(payload, input.key)
      if (raced) return json({ id: raced.id, duplicate: true })
      throw e
    }

    // 写真の代替テキストが空なら、投稿の見出しか本文の1行目を入れる（読み上げ用）
    const alt = firstLine(input.title || input.text, 60)
    await Promise.all(
      media
        .filter((m) => !m.alt)
        .map((m) =>
          payload
            .update({
              collection: 'media',
              id: m.id,
              data: { alt },
              user,
              overrideAccess: false,
              depth: 0,
            })
            .catch((e) => console.error('quickpost: failed to set alt text', e)),
        ),
    )

    const now = new Date().toISOString()
    await payload.update({
      collection: 'post-sessions',
      id: session.id,
      data: { lastPostAt: now, lastUsedAt: now, postCount: (session.postCount ?? 0) + 1 },
      depth: 0,
      overrideAccess: true,
    })
    session.lastUsedAt = now

    // 投稿したので「最後に使った日時」も更新済み。Cookie の期限も延ばす
    const res = json({ id: post.id })
    refreshSessionCookies(req, res, session)
    return res
  } catch (e) {
    console.error('quickpost: post failed', e)
    return fail(500, 'server_error')
  }
}
