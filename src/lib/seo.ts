// src/lib/seo.ts
// 共有OGP画像の単一ソース。安定URLのルートハンドラ `/api/og` が 1200×630 を生成する。
// 各ページの openGraph.images / twitter.images から明示参照することで、
// Next のメタデータ openGraph キーのシャロー置換によって og:image が消えるのを防ぐ。
export const OG_IMAGE_URL = '/og'

export const OG_IMAGE = {
  url: OG_IMAGE_URL,
  width: 1200,
  height: 630,
  alt: '岩渕誠（いわぶちまこと） | ライフログ',
}
