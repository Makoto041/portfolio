// src/app/api/quickpost/logout/route.ts
// この端末（scope: 'this'）か、すべての端末（scope: 'all'）からログアウトする。
// サーバーの記録を消すので、Cookie が残っていても二度と使えない。
import type { NextRequest } from 'next/server'
import { clearSessionCookies, getSession, json, readJson, rejectCrossSite } from '@/lib/quickpost/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const blocked = rejectCrossSite(req)
  if (blocked) return blocked

  const body = (await readJson(req, 1024)) as { scope?: unknown } | undefined
  const all = body?.scope === 'all'

  try {
    const active = await getSession(req)
    if (active) {
      const { payload, session, user } = active
      await payload.delete({
        collection: 'post-sessions',
        where: all ? { user: { equals: user.id } } : { id: { equals: session.id } },
        overrideAccess: true,
      })
    }
    const res = json({ ok: true })
    clearSessionCookies(res)
    return res
  } catch (e) {
    console.error('quickpost: logout failed', e)
    return json({ error: 'server_error' }, 500)
  }
}
