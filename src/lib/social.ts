// ───────────────────────────────────────────
// src/lib/social.ts
// SNS プラットフォーム表記の単一ソース（ヘッダーのメニュー・フッター・プロフィールで共用）。
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

/** プラットフォームの正式表記 */
const LABELS: Record<string, string> = {
  twitter: 'X',
  instagram: 'Instagram',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
}

/** プラットフォーム名の表示ラベル。未知のプラットフォームは null */
export function platformLabel(platform: string | null | undefined): string | null {
  if (!platform) return null
  return LABELS[platform] ?? null
}

/** リンク1件の表示名（displayName 優先 → プラットフォーム表記 → スラッグ → fallback） */
export function socialLabel(link: SocialLink, fallback = 'link'): string {
  return link.displayName || platformLabel(link.platform) || link.platform || fallback
}
