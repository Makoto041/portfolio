// app/(frontend)/layout.tsx
import '../global.css'
import type { Metadata } from 'next'
import React from 'react'
import { toCFUrl } from '@/lib/cfUrl'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'

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
  metadataBase: new URL('https://iwabuchi-makoto.com'),
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
    url: 'https://iwabuchi-makoto.com',
    siteName: 'いわぶち',
    locale: 'ja_JP',
    type: 'website',
    // og:image は /og（1200×630 生成）を明示指定。
    // openGraph はセグメント間でシャロー置換されるため各ページに images を持たせる
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: '岩渕誠（いわぶちまこと） | ライフログ',
    description:
      '岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録などの日々の記録を残しています。',
    creator: '@613_kmk', // JSON-LD sameAs と統一
    images: [OG_IMAGE_URL],
  },
}

// 本文フォント: 全ページ .mist（IBM Plex Mono / Noto Sans JP / Outfit）で描画するため
// ローカルフォント定義は撤去。error/404/modal 等 .mist 外は global.css の --font-body（システムJP）で描画。


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* サイトはライトターミナル固定（Mist Terminal）。フォーム・スクロールバーも明るく */}
        <meta name="color-scheme" content="light" />
        {/* iOS Safari は touchstart リスナーが無いと :active を描画しないため、
            グローバルに空の passive リスナーを登録してタッチ押下フィードバックを有効化 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('touchstart',function(){},{passive:true})`,
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
              }
            })
          }}
        />
      </head>

      <body className="antialiased overflow-x-hidden text-[color:var(--fg-base)]">
        {/* ページシェル（ナビ・コンテナ・フッター）は (site) レイアウトが持つ。
            トップページは Mist Terminal デザインの独自シェルで描画する */}
        {children}
      </body>
    </html>
  )
}
