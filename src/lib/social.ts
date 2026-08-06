// ───────────────────────────────────────────
// src/lib/social.ts
// SNS プラットフォーム表記の単一ソース。
// MistRail / MistCompactIntro / Profile ページで重複していた
// ラベルマップとプロフィール表示型を集約する。
// ───────────────────────────────────────────

/** SiteSettings.profile.socialLinks の1件（表示用） */
export type SocialLink = {
  platform?: string | null
  url?: string | null
  displayName?: string | null
}

/** プロフィール表示モデル（SiteSettings.profile から整形） */
export type ProfileData = {
  name?: string | null
  nameJapanese?: string | null
  title?: string | null
  description?: string | null
  imageUrl?: string | null
  socialLinks?: SocialLink[]
}

type LabelStyle = 'full' | 'term' | 'short'

/** full: 正式表記 / term: ターミナル意匠の小文字 / short: SP コンパクト行の略記 */
const LABELS: Record<LabelStyle, Record<string, string>> = {
  full: {
    twitter: 'X',
    instagram: 'Instagram',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
  },
  term: {
    twitter: 'x',
    instagram: 'instagram',
    github: 'github',
    linkedin: 'linkedin',
    youtube: 'youtube',
  },
  short: {
    twitter: 'x',
    instagram: 'ig',
    github: 'gh',
    linkedin: 'in',
    youtube: 'yt',
  },
}

/** プラットフォーム名の表示ラベル。未知のプラットフォームは null */
export function platformLabel(
  platform: string | null | undefined,
  style: LabelStyle,
): string | null {
  if (!platform) return null
  return LABELS[style][platform] ?? null
}

/** リンク1件の表示名（displayName 優先 → プラットフォーム表記 → fallback） */
export function socialLabel(link: SocialLink, style: LabelStyle, fallback = 'link'): string {
  const display = link.displayName ?? undefined
  if (display) return style === 'full' ? display : display.toLowerCase()
  return platformLabel(link.platform, style) ?? (style === 'full' ? (link.platform ?? fallback) : fallback)
}
