// src/app/api/quickpost/session/route.ts
// 投稿ページが最初に呼ぶ: この端末がログイン中か、ログインの期限、ほかにログイン中の端末、登録済みのパスキー。
// ログイン Cookie は SameSite=Strict なので、ほかのサイトのリンクから開いた直後のページ表示には付かない。
// そのため状態はページの描画ではなく、ここ（同じサイトからの fetch）で確かめる。
import type { NextRequest } from 'next/server'
import { QP } from '@/lib/quickpost/config'
import { LIMITS } from '@/lib/quickpost/input'
import { isSessionAlive, sessionDeadline } from '@/lib/quickpost/policy'
import {
  clearSessionCookies,
  getSession,
  json,
  refreshSessionCookies,
  touchSession,
} from '@/lib/quickpost/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const active = await getSession(req)
    if (!active) {
      const res = json({ loggedIn: false })
      // 切れた Cookie と「＋ 投稿」ボタンの目印を片付ける
      if (req.cookies.has(QP.sessionCookie) || req.cookies.has(QP.hintCookie)) clearSessionCookies(res)
      return res
    }

    await touchSession(active)
    const { payload, session, user } = active
    const [others, passkeys] = await Promise.all([
      payload.find({
        collection: 'post-sessions',
        where: { and: [{ user: { equals: user.id } }, { id: { not_equals: session.id } }] },
        sort: '-lastUsedAt',
        limit: 20,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'passkeys',
        where: { user: { equals: user.id } },
        sort: '-createdAt',
        limit: 20,
        depth: 0,
        overrideAccess: true,
      }),
    ])

    const res = json({
      loggedIn: true,
      device: {
        name: session.name ?? '',
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        // 使わなければこの日時に切れる（使うたびに延びる）・最長の期限
        idleUntil: new Date(sessionDeadline(session, QP.idleMs)).toISOString(),
        expiresAt: session.expiresAt,
      },
      others: others.docs
        .filter((s) => isSessionAlive(s, QP.idleMs))
        .map((s) => ({ name: s.name ?? '', lastUsedAt: s.lastUsedAt })),
      passkeys: passkeys.docs.map((p) => ({
        name: p.name ?? '',
        createdAt: p.createdAt,
        lastUsedAt: p.lastUsedAt ?? null,
        backedUp: Boolean(p.backedUp),
      })),
      limits: { text: LIMITS.text, title: LIMITS.title, images: LIMITS.images, photoBytes: QP.maxPhotoBytes },
    })
    refreshSessionCookies(req, res, session)
    return res
  } catch (e) {
    console.error('quickpost: session check failed', e)
    return json({ error: 'server_error' }, 500)
  }
}
