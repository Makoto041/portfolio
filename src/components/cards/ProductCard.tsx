// src/components/ProductCard.tsx
import Image from 'next/image'
import type { Product } from '@/lib/payloadTypes'
import { toCFUrl } from '@/lib/cfUrl'

export default function ProductCard({ p }: { p: Product }) {
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer" className="ccard">
      {p.image?.url && (
        <div className="thumb">
          <Image
            src={toCFUrl(p.image.url)}
            alt={p.name}
            fill
            sizes="(max-width:720px) 100vw, 320px"
            className="object-cover"
          />
        </div>
      )}
      <div className="cbody">
        <span className="cmeta">
          <span className="tagchip">app ↗</span>
        </span>
        <span className="ctitle jp">{p.name}</span>
        {p.description && <span className="cexcerpt jp line-clamp-3">{p.description}</span>}
      </div>
    </a>
  )
}
