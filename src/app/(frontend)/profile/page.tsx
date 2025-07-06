// ───────────────────────────────────────────
// src/app/(frontend)/profile/page.tsx
// ───────────────────────────────────────────
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import Breadcrumb from '@/components/Breadcrumb'

export const metadata: Metadata = {
  title: 'プロフィール | いわぶちまこと',
  description: '岩渕誠（いわぶちまこと）のプロフィールページ。ウェブエンジニア・フロントエンド開発者として活動しています。',
  keywords: ['プロフィール', '岩渕誠', 'いわぶちまこと', 'ウェブエンジニア', 'フロントエンド', '開発者'],
  authors: [{ name: 'いわぶちまこと' }],
  openGraph: {
    title: 'プロフィール | いわぶちまこと',
    description: '岩渕誠（いわぶちまこと）のプロフィールページ。ウェブエンジニア・フロントエンド開発者として活動しています。',
    url: 'https://iwabuchi-makoto.com/profile',
    siteName: 'いわぶちまこと',
    locale: 'ja_JP',
    type: 'profile',
    images: [
      {
        url: '/profile.jpg',
        width: 1200,
        height: 630,
        alt: 'いわぶちまこと プロフィール写真',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'プロフィール | いわぶちまこと',
    description: '岩渕誠（いわぶちまこと）のプロフィールページ。ウェブエンジニア・フロントエンド開発者として活動しています。',
    images: ['/profile.jpg'],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/profile',
  },
}
const WRAP =
  'mx-auto w-full max-w-[28rem] px-5 sm:px-8 section-pad flex flex-col items-center text-center'
const CARD = 'glass p-8 flex flex-col items-center'

export default function ProfilePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>
      <section className={WRAP}>
        <div className={CARD}>
          <div className="relative w-40 h-40 rounded-full mb-6 overflow-hidden">
            <Image
              src="/profile.jpg"
              alt="Profile"
              fill
              className="object-cover"
            />
          </div>
          <h1 className="text-2xl font-semibold mb-4">Makoto Iwabuchi</h1>
          <p className="mb-6 opacity-80">
            ウェブエンジニア／フロントエンド好き。Payload CMS ×
            Next.jsでポートフォリオサイトを構築しています。
          </p>
          <div className="flex gap-6">
            <Link href="#" className="underline">
              X
            </Link>
            <Link href="https://instagram.com/makoto0140" className="underline">
              Instagram
            </Link>
            <Link href="https://github.com/Makoto041" className="underline">
              GitHub
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
