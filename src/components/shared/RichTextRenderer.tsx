'use client'

// タイムライン本文（Payload の Lexical JSON）を React に描画する。
// 文字装飾（format ビット）・リンク（fields.url）・画像（upload / image ノード）に対応。
// スタイルは soda.css の .s-rt（親要素に付与）が担う。
import React, { useState } from 'react'
import Image from 'next/image'
import { toCFUrl, isOptimizableSrc } from '@/lib/cfUrl'
import { safeHref } from '@/lib/safeHref'
import ImageModal from '@/components/gallery/ImageModal'

interface RichTextNode {
  type?: string
  tag?: string
  text?: string
  /** text ノード: 装飾のビットフラグ / 要素ノード: 揃え（文字列） */
  format?: number | string
  // 旧 Slate 形式の装飾フラグ（過去データ互換）
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  listType?: string
  url?: string
  fields?: { url?: string; newTab?: boolean }
  src?: string
  alt?: string
  value?: { url?: string; alt?: string | null; [key: string]: unknown }
  children?: RichTextNode[]
}

type RichTextData = { root: { children: RichTextNode[] } } | string | number | boolean | null | undefined

// Lexical の text format ビット
const IS_BOLD = 1
const IS_ITALIC = 1 << 1
const IS_STRIKETHROUGH = 1 << 2
const IS_UNDERLINE = 1 << 3
const IS_CODE = 1 << 4

type OpenImage = (img: { src: string; alt: string; poster: string | null }) => void

export default function RichTextRenderer({ data }: { data: RichTextData }) {
  const [modalImage, setModalImage] = useState<{ src: string; alt: string; poster: string | null } | null>(null)

  if (data === null || data === undefined || data === false) return null

  // 文字列・プリミティブはそのまま（改行は保持）
  if (typeof data === 'string') return <p style={{ whiteSpace: 'pre-line' }}>{data}</p>
  if (typeof data === 'number' || typeof data === 'boolean') return <p>{String(data)}</p>

  const content = typeof data === 'object' && 'root' in data ? data.root?.children : null
  if (!Array.isArray(content)) {
    console.warn('Unexpected rich text data format:', data)
    return null
  }

  return (
    <>
      {renderNodes(content, setModalImage, 'rt')}
      <ImageModal
        src={modalImage?.src ?? ''}
        alt={modalImage?.alt ?? ''}
        posterSrc={modalImage?.poster}
        isOpen={!!modalImage}
        onClose={() => setModalImage(null)}
      />
    </>
  )
}

function renderText(node: RichTextNode, key: string): React.ReactNode {
  const fmt = typeof node.format === 'number' ? node.format : 0
  let el: React.ReactNode = String(node.text ?? '')
  if (fmt & IS_CODE || node.code) el = <code>{el}</code>
  if (fmt & IS_BOLD || node.bold) el = <strong>{el}</strong>
  if (fmt & IS_ITALIC || node.italic) el = <em>{el}</em>
  if (fmt & IS_UNDERLINE || node.underline) el = <u>{el}</u>
  if (fmt & IS_STRIKETHROUGH || node.strikethrough) el = <s>{el}</s>
  return <React.Fragment key={key}>{el}</React.Fragment>
}

function renderImage(src: string, alt: string, key: string, open: OpenImage) {
  const imageSrc = toCFUrl(src)
  return (
    <button
      key={key}
      type="button"
      className="s-rt-img"
      aria-label="画像を拡大"
      onClick={(e) => open({ src: imageSrc, alt, poster: e.currentTarget.querySelector('img')?.currentSrc || null })}
    >
      <Image
        src={imageSrc}
        alt={alt}
        width={320}
        height={240}
        sizes="160px"
        // リッチテキストは外部ホストの画像も入り得るため、CF/相対以外は最適化を通さない
        unoptimized={!isOptimizableSrc(imageSrc)}
      />
    </button>
  )
}

function renderNodes(nodes: RichTextNode[], open: OpenImage, prefix: string): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${prefix}-${index}`
    if (!node || typeof node !== 'object') return null

    if (node.type === 'text' || (node.type === undefined && node.text !== undefined)) {
      return renderText(node, key)
    }

    const children = node.children ? renderNodes(node.children, open, key) : null

    switch (node.type) {
      case 'paragraph':
        return <p key={key}>{children}</p>
      // 投稿内の見出しは本文の流れを崩さないよう太字の段落として描く
      case 'heading':
        return (
          <p key={key}>
            <strong>{children}</strong>
          </p>
        )
      case 'list': {
        const ordered = node.listType === 'number' || node.tag === 'ol'
        return ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>
      }
      case 'listitem':
        return <li key={key}>{children}</li>
      case 'quote':
        return <blockquote key={key}>{children}</blockquote>
      case 'link':
      case 'autolink': {
        const href = safeHref(node.fields?.url ?? node.url)
        if (!href) return <React.Fragment key={key}>{children}</React.Fragment>
        return (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        )
      }
      case 'linebreak':
        return <br key={key} />
      case 'image':
        return node.src ? renderImage(node.src, node.alt ?? '', key, open) : null
      case 'upload':
        return node.value?.url ? renderImage(node.value.url, node.value.alt ?? '', key, open) : null
      default:
        // 未知のノードは子要素だけを描く
        return children ? <React.Fragment key={key}>{children}</React.Fragment> : null
    }
  })
}
