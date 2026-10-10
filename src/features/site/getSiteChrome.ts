// ───────────────────────────────────────────
// src/features/site/getSiteChrome.ts
// 全ページの外枠（フッター/メニューの SNS・タグライン）に使う設定値。
// React cache で同一リクエスト内の重複取得（レイアウト＋ページ）をまとめる。
// 取得失敗・未設定でもサイト全体を巻き込まないよう既定値へ縮退する。
// ───────────────────────────────────────────
import { cache } from 'react'
import { getPayloadClient } from '@/lib/payloadClient'
import type { SocialLink } from '@/lib/social'

export const DEFAULT_TAGLINE = '日々の記録、ときどき写真。つぶやきくらいの気軽さで。'

export const FALLBACK_SOCIALS: SocialLink[] = [
  { platform: 'twitter', url: 'https://x.com/613_kmk', displayName: 'X' },
  { platform: 'instagram', url: 'https://instagram.com/makoto0140', displayName: 'Instagram' },
]

export type SiteChrome = { socials: SocialLink[]; tagline: string }

export const getSiteChrome = cache(async (): Promise<SiteChrome> => {
  try {
    const payload = await getPayloadClient()
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    const socials = (settings.profile?.socialLinks ?? []).filter((l) => l?.url) as SocialLink[]
    return {
      socials: socials.length > 0 ? socials : FALLBACK_SOCIALS,
      tagline: settings.hero?.tagline || DEFAULT_TAGLINE,
    }
  } catch (error) {
    console.error('site-settings fetch failed (chrome uses defaults):', error)
    return { socials: FALLBACK_SOCIALS, tagline: DEFAULT_TAGLINE }
  }
})
