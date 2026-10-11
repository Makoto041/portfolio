// ───────────────────────────────────────────
// src/lib/richtext.ts
// Lexical（Payload richText）の JSON からプレーンテキスト・最初の画像を取り出す。
// 最新の投稿の大きな文字など「装飾なしの本文」が欲しい箇所、カバー画像の無い記事のサムネイルで使う。
// 逆向き（プレーンテキスト → Lexical）は LINE 投稿とさっと投稿で使う。
// 段落・見出し・リスト項目の区切りは改行にする。純関数（server/client 共用）。
// ───────────────────────────────────────────

type LexicalLike = {
  type?: string
  text?: string
  value?: unknown
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

/** 本文中の最初のアップロード画像（Media）の URL。populate 済みのときだけ。無ければ null
    （外部ホストの image ノードは next/image の許可ホスト外になり得るため対象にしない） */
export function lexicalFirstImageUrl(data: unknown): string | null {
  const root = (data as { root?: LexicalLike } | null)?.root
  if (!root || !Array.isArray(root.children)) return null
  const find = (nodes: LexicalLike[]): string | null => {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue
      if (node.type === 'upload' && node.value && typeof node.value === 'object') {
        const url = (node.value as { url?: unknown }).url
        if (typeof url === 'string' && url) return url
      }
      if (Array.isArray(node.children)) {
        const hit = find(node.children)
        if (hit) return hit
      }
    }
    return null
  }
  return find(root.children)
}

/**
 * プレーンテキストを Payload（lexical）の richText editorState に変換する。
 * 改行ごとに段落を分け、空行は空の段落として保持する。
 */
export function textToLexical(text: string) {
  const paragraphs = text.split('\n').map((line) => ({
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    textStyle: '',
    textFormat: 0,
    children: line
      ? [{ type: 'text', text: line, format: 0, style: '', mode: 'normal', detail: 0, version: 1 }]
      : [],
  }))
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs,
    },
  }
}
