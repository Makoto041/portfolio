'use client'

import Image from 'next/image'
import { toCFUrl } from '@/lib/cfUrl'

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

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors mt-3"
    >
      <div className="flex gap-3">
        {metadata.image && (
          <div className="flex-shrink-0">
            <div className="w-16 h-16 relative rounded overflow-hidden">
              <Image
                src={toCFUrl(metadata.image)}
                alt={metadata.title || 'Link preview'}
                fill
                sizes="64px"
                className="object-cover"
                loading="lazy"
              />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          {metadata.title && (
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
              {metadata.title}
            </h3>
          )}
          {metadata.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-1">
              {metadata.description}
            </p>
          )}
          <div className="flex items-center text-xs text-gray-500">
            {metadata.siteName && (
              <span className="mr-2">{metadata.siteName}</span>
            )}
            <span className="text-blue-500 hover:text-blue-700">
              {new URL(url).hostname}
            </span>
          </div>
        </div>
      </div>
    </a>
  )
}