// app/(frontend)/layout.tsx
import '../global.css'
import type { Metadata } from 'next'
import React from 'react'
import localFont from 'next/font/local'
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

// 本文フォント（next/font/local）— 個性のある Higure Gothic を全ページで使用する
// display: 'block' を採用。フォント読み込み中はテキストを不可視にし（block期間 約3s）、
//   その間に Higure が届けばシステムフォントを一切見せずに描画する。
//   選定理由（各値のトレードオフ）:
//     - 'swap'     … 即システムフォント表示→後で Higure に置換。毎回スワップが見える（元の不具合）
//     - 'optional' … スワップは皆無だが初回訪問はシステムフォント固定で Higure が使われない（issue #34で却下）
//     - 'block'    … 不可視→Higure。通常の回線・キャッシュ後はスワップを見せずに Higure を使える
//   注意: 巨大な日本語フォント（各 約2MB）ゆえ preload はしていないため、
//   低速回線の初回訪問に限り block期間(3s)内に間に合わずフォールバック表示→遅延スワップが起こり得る。
//   ただし woff2 化済み（TTF比 約68%減）+ ブラウザは実使用ウェイトのみ取得 + 一度取得すればキャッシュされるため、
//   実運用（再訪・リロード）では即 Higure で描画され、置き換わりは発生しない。
const higure = localFont({
  src: [
    { path: '../../fonts/HigureGothic-Light.woff2', weight: '300', style: 'normal' },
    { path: '../../fonts/HigureGothic-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../fonts/HigureGothic-Medium.woff2', weight: '500', style: 'normal' },
    // 600(font-semibold)はフォントに存在しないためBoldを600-700のレンジで割当て、
    // ブラウザごとの近似解決（500/700に揺れる）を防ぐ
    { path: '../../fonts/HigureGothic-Bold.woff2', weight: '600 700', style: 'normal' },
    { path: '../../fonts/HigureGothic-Black.woff2', weight: '900', style: 'normal' },
  ],
  display: 'block',
  preload: false, // 日本語フォントは大きいため優先読み込みしない（全ウェイトpreloadはLCPを害する）
  variable: '--font-higure',
  fallback: [
    'Hiragino Kaku Gothic ProN',
    'Hiragino Sans',
    'BIZ UDPGothic',
    'Meiryo',
    'sans-serif',
  ],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`dark:text-zinc-50 ${higure.variable}`}
    >
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
          {/* ページシェル（ナビ・コンテナ・フッター）は (site) レイアウトが持つ。
              トップページは Mist Terminal デザインの独自シェルで描画する */}
          {children}

          {/* Portal root for modals */}
          <div id="modal-root"></div>
        </Providers>
      </body>
    </html>
  )
}
