// app/(frontend)/layout.tsx
import '../global.css'
import type { Metadata } from 'next'
import React from 'react'
import GlassNav from '@/components/layout/GlassNav'
import SiteFooter from '@/components/layout/SiteFooter'
import { toCFUrl } from '@/lib/cfUrl'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: {
    default: '岩渕誠（いわぶちまこと） | ライフログ',
    template: '%s | 岩渕誠（いわぶちまこと）',
  },
  description:
    '岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録などの日々の記録を残しています。',
  keywords: [
    '岩渕誠',
    'いわぶちまこと',
    'Makoto Iwabuchi',
    'ライフログ',
    '日記',
    '写真',
    'ブログ',
    'ギャラリー',
    '制作ログ',
  ],
  authors: [{ name: '岩渕誠', url: 'https://iwabuchi-makoto.com/profile' }],
  creator: '岩渕誠（いわぶちまこと）',
  publisher: '岩渕誠（いわぶちまこと）',
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
    title: '岩渕誠（いわぶちまこと） | ライフログ',
    description:
      '岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録などの日々の記録を残しています。',
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
    title: '岩渕誠（いわぶちまこと） | ライフログ',
    description:
      '岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録などの日々の記録を残しています。',
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
            __html: `(()=>{try{
              const stored = localStorage.getItem('theme');
              const root = document.documentElement;
              // ユーザーが選択している場合のみクラスを付与
              if (stored === 'dark') {
                root.classList.add('dark');
                root.classList.remove('light');
              } else if (stored === 'light') {
                root.classList.add('light');
                root.classList.remove('dark');
              }
              // storedがnullの場合はクラスを付けず、システム設定に従う
            }catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              "@id": "https://iwabuchi-makoto.com/#person",
              "name": "岩渕誠",
              "alternateName": ["いわぶちまこと", "Makoto Iwabuchi", "いわぶち"],
              "givenName": "誠",
              "familyName": "岩渕",
              "jobTitle": "ウェブエンジニア",
              "description": "ウェブエンジニアとして活動する岩渕誠（いわぶちまこと）の個人サイト。日記・写真・制作ログなどのライフログを公開している。",
              "url": "https://iwabuchi-makoto.com",
              "mainEntityOfPage": "https://iwabuchi-makoto.com/profile",
              "image": "https://iwabuchi-makoto.com" + toCFUrl('/profile.jpg'),
              "sameAs": [
                "https://github.com/Makoto041",
                "https://instagram.com/makoto0140",
                "https://x.com/613_kmk"
              ],
              "knowsAbout": [
                "Web Development",
                "Frontend Development",
                "JavaScript",
                "TypeScript",
                "React",
                "Next.js",
                "UI/UX Design"
              ],
              "worksFor": {
                "@type": "Organization",
                "name": "フリーランス"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "岩渕誠（いわぶちまこと） | ライフログ",
              "alternateName": ["いわぶちまこと ライフログ", "Makoto Iwabuchi"],
              "url": "https://iwabuchi-makoto.com",
              "description": "岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録など日々の記録を公開しています。",
              "inLanguage": "ja-JP",
              "publisher": { "@id": "https://iwabuchi-makoto.com/#person" },
              "author": {
                "@type": "Person",
                "name": "岩渕誠",
                "alternateName": "いわぶちまこと"
              },
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://iwabuchi-makoto.com/posts?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>

      <body className="antialiased overflow-x-hidden text-[color:var(--fg-base)]">
        <Providers>
          {/* ── 上部グラスナビゲーション ── */}
          <GlassNav />

          {/* ── 1カラムのメインコンテンツ（各ページが <main> を持つため div）
               全ページ同一のコンテナ幅にすることで、ページ遷移時の横ずれを防ぐ ── */}
          <div className="mx-auto min-h-screen w-full max-w-5xl px-4 sm:px-6">{children}</div>

          {/* ── フッター ── */}
          <SiteFooter />

          {/* Portal root for modals */}
          <div id="modal-root"></div>
        </Providers>
      </body>
    </html>
  )
}
