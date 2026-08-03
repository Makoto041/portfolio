// src/app/api/letter/route.ts
// お問い合わせフォームAPI（公開エンドポイントだが以下の保護を実装）
// - 入力のバリデーション（型・文字数上限）
// - IPベースの簡易レート制限（サーバーレスのためベストエフォート）
// - Payload local API 経由で作成し、Letters コレクションの通知メールフックを発火させる
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payloadClient'

const NAME_MAX = 100
const MESSAGE_MAX = 5000
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5 // 1分あたり5回/IPまで

// インスタンス生存中のみ有効な簡易レートリミッタ
const rateMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT_MAX
}

export async function POST(req: NextRequest) {
  // x-real-ip はプラットフォーム（Vercel）が設定する信頼できる値を優先し、
  // クライアントが偽装しうる x-forwarded-for は最後のフォールバックにする
  const ip =
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, message } = (body ?? {}) as { name?: unknown; message?: unknown }
  if (typeof name !== 'string' || typeof message !== 'string') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const trimmedName = name.trim()
  const trimmedMessage = message.trim()
  if (!trimmedName || !trimmedMessage) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (trimmedName.length > NAME_MAX || trimmedMessage.length > MESSAGE_MAX) {
    return NextResponse.json({ error: 'Input too long' }, { status: 400 })
  }

  try {
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'letter',
      data: {
        name: trimmedName,
        message: trimmedMessage,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Letter create error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
