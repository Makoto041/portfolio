// src/app/api/quickpost/posts/route.ts
// タイムラインに投稿を作る。
// - 入力は src/lib/quickpost/input.ts で確かめる（本文・タイトル・種類・写真・二重投稿防止キー）
// - 下書きごとのキーで受付票を取り、同じ下書きの再送・二度押しでは新しく作らずに最初の投稿を返す
//   （受付票は quickpost-nonces に置く。タイムラインの表には手を入れない）
// - 投稿の保存と「受付票に結果を残す」は1つのトランザクションで確定する（途中で止まっても二重にならない）
// - 1台ごとの回数制限は SQL で原子的に数える
// - 投稿は「その端末のユーザー」として作る（Payload のアクセス制御・フックをそのまま通す）
import type { NextRequest } from 'next/server'
import type { Timeline } from '@/payload-types'
import { textToLexical } from '@/lib/richtext'
import { parseQuickPost } from '@/lib/quickpost/input'
import { isQuickPostPhoto } from '@/lib/quickpost/policy'
import { revalidate, TIMELINE_PAGES } from '@/lib/revalidate'
import {
  assertInTransaction,
  claimPostReceipt,
  completePostReceipt,
  consumeRate,
  fail,
  getSession,
  json,
  pruneNonces,
  readJson,
  recordPost,
  refreshSessionCookies,
  rejectCrossSite,
  releasePostReceipt,
  withTransaction,
} from '@/lib/quickpost/server'
import { firstLine } from '@/features/site/cardViews'

export const dynamic = 'force-dynamic'
// 写真の確認・投稿の作成・リンクのプレビュー取得（最大5秒）が重なっても途中で切れないように
export const maxDuration = 30

type MediaRow = {
  id: number
  alt?: string | null
  filename?: string | null
  isTimelineOnly?: boolean | null
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

    // 再送なら作った投稿を返し、同じ下書きをいま送っている途中なら待ってもらう（回数制限も使わない）
    const claim = await claimPostReceipt(payload, input.key, input.digest)
    if (claim.status === 'done') {
      // 投稿は前の送信で確定済み。確定の直後に止まっていた場合に備えて、ページの作り直しだけやり直す。
      // 最初に送った内容の指紋も返す（画面が、直して送り直したかを見分ける）
      await revalidate(TIMELINE_PAGES)
      return json({ id: claim.postId, duplicate: true, digest: claim.digest })
    }
    if (claim.status === 'busy') return fail(409, 'in_progress')
    const { receiptId } = claim

    let post: Timeline
    const media: MediaRow[] = []
    try {
      if (!(await consumeRate(payload, session.id, 'posts'))) {
        await releasePostReceipt(payload, receiptId)
        return fail(429, 'rate_limited')
      }

      // 写真がすべて存在し、さっと投稿で上げたものか（消された写真や、ギャラリーなどほかの写真を指していないか）
      for (const id of input.images) {
        const doc = await payload.findByID({
          collection: 'media',
          id,
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
        })
        if (!doc || !isQuickPostPhoto(doc)) {
          await releasePostReceipt(payload, receiptId)
          return fail(400, 'invalid_images')
        }
        media.push(doc)
      }

      // 投稿の保存と、受付票に投稿の ID を残すことを1つのトランザクションで確定する。
      // 間でサーバーが止まっても「投稿だけできて受付票が空」にならないので、送り直しで二重にならない
      post = await withTransaction(payload, async (txReq) => {
        const created = await payload.create({
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
          req: txReq,
        })
        // フックの中の失敗で投稿ごと取り消されていたら、受付票に書かずに失敗として返す
        assertInTransaction(txReq)
        // 写真の代替テキストが空なら、投稿の見出しか本文の1行目を入れる（読み上げ用）。投稿と一緒に確定する
        const alt = firstLine(input.title || input.text, 60)
        for (const m of media) {
          if (m.alt) continue
          await payload.update({
            collection: 'media',
            id: m.id,
            data: { alt },
            user,
            overrideAccess: false,
            depth: 0,
            req: txReq,
          })
        }
        await completePostReceipt(payload, receiptId, created.id, txReq)
        return created
      })
    } catch (e) {
      // 投稿は確定していない。結果のない受付票を消して、同じ下書きで送り直せるようにする
      await releasePostReceipt(payload, receiptId)
      throw e
    }

    // ここから先は投稿ができたあとの後始末。失敗しても投稿は成功として返す

    // 保存のフックでも再検証しているが、それは確定の前。間に作り直されたページに投稿が欠けないよう、確定後にもう一度
    await revalidate(TIMELINE_PAGES)

    const now = new Date().toISOString()
    await recordPost(payload, session.id, now).then(
      () => {
        session.lastUsedAt = now
      },
      (e) => console.error('quickpost: failed to record post', e),
    )
    await pruneNonces(payload)

    // 投稿したので「最後に使った日時」も更新済み。Cookie の期限も延ばす
    const res = json({ id: post.id })
    refreshSessionCookies(req, res, session)
    return res
  } catch (e) {
    console.error('quickpost: post failed', e)
    return fail(500, 'server_error')
  }
}
