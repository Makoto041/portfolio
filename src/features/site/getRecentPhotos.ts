// ───────────────────────────────────────────
// src/features/site/getRecentPhotos.ts
// ベタ焼き（最近の写真）用の写真。ホームと /timeline の脇で共用し、React cache で
// 同一リクエスト内の重複取得をまとめる。取得に失敗したら空（ベタ焼きを出さない）。
// ───────────────────────────────────────────
import { cache } from 'react'
import { getPayloadClient } from '@/lib/payloadClient'
import { GALLERY_WHERE } from '@/features/site/getTodayData'
import type { ColumnPhoto } from '@/components/soda/SodaContactSheet'
import type { MediaDoc } from '@/lib/payloadTypes'

/** ベタ焼きのコマ数（3列×3段） */
export const CONTACT_SHEET_SIZE = 9

export const getRecentPhotos = cache(async (): Promise<ColumnPhoto[]> => {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'media',
      limit: CONTACT_SHEET_SIZE,
      sort: '-createdAt',
      where: GALLERY_WHERE,
      depth: 0,
    })
    return (res.docs as unknown as MediaDoc[])
      .filter((m) => m.url)
      .map((m) => ({ key: String(m.id), url: m.url as string, alt: m.alt }))
  } catch (e) {
    console.error('Recent photos fetch failed (contact sheet hidden):', e)
    return []
  }
})
