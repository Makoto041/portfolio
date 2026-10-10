// ───────────────────────────────────────────
// src/lib/phrase.ts
// 日本語の大きな見出しを「語の切れ目」でだけ改行させるための分割。
// CSS の word-break: keep-all と組み合わせ、各チャンクの間に <wbr> を挟んで使う
// （word-break: auto-phrase は Chrome のみのため、全ブラウザで効くようにする）。
// 純関数（テスト容易・server/client 共用）。
// ───────────────────────────────────────────

type Segmenter = { segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }> }

let cached: Segmenter | null | undefined
function getSegmenter(): Segmenter | null {
  if (cached !== undefined) return cached
  const Ctor = (Intl as unknown as { Segmenter?: new (l: string, o: object) => Segmenter }).Segmenter
  cached = Ctor ? new Ctor('ja', { granularity: 'word' }) : null
  return cached
}

// 直前の語にくっつける短いかな（助詞・助動詞の断片）と記号
const ATTACH = /^(?:[ぁ-ゖー]{1,2}|[、。，．！？!?…‥）」』】〕〉》"'・ー〜~：:；;]+)$/

/**
 * 文字列を「改行してよい位置」で区切ったチャンク配列にする。
 * Intl.Segmenter が無い環境では分割しない（1チャンク）。
 */
export function phraseChunks(text: string): string[] {
  const seg = getSegmenter()
  if (!seg || !text) return text ? [text] : []
  const out: string[] = []
  let buf = ''
  for (const { segment, isWordLike } of seg.segment(text)) {
    const attach = !buf || !isWordLike || ATTACH.test(segment)
    if (!attach) {
      out.push(buf)
      buf = ''
    }
    buf += segment
  }
  if (buf) out.push(buf)
  return out
}
