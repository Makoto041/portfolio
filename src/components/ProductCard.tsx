// src/components/ProductCard.tsx
import Image from 'next/image'
import type { Product } from '@/lib/payloadTypes'
import { toCFUrl } from '@/lib/cfUrl'

export default function ProductCard({ p }: { p: Product }) {
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer">
      <article className="glass hover:shadow-[0_12px_32px_rgba(0,0,0,.18)] transition rounded-lg overflow-hidden flex flex-col">
        {p.image?.url && (
          <Image src={toCFUrl(p.image.url)} alt={p.name} width={400} height={200} className="h-40 w-full object-cover" />
        )}
        <h3 className="mt-2 px-4 font-semibold">{p.name}</h3>
        {p.description && <p className="text-sm px-4 pb-4 line-clamp-3 opacity-80">{p.description}</p>}
      </article>
    </a>
  )
}
