// src/lib/line.ts
// LINE Messaging API 連携ヘルパー（Issue #35: LINE から Timeline へ投稿）。
// - 署名検証（x-line-signature / HMAC-SHA256）
// - 送信者 userId のホワイトリスト判定
// - プレーンテキスト → Payload Lexical editorState 変換
// - 投稿確認用の Flex（リッチ）メッセージ生成 / リプライ送信
import crypto from 'crypto'

const LINE_REPLY_ENDPOINT = 'https://api.line.me/v2/bot/message/reply'

// サイト URL は payload.config と同じ導出（末尾スラッシュ除去）
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://iwabuchi-makoto.com' : 'http://localhost:3000')
).replace(/\/$/, '')

/**
 * x-line-signature を検証する。生のリクエストボディに対する
 * HMAC-SHA256（base64）を channelSecret で計算し、timing-safe に比較する。
 */
export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string,
): boolean {
  if (!signature) return false
  const expected = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** 許可ユーザー判定（LINE_ALLOWED_USER_ID はカンマ区切りで複数可） */
export function isAllowedUser(userId: string | undefined, allowList: string | undefined): boolean {
  if (!userId || !allowList) return false
  return allowList
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(userId)
}

/**
 * プレーンテキストを Payload（lexical）の richText editorState に変換する。
 * 改行ごとに段落を分け、空行は空の段落として保持する。
 */
export function textToLexical(text: string) {
  const paragraphs = text.split('\n').map((line) => ({
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    textStyle: '',
    textFormat: 0,
    children: line
      ? [{ type: 'text', text: line, format: 0, style: '', mode: 'normal', detail: 0, version: 1 }]
      : [],
  }))
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs,
    },
  }
}

/** 投稿確認用の Flex（リッチ）メッセージ。本文プレビューとタイムラインへの導線を持つ。 */
export function buildConfirmFlex(preview: string) {
  // 絵文字（サロゲートペア）を分断しないよう code point 単位で切り詰める
  const chars = Array.from(preview)
  const trimmed = chars.length > 80 ? `${chars.slice(0, 80).join('')}…` : preview
  return {
    type: 'flex',
    altText: '✅ タイムラインに投稿しました',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: '✅ 投稿しました', weight: 'bold', size: 'lg', color: '#1f2937' },
          { type: 'text', text: trimmed, wrap: true, size: 'sm', color: '#4b5563' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#5b52a0',
            action: { type: 'uri', label: 'タイムラインを見る', uri: `${SITE_URL}/timeline` },
          },
        ],
      },
    },
  }
}

/** プレーンテキストメッセージ（エラー・権限拒否の通知に使用） */
export function buildTextMessage(text: string) {
  return { type: 'text', text }
}

/** LINE Reply API でメッセージを返信する。 */
export async function replyLine(
  replyToken: string,
  messages: unknown[],
  accessToken: string,
): Promise<boolean> {
  const res = await fetch(LINE_REPLY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
  if (!res.ok) {
    console.error('LINE reply failed:', res.status, await res.text().catch(() => ''))
  }
  return res.ok
}
