// src/app/api/line/webhook/route.ts
// LINE Messaging API webhook（Issue #35）
// 許可ユーザーが 1:1 トークで送ったテキストを Timeline に投稿し、確認をリッチメッセージで返信する。
// セキュリティ:
//   1) x-line-signature（HMAC-SHA256）でリクエストの真正性を検証
//   2) source.type=user（1:1トーク）に限定し、送信者 userId を LINE_ALLOWED_USER_ID のホワイトリストに限定
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payloadClient'
import type { Timeline } from '@/payload-types'
import {
  verifyLineSignature,
  isAllowedUser,
  textToLexical,
  buildConfirmFlex,
  buildTextMessage,
  replyLine,
} from '@/lib/line'

export const runtime = 'nodejs' // node:crypto / payload を使うため edge 不可
export const dynamic = 'force-dynamic'

type LineEvent = {
  type?: string
  replyToken?: string
  webhookEventId?: string
  deliveryContext?: { isRedelivery?: boolean }
  source?: { type?: string; userId?: string }
  message?: { type?: string; text?: string }
}

export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const allowList = process.env.LINE_ALLOWED_USER_ID

  if (!channelSecret || !accessToken) {
    console.error('LINE webhook: LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN が未設定です')
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  if (!allowList) {
    console.warn('LINE webhook: LINE_ALLOWED_USER_ID が未設定のため、すべての投稿を拒否します')
  }

  // 署名検証には生ボディが必要（パース前に取得）
  const raw = await req.text()
  const signature = req.headers.get('x-line-signature')
  if (!verifyLineSignature(raw, signature, channelSecret)) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 })
  }

  let body: { events?: LineEvent[] }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: true }) // 空/検証リクエスト等は 200 で受ける
  }
  const events = Array.isArray(body.events) ? body.events : []

  for (const event of events) {
    const replyToken = event.replyToken
    let created = false
    try {
      // 再送イベントは投稿しない（初回で成功済みの可能性が高く、二重投稿を防ぐ）
      if (event.deliveryContext?.isRedelivery) continue
      // テキストメッセージ以外は無視（画像等は今後対応）
      if (event.type !== 'message' || event.message?.type !== 'text') continue
      // グループ/ルームの発言を公開しないよう 1:1 トークのみ受け付ける
      if (event.source?.type !== 'user') continue

      // ホワイトリスト外からは投稿させない
      if (!isAllowedUser(event.source?.userId, allowList)) {
        if (replyToken) {
          await replyLine(
            replyToken,
            [buildTextMessage('この LINE アカウントからは投稿できません。')],
            accessToken,
          )
        }
        continue
      }

      const text = String(event.message.text ?? '').trim()
      if (!text) {
        if (replyToken) {
          await replyLine(
            replyToken,
            [buildTextMessage('本文が空です。テキストを送ってください。')],
            accessToken,
          )
        }
        continue
      }

      // Timeline へ投稿（LINE 経由の作成を許可するため overrideAccess）。
      // '/' と '/timeline' の ISR 再検証は TimelinePosts の afterChange フックが担う。
      const payload = await getPayloadClient()
      await payload.create({
        collection: 'timeline',
        data: {
          text: textToLexical(text) as Timeline['text'],
          postType: 'diary',
          publishedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })
      created = true

      if (replyToken) {
        await replyLine(replyToken, [buildConfirmFlex(text)], accessToken)
      }
    } catch (err) {
      console.error('LINE webhook event error:', err)
      if (replyToken) {
        // 投稿自体は成功して後続（確認送信等）で失敗したケースを取り違えない
        const message = created
          ? '投稿は完了しましたが、確認メッセージの送信に失敗しました。'
          : '投稿に失敗しました。時間をおいて再度お試しください。'
        try {
          await replyLine(replyToken, [buildTextMessage(message)], accessToken)
        } catch {
          // リプライ失敗は握りつぶす（webhook 応答は 200 を維持）
        }
      }
    }
  }

  // LINE には常に 200 を返す（非 200 だと再送ループになるため）
  return NextResponse.json({ ok: true })
}

// ヘルスチェック用（LINE コンソールの Verify は署名付き POST で来るため必須ではない）
export async function GET() {
  return NextResponse.json({ ok: true })
}
