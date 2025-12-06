'use client'

import Image from 'next/image'

interface UrlMetadata {
  title?: string
  description?: string
  image?: string
  siteName?: string
  url?: string
}

interface UrlPreviewProps {
  metadata: UrlMetadata
  embedUrl?: string
}

export default function UrlPreview({ metadata, embedUrl }: UrlPreviewProps) {
  const url = embedUrl || metadata.url
  if (!url) return null

  // コンテンツの有無をチェック
  const hasImage = !!metadata.image
  const hasTitle = !!metadata.title
  const hasDescription = !!metadata.description
  const hasSiteName = !!metadata.siteName

  // 最小幅とコンテンツに応じた幅を計算（レスポンシブ対応）
  const getWidthClass = () => {
    if (!hasTitle && !hasDescription) {
      // URLのみの場合は最小幅
      return 'w-fit min-w-[180px] sm:min-w-[200px] max-w-full'
    }
    if (hasImage) {
      // 画像ありの場合はより広めに
      return 'w-fit min-w-[250px] sm:min-w-[280px] max-w-[350px] sm:max-w-[400px]'
    }
    // 画像なし、テキストありの場合
    return 'w-fit min-w-[200px] sm:min-w-[240px] max-w-[300px] sm:max-w-[350px]'
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`card-link inline-block border border-[color:var(--card-border)] rounded-lg p-3 hover:bg-[color:var(--card-bg-hover)] bg-[color:var(--card-bg)] transition-all duration-200 mt-3 ${getWidthClass()}`}
    >
      <div className="flex gap-3 min-w-0">
        {hasImage && (
          <div className="flex-shrink-0">
            <div className="w-16 h-16 relative rounded overflow-hidden bg-gray-100 dark:bg-gray-800">
              <Image
                src={metadata.image!}
                alt={metadata.title || 'Link preview'}
                fill
                sizes="64px"
                className="object-cover"
                loading="lazy"
                onError={(e) => {
                  // 画像読み込みエラー時は非表示
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          {hasTitle && (
            <h3 className="font-medium text-sm dark:!text-white leading-tight mb-1 break-words">
              {metadata.title}
            </h3>
          )}
          {hasDescription && (
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight mb-2 break-words line-clamp-2">
              {metadata.description}
            </p>
          )}
          <div className="flex items-start text-xs text-gray-500 dark:text-gray-400 flex-wrap gap-1">
            {hasSiteName && (
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {metadata.siteName}
              </span>
            )}
            {hasSiteName && <span>•</span>}
            <span className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 break-all">
              {new URL(url).hostname}
            </span>
          </div>
        </div>
      </div>
    </a>
  )
}