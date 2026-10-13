// src/app/api/quickpost/photo/route.ts
// POST: 写真を1枚受け取り、サーバーで作り直して（向きを反映・位置情報などの撮影データを削除・長辺を縮小）保存する。
//   本文は画像のバイト列そのもの（Content-Type: image/*）。スマホ側で写真を選んだ時点で縮小して送ってくる。
//   保存した写真は「タイムライン専用」「投稿待ち（pending）」にしておき、投稿に使われるまで公開しない。
//   送ったあとに、投稿に使われないまま古くなった写真を片付ける（書きかけで閉じた下書きの写真）。
// DELETE ?id=: 画面で外した写真を消す（さっと投稿で上げて、まだ投稿に使っていない写真だけ）。
import { randomUUID } from 'node:crypto'
import { after, type NextRequest } from 'next/server'
import { QP } from '@/lib/quickpost/config'
import { reencodePhoto, UnsupportedImageError } from '@/lib/quickpost/image'
import { PHOTO_TYPES } from '@/lib/quickpost/input'
import { isDiscardablePhoto, QUICKPOST_PHOTO_PREFIX } from '@/lib/quickpost/policy'
import {
  cleanupStalePhotos,
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

/** 写真を1枚受け取り、作り直して「投稿待ち」で保存する。応答のあとに古い投稿待ちの写真を片付ける */
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
      // 投稿に使われるまでは公開しない（投稿の保存と同じトランザクションで pending を外す。TimelinePosts のフック）
      data: { alt: '', isTimelineOnly: true, pending: true },
      // 元のファイル名は使わない（端末の情報を残さない・推測されにくい名前にする）
      file: {
        data: photo,
        mimetype: 'image/jpeg',
        name: `${QUICKPOST_PHOTO_PREFIX}${randomUUID()}.jpg`,
        size: photo.length,
      },
      user,
      overrideAccess: false,
      depth: 0,
    })

    // 応答を返したあとに片付ける（写真を送る時間を延ばさない）
    after(() =>
      cleanupStalePhotos(payload).catch((e) =>
        console.error('quickpost: failed to clean up photos', e),
      ),
    )

    const res = json({ id: media.id })
    if (await touchSession(active)) refreshSessionCookies(req, res, session)
    return res
  } catch (e) {
    console.error('quickpost: photo upload failed', e)
    return fail(500, 'server_error')
  }
}

/**
 * 画面で外した写真を消す。さっと投稿で上げて、まだ投稿に使っていない写真（pending）だけを消す
 * （投稿に使った写真・ギャラリーの写真は消さない）。もう無ければ、消えた結果は同じなので成功として返す
 */
export async function DELETE(req: NextRequest) {
  const blocked = rejectCrossSite(req)
  if (blocked) return blocked

  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!Number.isSafeInteger(id) || id <= 0) return fail(400, 'invalid_id')

  try {
    const active = await getSession(req)
    if (!active) return fail(401, 'unauthorized')
    const { payload, user } = active

    const doc = await payload.findByID({
      collection: 'media',
      id,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    })
    if (!doc) return json({ ok: true })
    if (!isDiscardablePhoto(doc)) return fail(409, 'in_use')
    // 確かめてから消すまでの間に投稿に使われても、投稿の写真は消えない（timeline_images.image_id が NOT NULL のため
    // 削除は DB で失敗し、ファイルも消えない。src/lib/quickpost/server.ts の cleanupStalePhotos を参照）

    await payload.delete({ collection: 'media', id, user, overrideAccess: false, depth: 0 })
    return json({ ok: true })
  } catch (e) {
    console.error('quickpost: photo discard failed', e)
    return fail(500, 'server_error')
  }
}
