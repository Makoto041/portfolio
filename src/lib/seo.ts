// src/lib/seo.ts
// 共有OGP画像の単一ソース。安定URLのルートハンドラ `/og` が 1200×630 を生成する。
// 各ページの openGraph.images / twitter.images から明示参照することで、
// Next のメタデータ openGraph キーのシャロー置換によって og:image が消えるのを防ぐ。
// デザイン変更時は版（?v=）を上げて SNS 側のキャッシュを確実に更新させる
export const OG_IMAGE_URL = '/og?v=soda2'

export const OG_IMAGE = {
  url: OG_IMAGE_URL,
  width: 1200,
  height: 630,
  alt: '岩渕誠（いわぶちまこと） | ライフログ',
}

/** JSON-LD を <script> に埋め込むための文字列化。
    値に `</script>` 等が含まれてもタグを閉じられないよう `<` をエスケープする */
export function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
