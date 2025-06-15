// ───────────────────────────────────────────
// src/lib/payloadTypes.ts
// ───────────────────────────────────────────

/** すべてのコレクションで共通のフィールド */
export interface BaseDoc {
  id: string | number // ★ number も許容
  createdAt: string
  updatedAt?: string
}

/** Timeline 用ドキュメント */
export interface TimelineDoc extends BaseDoc {
  text: string
  publishedAt?: string
  images?: { id: string; image: { id: string; url: string; sizes?: Record<string, { url: string }> } }[]
  likes?: number
}

/** Gallery 用ドキュメント */
export interface MediaDoc extends BaseDoc {
  /** upload フィールド直下 */
  url?: string
  /** ネスト upload 用 */
  image?: { url?: string; sizes?: Record<string, { url: string }> }
  /** 生成された各サイズのURL */
  sizes?: Record<string, { url: string }>
  /** alt テキスト */
  alt?: string
  /** タイムライン専用フラグ */
  isTimelineOnly?: boolean
}

/** BlogPost 用ドキュメント */
export interface BlogPost extends BaseDoc {
  title: string
  excerpt?: string
  slug?: string
  coverImage?: {
    id: string
    url: string
  }
  publishedAt?: string // ← 追加
  body?: any // ← richText を受け取る
}
