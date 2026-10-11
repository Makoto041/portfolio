// src/app/api/quickpost/posts/route.ts
// タイムラインに投稿を作る。
// - 入力は src/lib/quickpost/input.ts で確かめる（本文・タイトル・種類・写真・二重投稿防止キー）
// - 下書きごとのキーで受付票を取り、同じ下書きの再送・二度押しでは新しく作らずに最初の投稿を返す
//   （受付票は quickpost-nonces に置く。タイムラインの表には手を入れない）
// - 1台ごとの回数制限は SQL で原子的に数える
// - 投稿は「その端末のユーザー」として作る（Payload のアクセス制御・フックをそのまま通す）
import type { NextRequest } from 'next/server'
import type { Timeline } from '@/payload-types'
import { textToLexical } from '@/lib/richtext'
import { parseQuickPost } from '@/lib/quickpost/input'
import {
  claimPostReceipt,
  completePostReceipt,
  consumeRate,
  fail,
  getSession,
  json,
  pruneNonces,
  readJson,
  refreshSessionCookies,
  rejectCrossSite,
  releasePostReceipt,
} from '@/lib/quickpost/server'
import { firstLine } from '@/features/site/cardViews'

export const dynamic = 'force-dynamic'
// 写真の確認・投稿の作成・リンクのプレビュー取得（最大5秒）が重なっても途中で切れないように
export const maxDuration = 30

type MediaRow = { id: number; alt?: string | null }

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

    // 再送なら作った投稿を返し、同じ下書きをいま送っている途中なら待ってもらう（回数制限も使わない）
    const claim = await claimPostReceipt(payload, input.key)
    if (claim.status === 'done') return json({ id: claim.postId, duplicate: true })
    if (claim.status === 'busy') return fail(409, 'in_progress')
    const { receiptId } = claim

    let postId: number | null = null
    try {
      if (!(await consumeRate(payload, session.id, 'posts'))) {
        await releasePostReceipt(payload, receiptId)
        return fail(429, 'rate_limited')
      }

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
        if (!doc) {
          await releasePostReceipt(payload, receiptId)
          return fail(400, 'invalid_images')
        }
        media.push(doc)
      }

      const post = await payload.create({
        collection: 'timeline',
        data: {
          title: input.title,
          postType: input.postType,
          text: textToLexical(input.text) as Timeline['text'],
          images: input.images.map((image) => ({ image })),
          publishedAt: new Date().toISOString(),
        },
        user,
        overrideAccess: false,
        depth: 0,
      })
      postId = post.id
      await completePostReceipt(payload, receiptId, post.id)

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
      await pruneNonces(payload)

      // 投稿したので「最後に使った日時」も更新済み。Cookie の期限も延ばす
      const res = json({ id: post.id })
      refreshSessionCookies(req, res, session)
      return res
    } catch (e) {
      if (postId === null) {
        // 投稿ができていなければ、同じ下書きで送り直せるよう受付票を消す
        await releasePostReceipt(payload, receiptId)
      } else {
        // 投稿はできている。受付票に結果を残せていなければもう一度試す（再送で二重にしない）
        await completePostReceipt(payload, receiptId, postId).catch(() => {})
      }
      throw e
    }
  } catch (e) {
    console.error('quickpost: post failed', e)
    return fail(500, 'server_error')
  }
}
