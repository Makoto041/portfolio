// src/lib/renderRichTextWithModal.tsx
// ブログ記事本文（Payload の Lexical JSON）を React に描画する。
// 見出し・段落・リスト・引用・コード・リンク（fields.url）・文字装飾（format ビット）・
// 画像（upload / image ノード。本文幅いっぱい・タップで写真ビューア、記事内の画像を前後移動）に対応。
// スタイルは soda.css の .s-prose（親要素）が担う。
'use client'

import React, { type ElementType, type ReactNode } from 'react'
import Image from 'next/image'
import ImageModal from '@/components/gallery/ImageModal'
import { usePhotoViewer } from '@/components/gallery/usePhotoViewer'
import { toCFUrl, isOptimizableSrc } from '@/lib/cfUrl'
import { safeHref } from '@/lib/safeHref'

export interface LexicalNode {
  type?: string
  tag?: string
  text?: string
  /** text ノード: 装飾のビットフラグ / 要素ノード: 揃え（文字列） */
  format?: number | string
  listType?: string
  url?: string
  fields?: { url?: string }
  src?: string
  alt?: string
  value?: { url?: string; alt?: string | null; width?: number | null; height?: number | null } | number | string
  children?: LexicalNode[]
}

const IS_BOLD = 1
const IS_ITALIC = 1 << 1
const IS_STRIKETHROUGH = 1 << 2
const IS_UNDERLINE = 1 << 3
const IS_CODE = 1 << 4

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

type ArticleImage = { src: string; alt: string; width?: number | null; height?: number | null }

/** 描画順に本文中の画像を集める（ビューアの前後移動用） */
function collectImages(nodes: LexicalNode[], out: ArticleImage[] = []): ArticleImage[] {
  for (const node of nodes) {
    const img = imageOf(node)
    if (img) out.push(img)
    if (node.children) collectImages(node.children, out)
  }
  return out
}

function imageOf(node: LexicalNode): ArticleImage | null {
  if (node.type === 'upload' && node.value && typeof node.value === 'object' && node.value.url) {
    return { src: toCFUrl(node.value.url), alt: node.value.alt ?? '', width: node.value.width, height: node.value.height }
  }
  if ((node.type === 'image' || node.tag === 'img') && node.src) {
    return { src: toCFUrl(node.src), alt: node.alt ?? '' }
  }
  return null
}

export function RenderRichTextWithModal({ nodes = [] }: { nodes: LexicalNode[] }): ReactNode {
  const images = collectImages(nodes)
  const { open, modalProps } = usePhotoViewer(images.map(({ src, alt }) => ({ src, alt })))
  let imageIndex = 0

  const renderText = (node: LexicalNode, key: string): ReactNode => {
    const fmt = typeof node.format === 'number' ? node.format : 0
    // 改行文字は <br/> に変換
    const lines = String(node.text ?? '').split(/\r\n|\r|\n/)
    let el: ReactNode = lines.map((line, i) => (
      <React.Fragment key={`${key}-l${i}`}>
        {line}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    ))
    if (fmt & IS_CODE) el = <code>{el}</code>
    if (fmt & IS_BOLD) el = <strong>{el}</strong>
    if (fmt & IS_ITALIC) el = <em>{el}</em>
    if (fmt & IS_UNDERLINE) el = <u>{el}</u>
    if (fmt & IS_STRIKETHROUGH) el = <s>{el}</s>
    return <React.Fragment key={key}>{el}</React.Fragment>
  }

  const renderNodes = (list: LexicalNode[] = [], prefix: string): ReactNode[] =>
    list.map((node, idx) => {
      const key = `${prefix}-${idx}`
      if (!node || typeof node !== 'object') return null

      if (node.type === 'text') return renderText(node, key)
      if (node.type === 'linebreak') return <br key={key} />
      if (node.type === 'tab') return ' '

      const img = imageOf(node)
      if (img) {
        const index = imageIndex++
        const ratio = img.width && img.height ? img.width / img.height : 16 / 9
        return (
          <figure key={key}>
            <button
              type="button"
              className="s-prose-img"
              aria-label={img.alt ? `画像を拡大: ${img.alt}` : '画像を拡大'}
              onClick={(e) => open(index, e.currentTarget.querySelector('img')?.currentSrc || null)}
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={1400}
                height={Math.round(1400 / ratio)}
                sizes="(max-width: 760px) 100vw, 700px"
                // 外部ホストの絶対URLは remotePatterns 外のため unoptimized で直接参照する
                unoptimized={!isOptimizableSrc(img.src)}
              />
            </button>
          </figure>
        )
      }

      const children = node.children ? renderNodes(node.children, key) : null

      switch (node.type) {
        case 'paragraph':
          // 空段落（Lexical が改行用に入れるもの）は余白を増やさないよう描かない
          return node.children && node.children.length > 0 ? <p key={key}>{children}</p> : null
        case 'heading': {
          const tag = node.tag && HEADING_TAGS.has(node.tag) ? node.tag : 'h2'
          // 記事タイトルが h1 のため、本文中の h1 は h2 として扱う
          const Tag = (tag === 'h1' ? 'h2' : tag) as ElementType
          return <Tag key={key}>{children}</Tag>
        }
        case 'list': {
          const ordered = node.listType === 'number' || node.tag === 'ol'
          return ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>
        }
        case 'listitem': {
          // 入れ子リストだけを持つ項目（Lexical の構造）は記号を付けない
          const nestOnly = node.children?.length === 1 && node.children[0]?.type === 'list'
          return (
            <li key={key} className={nestOnly ? 'is-nest' : undefined}>
              {children}
            </li>
          )
        }
        case 'quote':
          return <blockquote key={key}>{children}</blockquote>
        case 'code':
          return (
            <pre key={key}>
              <code>{children}</code>
            </pre>
          )
        case 'link':
        case 'autolink': {
          const href = safeHref(node.fields?.url ?? node.url)
          if (!href) return <React.Fragment key={key}>{children}</React.Fragment>
          const external = /^https?:/i.test(href)
          return (
            <a key={key} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {children}
            </a>
          )
        }
        case 'horizontalrule':
          return <hr key={key} />
        default:
          return children ? <React.Fragment key={key}>{children}</React.Fragment> : null
      }
    })

  return (
    <>
      {renderNodes(nodes, 'rt')}
      <ImageModal {...modalProps} />
    </>
  )
}
