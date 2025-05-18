// ───────────────────────────────────────────
// src/app/(frontend)/gallery/page.tsx
// ───────────────────────────────────────────
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Image from 'next/image'
import Breadcrumb from '@/components/Breadcrumb'
import { fetchLatest } from '@/lib/payload'
import type { MediaDoc } from '@/lib/payloadTypes'

const WRAP = 'mx-auto w-full max-w-[78rem] px-5 sm:px-8 section-pad'
const CARD = 'glass overflow-hidden cursor-pointer group'

export default async function GalleryPage() {
  const { gallery } = await fetchLatest({ mediaLimit: 20 })

  return (
    <main className="min-h-screen flex flex-col">
     <div className="mt-10 text-gray-400 text-left">
            <Breadcrumb />
    </div>
      <section className={WRAP}>
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Gallery</h1>

        </div>
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {gallery.map((m: MediaDoc) => {
            const src = m.url ?? m.image?.url ?? '/fallback.jpg'
            return (
              <div key={m.id} className={CARD}>
                <Image
                  src={src}
                  alt={m.alt ?? ''}
                  width={640}
                  height={480}
                  className="w-full h-auto object-cover group-hover:scale-105 transition"
                  priority={false}
                />
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
