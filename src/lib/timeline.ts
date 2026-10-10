// ───────────────────────────────────────────
// src/lib/timeline.ts
// タイムラインの定数と表示用ヘルパー（server/client 共用）。
// 'use client' モジュールからの export はサーバー側でクライアント参照に
// なり得るため、共用の定数・純関数はこの境界なしモジュールに置く。
// ───────────────────────────────────────────
import { lexicalToPlainText } from '@/lib/richtext'
import type { TimelineDoc, TimelinePostType } from '@/lib/payloadTypes'

/** 1ページの取得件数。/timeline の SSR 初期取得（page 1 とみなす）と
    クライアントの追加読込（page 2〜）で必ず同じ値を使うこと */
export const TIMELINE_PAGE_SIZE = 20

/** 投稿タイプの表示ラベル */
export const TYPE_LABELS: Record<TimelinePostType, string> = {
  diary: '日記',
  tech: '技術メモ',
  photo: '写真',
  making: '制作',
  event: 'イベント',
  travel: 'おでかけ',
  study: '学習',
}

/** 投稿に添付された写真1枚分の表示モデル */
export type GridPhoto = {
  key: string
  url: string
  alt?: string | null
  width?: number | null
  height?: number | null
}

/** 投稿の写真（URL のあるものを最大4枚） */
export function postPhotos(post: TimelineDoc): GridPhoto[] {
  return (post.images ?? [])
    .filter((img) => img?.image?.url)
    .slice(0, 4)
    .map((img, i) => ({
      key: String(img.id ?? img.image.id ?? i),
      url: img.image.url,
      alt: img.image.alt,
      width: img.image.width,
      height: img.image.height,
    }))
}

/** 画像の代替テキスト等に使う投稿の要約（タイトル or 本文の1行目・40字まで） */
export function postSummary(post: TimelineDoc, max = 40): string {
  const text = post.title || lexicalToPlainText(post.text)
  const first = text.split('\n')[0] ?? ''
  return first.length > max ? `${first.slice(0, max)}…` : first
}
