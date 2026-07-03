// src/app/api/timeline/[id]/like/route.ts
// いいねAPI（公開エンドポイントだが以下の保護を実装）
// - 投稿IDのバリデーションと存在確認
// - httpOnly Cookie による重複いいね防止
// - IPベースの簡易レート制限（サーバーレスのためベストエフォート）
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payloadClient'

const LIKED_COOKIE = 'tl_liked'
const COOKIE_MAX_IDS = 200 // Cookie肥大化防止
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20 // 1分あたり20回/IPまで

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

function parseLikedCookie(value: string | undefined): string[] {
  if (!value) return []
  return value.split('.').filter(Boolean)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // IDバリデーション（数値ID or 英数字のみ許可）
  if (!id || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  // レート制限
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const payload = await getPayloadClient()

  // 投稿の存在確認
  let doc
  try {
    doc = await payload.findByID({ collection: 'timeline', id })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Cookieによる重複防止
  const likedIds = parseLikedCookie(request.cookies.get(LIKED_COOKIE)?.value)
  if (likedIds.includes(String(id))) {
    return NextResponse.json({ likes: doc.likes ?? 0, alreadyLiked: true })
  }

  const likes = (doc.likes ?? 0) + 1
  await payload.update({
    collection: 'timeline',
    id,
    data: { likes },
    overrideAccess: true, // likesフィールドのみサーバー側で更新（他フィールドは触らない）
  })

  const res = NextResponse.json({ likes, alreadyLiked: false })
  const nextIds = [...likedIds, String(id)].slice(-COOKIE_MAX_IDS)
  res.cookies.set(LIKED_COOKIE, nextIds.join('.'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1年
    path: '/',
  })
  return res
}
