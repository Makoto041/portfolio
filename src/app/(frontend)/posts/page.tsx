// src/app/(frontend)/posts/page.tsx
// ───────────────────────────────────────────
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Image from 'next/image'
import Link from 'next/link'
import { fetchLatest } from '@/lib/payload'
import type { BlogPost } from '@/lib/payloadTypes'
import Breadcrumb from '@/components/Breadcrumb'
import { Suspense } from 'react'
import PostsList from './PostsList'
import PostsListLoading from './PostsListLoading'

const WRAP = 'mx-auto w-full max-w-[58rem] px-5 sm:px-8 section-pad'
const CARD =
  'glass hover:shadow-[0_12px_32px_rgba(0,0,0,.18)] transition rounded-lg overflow-hidden'
const MAINT = '/maintenance'

export default async function BlogPage() {
  // blogLimit: 10 件取得
  const { posts } = await fetchLatest({ blogLimit: 10 })

  return (
    <main className="min-h-screen flex flex-col">
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>
      <section className={WRAP}>
        <h1 className="text-3xl font-semibold mb-2">ブログ</h1>
        <p className="mb-8 opacity-80"></p>
        {/* Suspense でラップ！ */}
        <Suspense fallback={<PostsListLoading />}>
          <PostsList posts={posts} />
        </Suspense>
      </section>
    </main>
  )
}
