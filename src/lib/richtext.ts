// ───────────────────────────────────────────
// src/lib/richtext.ts
// Lexical（Payload richText）の JSON からプレーンテキストを取り出す。
// ティッカーや表紙の大きな文字など「装飾なしの本文」が欲しい箇所で使う。
// 段落・見出し・リスト項目の区切りは改行にする。純関数（server/client 共用）。
// ───────────────────────────────────────────

type LexicalLike = {
  type?: string
  text?: string
  children?: LexicalLike[]
}

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'listitem', 'quote'])

export function lexicalToPlainText(data: unknown): string {
  if (typeof data === 'string') return data.trim()
  const root = (data as { root?: LexicalLike } | null)?.root
  if (!root || !Array.isArray(root.children)) return ''

  const out: string[] = []
  const walk = (node: LexicalLike) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'text' && typeof node.text === 'string') {
      out.push(node.text)
      return
    }
    if (node.type === 'linebreak') {
      out.push('\n')
      return
    }
    if (Array.isArray(node.children)) node.children.forEach(walk)
    if (node.type && BLOCK_TYPES.has(node.type)) out.push('\n')
  }
  root.children.forEach(walk)

  return out
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
