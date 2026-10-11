// src/lib/quickpost/input.ts
// さっと投稿の入力チェック（純粋な関数。単体テストあり）。
// サーバーは画面から来た値を信用せず、ここで形・長さ・種類を確かめてから保存する。
import type { TimelinePostType } from '@/lib/payloadTypes'

export const POST_TYPES: readonly TimelinePostType[] = [
  'diary',
  'photo',
  'travel',
  'tech',
  'making',
  'study',
  'event',
]

export const LIMITS = {
  /** 本文の上限（文字数） */
  text: 5000,
  /** タイトルの上限（文字数） */
  title: 100,
  /** 写真の枚数（タイムラインの images は最大3） */
  images: 3,
} as const

/** 写真として受け付ける形式（Content-Type）。本当に読めるかはサーバーが中身で確かめる（HEIC は環境によって読めない） */
export const PHOTO_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
]

const PHOTO_EXTENSIONS: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
}

/** 写真の形式（Content-Type）。端末が形式を空で渡したとき（HEIC で起きる）は拡張子から補う */
export function photoTypeOf(type: string, name: string): string {
  if (type) return type.toLowerCase()
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase()
  return (ext && PHOTO_EXTENSIONS[ext]) || ''
}

/** ブラウザで縮小できない写真を、そのままサーバーに送ってよいか（受け付ける形式で、空でなく上限以下） */
export function canSendPhotoAsIs(type: string, size: number, maxBytes: number): boolean {
  return PHOTO_TYPES.includes(type.toLowerCase()) && size > 0 && size <= maxBytes
}

export type QuickPostInput = {
  text: string
  title?: string
  postType: TimelinePostType
  /** アップロード済みの写真（media の ID） */
  images: number[]
  /** 二重投稿を防ぐための、下書きごとの ID（UUID v4） */
  key: string
  /**
   * 送った内容の指紋（画面で計算した SHA-256 の16進 64 文字）。受付票に残し、同じキーの送り直しで
   * 「すでに投稿済み」と返すときに一緒に返す（画面が、直して送り直したかを見分ける）
   */
  digest?: string
}

export type ParseResult = { ok: true; value: QuickPostInput } | { ok: false; error: string }

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256_HEX = /^[0-9a-f]{64}$/

// 改行・タブ以外の制御文字（見えない文字で表示を崩させない）
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/** 文字数（絵文字などのサロゲートペアを1文字と数える） */
const charCount = (s: string) => Array.from(s).length

/** 本文の正規化: 改行を \n に揃え、制御文字を除き、前後の空白を落とす */
export function normalizeText(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').replace(CONTROL, '').trim()
}

export function parseQuickPost(body: unknown): ParseResult {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return { ok: false, error: 'invalid_body' }
  const b = body as Record<string, unknown>

  if (typeof b.text !== 'string') return { ok: false, error: 'text_required' }
  const text = normalizeText(b.text)
  if (!text) return { ok: false, error: 'text_required' }
  if (charCount(text) > LIMITS.text) return { ok: false, error: 'text_too_long' }

  let title: string | undefined
  if (b.title !== undefined && b.title !== null) {
    if (typeof b.title !== 'string') return { ok: false, error: 'invalid_title' }
    // タイトルは1行
    const t = normalizeText(b.title).replace(/\s*\n\s*/g, ' ')
    if (charCount(t) > LIMITS.title) return { ok: false, error: 'title_too_long' }
    title = t || undefined
  }

  const postType = b.postType === undefined ? 'diary' : b.postType
  if (typeof postType !== 'string' || !(POST_TYPES as readonly string[]).includes(postType)) {
    return { ok: false, error: 'invalid_post_type' }
  }

  const rawImages = b.images === undefined ? [] : b.images
  if (!Array.isArray(rawImages) || rawImages.length > LIMITS.images)
    return { ok: false, error: 'invalid_images' }
  if (!rawImages.every((id) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0)) {
    return { ok: false, error: 'invalid_images' }
  }
  const images = [...new Set(rawImages as number[])]

  if (typeof b.key !== 'string' || !UUID_V4.test(b.key)) return { ok: false, error: 'invalid_key' }

  let digest: string | undefined
  if (b.digest !== undefined && b.digest !== null) {
    if (typeof b.digest !== 'string' || !SHA256_HEX.test(b.digest)) {
      return { ok: false, error: 'invalid_digest' }
    }
    digest = b.digest
  }

  return {
    ok: true,
    value: {
      text,
      title,
      postType: postType as TimelinePostType,
      images,
      key: b.key.toLowerCase(),
      digest,
    },
  }
}

/** 端末の名前（ログイン中の端末の一覧に出す）。User-Agent から大まかに判定する */
export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent ?? ''
  const device = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Macintosh|Mac OS X/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Linux|CrOS/.test(ua)
              ? 'Linux'
              : '端末'
  const browser = /EdgiOS|Edg\//.test(ua)
    ? 'Edge'
    : /FxiOS|Firefox\//.test(ua)
      ? 'Firefox'
      : /CriOS|Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : ''
  return browser ? `${device}（${browser}）` : device
}
