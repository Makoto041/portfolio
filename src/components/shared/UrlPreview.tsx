'use client'

// タイムライン投稿の URL プレビューカード（OGP メタデータ表示）。
// スタイルは soda.css の .s-linkcard（紙面色・1px の黒罫・角丸）。
import Image from 'next/image'
import { useState } from 'react'
import SodaIcon from '@/components/soda/SodaIcon'
import { safeHref } from '@/lib/safeHref'

interface UrlMetadata {
  title?: string | null
  description?: string | null
  image?: string | null
  siteName?: string | null
  url?: string | null
}

interface UrlPreviewProps {
  metadata: UrlMetadata
  embedUrl?: string | null
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export default function UrlPreview({ metadata, embedUrl }: UrlPreviewProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const href = safeHref(embedUrl || metadata.url)
  if (!href) return null

  const image = safeHref(metadata.image)
  const title = metadata.title || safeHostname(href)

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="s-linkcard">
      <span className="s-linkcard-thumb">
        {image && !imageFailed ? (
          // 外部サイトの OGP 画像。画像オプティマイザを任意ホストへの
          // プロキシとして開放しないため unoptimized で直接参照する
          <Image
            src={image}
            alt=""
            fill
            sizes="56px"
            loading="lazy"
            unoptimized
            onError={() => setImageFailed(true)}
          />
        ) : (
          <SodaIcon name="link" />
        )}
      </span>
      <span className="s-linkcard-body">
        <span className="s-linkcard-title">{title}</span>
        {metadata.description && <span className="s-linkcard-desc">{metadata.description}</span>}
        <span className="s-linkcard-host">
          {metadata.siteName ? `${metadata.siteName} · ` : ''}
          {safeHostname(href)}
        </span>
      </span>
    </a>
  )
}
