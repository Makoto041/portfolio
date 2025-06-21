// app/(frontend)/layout.tsx
import '../global.css'
import type { Metadata } from 'next'
import React from 'react'
import SideNav from '@/components/SideNav'
import MobileHeader from '@/components/MobileHeader'

export const metadata: Metadata = {
  title: 'いわぶち | 個人ポートフォリオサイト',
  description: 'いわぶちの個人ポートフォリオサイト。日記、ブログ、写真ギャラリーなど日々の活動や作品を公開しています。',
  keywords: ['いわぶち', 'ポートフォリオ', '写真', 'ブログ', 'ギャラリー'],
  authors: [{ name: 'いわぶち' }],
  creator: 'いわぶち',
  publisher: 'いわぶち',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://iwabuchi-makoto.com'), // 実際のドメインに変更してください
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  // サイトアイコンの設定
  icons: {
    icon: '/myicon.png',
    apple: '/myicon.png',
    shortcut: '/myicon.png',
  },
  openGraph: {
    title: 'いわぶち | 個人ポートフォリオサイト',
    description: 'いわぶちの個人ポートフォリオサイト。日記、ブログ、写真ギャラリーなど日々の活動や作品を公開しています。',
    url: 'https://iwabuchi-makoto.com', // 実際のドメインに変更してください
    siteName: 'いわぶち',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/myicon.png', // サイトの代表写真として使用
        width: 1200,
        height: 1200,
        alt: 'いわぶちポートフォリオ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'いわぶち | 個人ポートフォリオサイト',
    description: 'いわぶちの個人ポートフォリオサイト。日記、ブログ、写真ギャラリーなど日々の活動や作品を公開しています。',
    creator: '@iwabuchi', // 実際のTwitterアカウントに変更してください
    images: ['/myicon.png'], // サイトの代表写真を使用
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning className="dark:text-zinc-50">
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{if(matchMedia('(prefers-color-scheme:dark)').matches)
              document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>

      <body className="antialiased overflow-x-hidden bg-[color:var(--bg)] text-[color:var(--text)]">
        {/* ── Mobile header ─────────────────── */}
        <MobileHeader />

        {/* ── Desktop layout ― side + main ── */}
        <div className="flex">
          <SideNav />

          <main className="flex-1 min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  )
}
