// ───────────────────────────────────────────
// src/app/(frontend)/gallery/page.tsx
// ───────────────────────────────────────────

import Breadcrumb from '@/components/Breadcrumb'
import { fetchLatest } from '@/lib/payload'
import GalleryGrid from '@/components/GalleryGridMain'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GalleryPage() {
  // サーバーコンポーネント内でデータ取得
  const { gallery } = await fetchLatest({ mediaLimit: 20 })

  return (
    <main className="min-h-screen flex flex-col">
      {/* パンくず */}
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>

      {/* セクションラップ */}
      <section className="mx-auto w-full max-w-[78rem] px-5 sm:px-8 section-pad">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Gallery</h1>
        </div>

        {/* Client Component を呼び出し */}
        <GalleryGrid gallery={gallery} />
      </section>
    </main>
  )
}
