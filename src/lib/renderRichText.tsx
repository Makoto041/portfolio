// src/lib/renderRichText.tsx
import React, { ReactNode, ElementType } from 'react'
import Image from 'next/image'

export interface LexicalNode {
  type?: string
  tag?: string
  text?: string
  url?: string
  src?: string
  alt?: string
  children?: LexicalNode[]
}

const defaultClassNames: Record<string, string> = {
  h1: 'mt-8 mb-4 text-3xl font-bold',
  h2: 'mt-6 mb-3 text-2xl font-semibold',
  h3: 'mt-5 mb-2 text-xl font-semibold',
  p: 'mb-4 leading-relaxed',
  ul: 'mb-4 list-disc list-inside',
  ol: 'mb-4 list-decimal list-inside',
  li: 'ml-6 mb-1',
  blockquote: 'border-l-4 pl-4 italic my-4 text-gray-600',
  pre: 'bg-gray-100 dark:bg-gray-800 p-4 rounded my-4 overflow-auto',
  code: 'bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm font-mono',
  a: 'text-[var(--accent)] underline',
  img: 'my-4 max-w-full rounded',
}

export function renderRichText(nodes: LexicalNode[] = [], keyPrefix = 'rt'): ReactNode[] {
  return nodes.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`

    // テキストノード（改行を <br/> に変換）
    if (node.type === 'text' && typeof node.text === 'string') {
      const lines = node.text.split(/\r\n|\r|\n/)
      return (
        <React.Fragment key={key}>
          {lines.map((line, i) => (
            <React.Fragment key={`${key}-line-${i}`}>
              {line}
              {i < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </React.Fragment>
      )
    }

    // 明示的な改行ノード（Lexical の line-break）
    if (node.type === 'linebreak') {
      return <br key={key} />
    }

    // 段落
    if (node.type === 'paragraph') {
      return (
        <p key={key} className={defaultClassNames.p}>
          {renderRichText(node.children, key)}
        </p>
      )
    }

    // 見出し
    if (node.type === 'heading' && node.tag) {
      const Tag = node.tag as ElementType
      const className = defaultClassNames[node.tag] || ''
      return (
        <Tag key={key} className={className}>
          {renderRichText(node.children, key)}
        </Tag>
      )
    }

    // リスト (ol/ul)
    if (node.type === 'list' && node.tag) {
      const ListTag = node.tag as ElementType
      const className = defaultClassNames[node.tag] || ''
      return (
        <ListTag key={key} className={className}>
          {renderRichText(node.children, key)}
        </ListTag>
      )
    }

    // リストアイテム
    if (node.type === 'listitem') {
      return (
        <li key={key} className={defaultClassNames.li}>
          {renderRichText(node.children, key)}
        </li>
      )
    }

    // 画像
    if (node.tag === 'img' && node.src) {
      return (
        <Image 
          key={key} 
          src={node.src} 
          alt={node.alt || ''} 
          width={800}
          height={600}
          sizes="(max-width: 768px) 100vw, 800px"
          className={defaultClassNames.img} 
        />
      )
    }

    // リンク
    if (node.tag === 'a' && node.url) {
      return (
        <a
          key={key}
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          className={defaultClassNames.a}
        >
          {renderRichText(node.children, key)}
        </a>
      )
    }

    // その他のタグ
    if (node.tag) {
      const Tag = node.tag as ElementType
      const className = defaultClassNames[node.tag] || ''
      return (
        <Tag key={key} className={className}>
          {renderRichText(node.children, key)}
        </Tag>
      )
    }

    // ネストされた子供だけがある場合
    if (node.children) {
      return <React.Fragment key={key}>{renderRichText(node.children, key)}</React.Fragment>
    }

    return null
  })
}
