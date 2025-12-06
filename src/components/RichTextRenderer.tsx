'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { toCFUrl } from '@/lib/cfUrl'
import ImageModal from './ImageModal'

interface RichTextNode {
  children?: RichTextNode[]
  text?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  type?: string
  format?: string
  indent?: number
  direction?: string
  url?: string
  src?: string
  alt?: string
  width?: number
  height?: number
  // For upload nodes from rich text editor
  value?: {
    id?: string | number
    url?: string
    alt?: string
    width?: number
    height?: number
    [key: string]: any
  }
}

interface RichTextRoot {
  root: {
    children: RichTextNode[]
  }
}

type RichTextData = RichTextRoot | string | number | boolean | null | undefined

export default function RichTextRenderer({ data }: { data: RichTextData }) {
  const [modalImage, setModalImage] = useState<{ src: string; alt: string; width?: number; height?: number } | null>(null)
  
  if (!data) return null
  
  // 文字列の場合はそのまま表示
  if (typeof data === 'string') {
    return <span className="whitespace-pre-line">{data}</span>
  }
  
  // プリミティブ型の場合は文字列に変換
  if (typeof data === 'number' || typeof data === 'boolean') {
    return <span>{String(data)}</span>
  }
  
  // JSONオブジェクトの場合はパース
  try {
    // dataがオブジェクトでrootプロパティを持つ場合
    if (data && typeof data === 'object' && 'root' in data) {
      const content = data.root?.children || []
      if (Array.isArray(content)) {
        return (
          <div className="rich-text">
            {renderNodes(content, setModalImage)}
            <ImageModal
              src={modalImage?.src || ''}
              alt={modalImage?.alt || ''}
              isOpen={!!modalImage}
              onClose={() => setModalImage(null)}
            />
          </div>
        )
      }
    }
    
    // その他のオブジェクトの場合はJSON.stringifyで表示
    if (typeof data === 'object') {
      console.warn('Unexpected rich text data format:', data)
      return <span className="text-gray-500 italic">不明なテキスト形式</span>
    }
    
    return <span>テキストの表示でエラーが発生しました</span>
  } catch (error) {
    console.error('Error rendering rich text:', error, data)
    return <span className="text-gray-500 italic">テキストの表示でエラーが発生しました</span>
  }
}

function renderNodes(nodes: RichTextNode[], setModalImage?: (image: { src: string; alt: string; width?: number; height?: number } | null) => void): React.ReactNode {
  if (!Array.isArray(nodes)) {
    console.warn('renderNodes: nodes is not an array:', nodes)
    return null
  }
  
  return nodes.map((node, index) => {
    try {
      if (!node || typeof node !== 'object') {
        console.warn('renderNodes: invalid node:', node)
        return <span key={index}>[Invalid node]</span>
      }
      
      if (node.text !== undefined) {
        // テキストノード
        let element: React.ReactNode = String(node.text || '')
        
        if (node.bold) element = <strong key={`bold-${index}`}>{element}</strong>
        if (node.italic) element = <em key={`italic-${index}`}>{element}</em>
        if (node.underline) element = <u key={`underline-${index}`}>{element}</u>
        if (node.strikethrough) element = <s key={`strike-${index}`}>{element}</s>
        if (node.code) element = <code key={`code-${index}`} className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{element}</code>
        
        return <span key={index}>{element}</span>
      }
      
      // 要素ノード
      const children = node.children ? renderNodes(node.children, setModalImage) : null
      
      switch (node.type) {
        case 'paragraph':
          return <p key={index} className="mb-2 last:mb-0">{children}</p>
        
        case 'heading':
          const level = node.format || 'h2'
          const HeadingTag = level as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
          const headingClasses = {
            h1: 'text-2xl font-bold mb-3',
            h2: 'text-xl font-bold mb-2',
            h3: 'text-lg font-bold mb-2',
            h4: 'text-base font-bold mb-1',
            h5: 'text-sm font-bold mb-1',
            h6: 'text-xs font-bold mb-1',
          }
          return React.createElement(HeadingTag, { 
            key: index, 
            className: headingClasses[level as keyof typeof headingClasses] || headingClasses.h2 
          }, children)
        
        case 'list':
          const ListTag = node.format === 'ordered' ? 'ol' : 'ul'
          const listClass = node.format === 'ordered' ? 'list-decimal list-inside mb-2' : 'list-disc list-inside mb-2'
          return React.createElement(ListTag, { key: index, className: listClass }, children)
        
        case 'listitem':
          return <li key={index} className="mb-1">{children}</li>
        
        case 'quote':
          return (
            <blockquote key={index} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2">
              {children}
            </blockquote>
          )
        
        case 'link':
          return (
            <a 
              key={index} 
              href={node.url || '#'} 
              className="text-blue-500 hover:text-blue-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          )
        
        case 'linebreak':
          return <br key={index} />
        
        case 'image':
          if (node.src) {
            const imageSrc = toCFUrl(node.src)
            return (
              <div key={index} className="my-4">
                <Image
                  src={imageSrc}
                  alt={node.alt || ''}
                  width={160}
                  height={120}
                  sizes="(max-width: 768px) 100vw, 160px"
                  className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover max-w-[160px] h-auto"
                  onClick={() => setModalImage?.({ 
                    src: imageSrc, 
                    alt: node.alt || '', 
                    width: node.width || 800, 
                    height: node.height || 600 
                  })}
                />
              </div>
            )
          }
          return null
        
        case 'upload':
          // Handle upload nodes (images from rich text editor)
          if (node.value && typeof node.value === 'object' && node.value.url) {
            const uploadData = node.value as any
            const imageSrc = toCFUrl(uploadData.url)
            return (
              <div key={index} className="my-4">
                <Image
                  src={imageSrc}
                  alt={uploadData.alt || ''}
                  width={160}
                  height={120}
                  sizes="(max-width: 768px) 100vw, 160px"
                  className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover max-w-[160px] h-auto"
                  onClick={() => setModalImage?.({ 
                    src: imageSrc, 
                    alt: uploadData.alt || '', 
                    width: uploadData.width || 800, 
                    height: uploadData.height || 600 
                  })}
                />
              </div>
            )
          }
          return null
        
        default:
          // 不明なタイプの場合はそのまま子要素を表示
          return <span key={index}>{children}</span>
      }
    } catch (error) {
      console.error('Error rendering node:', error, node)
      return <span key={index} className="text-red-500 text-xs">[レンダリングエラー]</span>
    }
  })
}