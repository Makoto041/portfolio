// src/app/api/quickpost/photo/route.ts
// 写真を1枚受け取り、サーバーで作り直して（向きを反映・位置情報などの撮影データを削除・長辺を縮小）保存する。
// 本文は画像のバイト列そのもの（Content-Type: image/*）。スマホ側で先に縮小してから送る。
// 保存した写真は「タイムライン専用」にしておき、投稿に使われなくてもギャラリーには出さない。
import { randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { QP } from '@/lib/quickpost/config'
import { reencodePhoto, UnsupportedImageError } from '@/lib/quickpost/image'
import { PHOTO_TYPES } from '@/lib/quickpost/input'
import {
  consumeRate,
  fail,
  getSession,
  json,
  refreshSessionCookies,
  rejectCrossSite,
  touchSession,
} from '@/lib/quickpost/server'

export const dynamic = 'force-dynamic'
// 写真の作り直しと保存（R2）に時間がかかっても途中で切れないように
export const maxDuration = 30

const ACCEPT = new Set(PHOTO_TYPES)

export async function POST(req: NextRequest) {
  const blocked = rejectCrossSite(req)
  if (blocked) return blocked

  const type = (req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  if (!ACCEPT.has(type)) return fail(415, 'unsupported_type')
  if (Number(req.headers.get('content-length') ?? 0) > QP.maxPhotoBytes)
    return fail(413, 'too_large')

  try {
    const active = await getSession(req)
    if (!active) return fail(401, 'unauthorized')
    const { payload, session, user } = active

    // 1台ごとの回数制限（同時に送られても数え漏らさない）
    if (!(await consumeRate(payload, session.id, 'photos'))) return fail(429, 'rate_limited')

    const input = Buffer.from(await req.arrayBuffer())
    if (input.length === 0) return fail(400, 'empty')
    if (input.length > QP.maxPhotoBytes) return fail(413, 'too_large')

    let photo: Buffer
    try {
      photo = await reencodePhoto(input, {
        maxEdge: QP.maxPhotoEdge,
        maxInputPixels: QP.maxInputPixels,
      })
    } catch (e) {
      if (e instanceof UnsupportedImageError) return fail(415, 'unreadable_image')
      throw e
    }

    const media = await payload.create({
      collection: 'media',
      data: { alt: '', isTimelineOnly: true },
      // 元のファイル名は使わない（端末の情報を残さない・推測されにくい名前にする）
      file: {
        data: photo,
        mimetype: 'image/jpeg',
        name: `post-${randomUUID()}.jpg`,
        size: photo.length,
      },
      user,
      overrideAccess: false,
      depth: 0,
    })

    const res = json({ id: media.id })
    if (await touchSession(active)) refreshSessionCookies(req, res, session)
    return res
  } catch (e) {
    console.error('quickpost: photo upload failed', e)
    return fail(500, 'server_error')
  }
}
