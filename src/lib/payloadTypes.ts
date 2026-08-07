// ───────────────────────────────────────────
// src/lib/payloadTypes.ts
// ───────────────────────────────────────────

/** すべてのコレクションで共通のフィールド */
export interface BaseDoc {
  id: string | number // ★ number も許容
  createdAt: string
  updatedAt?: string
}

/** タイムライン投稿タイプ */
export type TimelinePostType =
  | 'diary'
  | 'tech'
  | 'photo'
  | 'making'
  | 'event'
  | 'travel'
  | 'study'

/** Timeline 用ドキュメント */
export interface TimelineDoc extends BaseDoc {
  title?: string | null
  postType?: TimelinePostType | null
  text: any // richText JSON または文字列
  publishedAt?: string
  images?: { id: string; image: { id: string; url: string; sizes?: Record<string, { url: string }> } }[]
  likes?: number
  embedUrl?: string
  urlMetadata?: {
    title?: string
    description?: string
    image?: string
    siteName?: string
    url?: string
  }
  tags?: string[]
  priority?: 'normal' | 'important' | 'pinned'
  related?: {
    event?: (Event | string | number) | null
    post?: (BlogPost | string | number) | null
    product?: (Product | string | number) | null
  }
}

/** Gallery 用ドキュメント */
export interface MediaDoc extends BaseDoc {
  /** upload フィールド直下 */
  url?: string
  /** ネスト upload 用 */
  image?: { url?: string; sizes?: Record<string, { url: string }> }
  /** 生成された各サイズのURL */
  sizes?: Record<string, { url: string }>
  /** 原本の実寸（sharp 設定時に Payload が自動格納） */
  width?: number
  height?: number
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

/** Event 用ドキュメント */
export interface Event extends BaseDoc {
  title: string
  summary?: string | null
  platform?: string
  externalUrl?: string
  startDate: string
  endDate?: string
  thumbnail?: { url?: string }
  slug: string
  isPublic?: boolean
}

/** Product 用ドキュメント */
export interface Product extends BaseDoc {
  name: string
  description?: string
  url?: string
  image?: { url?: string }
  tags?: string[]
  order?: number
}
