// src/app/(frontend)/page.tsx
// トップページ「ミスト・ターミナル」— 群青×ミストの透明感 × ターミナル/git log のメタファー
// （docs/README.md + docs/design-reference-top.html の hifi 移植。Timeline が主役）
// データ取得・集計は src/features/home/getHomePageData.ts に分離し、ここはレイアウトに専念する。
export const dynamic = 'force-static'
export const revalidate = 60

import './mist.css'
import { mistFontVars } from '@/lib/mistFonts'
import { Analytics } from '@vercel/analytics/next'
import MistTitlebar from '@/components/mist/MistTitlebar'
import MistHero from '@/components/mist/MistHero'
import MistStatusBar from '@/components/mist/MistStatusBar'
import MistLogTimeline from '@/components/mist/MistLogTimeline'
import MistGallery from '@/components/mist/MistGallery'
import MistPortalSection from '@/components/mist/MistPortalSection'
import MistRail from '@/components/mist/MistRail'
import MistCompactIntro from '@/components/mist/MistCompactIntro'
import { getHomePageData, emptyHomePageData, type HomePageData } from '@/features/home/getHomePageData'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'

export const metadata = {
  title: '岩渕誠（いわぶちまこと） | ライフログ',
  description:
    '岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録など日々の記録をタイムラインで残しています。',
  openGraph: {
    title: '岩渕誠（いわぶちまこと） | ライフログ',
    description:
      '岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録など日々の記録をタイムラインで残しています。',
    url: 'https://iwabuchi-makoto.com',
    siteName: 'いわぶちまこと',
    locale: 'ja_JP',
    type: 'website',
    // og:image は /og（1200×630 生成）を明示指定
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: '岩渕誠（いわぶちまこと） | ライフログ',
    description:
      '岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録など日々の記録をタイムラインで残しています。',
    images: [OG_IMAGE_URL],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/',
  },
  keywords: ['岩渕誠', 'いわぶちまこと', 'Makoto Iwabuchi', 'ライフログ', '日記', '写真', '制作ログ'],
}

export default async function Home() {
  let data: HomePageData
  try {
    data = await getHomePageData()
  } catch (error) {
    console.error('Error fetching top page data:', error)
    data = emptyHomePageData()
  }

  const {
    posts,
    entriesTotal,
    photosTotal,
    gallery,
    streak,
    notices,
    hero,
    profile,
    spotifyUrl,
    blog,
    events,
    products,
  } = data

  return (
    <div className={`mist ${mistFontVars}`}>
      <Analytics />
      <div className="page">
        <div className="mist1" aria-hidden />
        <div className="mist2" aria-hidden />
        <main className="inner">
          {/* ── ウィンドウタイトルバー ── */}
          <MistTitlebar />

          {/* ── ヒーロー（ワードマーク→タグラインをタイプライター表示） ── */}
          <header className="hero">
            <MistHero tagline={hero.tagline} role={hero.role} />
          </header>

          {/* SP のみ: hero 直下のコンパクト自己紹介（D-1 案2） */}
          <MistCompactIntro profile={profile} />

          {/* ── 統合バー: NOTICE ローテ + entries/photos/streak + 天気/時計 ── */}
          <MistStatusBar
            notices={notices}
            entries={entriesTotal}
            photos={photosTotal}
            streak={streak}
          />

          {/* ── メイン: [タイムライン | 中央(Gallery+Blog/Events/Products)] + 右固定プロフィール ── */}
          <div className="main">
            <div className="homecols">
              <MistLogTimeline posts={posts} total={entriesTotal} compact />
              <div className="mid">
                <MistGallery photos={gallery} photosTotal={photosTotal} />
                <MistPortalSection
                  cmd="ls ./posts"
                  moreHref="/posts"
                  moreLabel={`${blog.total} files →`}
                  items={blog.items}
                />
                <MistPortalSection
                  cmd="ls ./events"
                  moreHref="/events"
                  moreLabel={`${events.total} files →`}
                  items={events.items}
                />
                <MistPortalSection
                  cmd="ls ./products"
                  moreHref="/products"
                  moreLabel={`${products.total} files →`}
                  items={products.items}
                />
              </div>
            </div>
            <MistRail profile={profile} spotifyUrl={spotifyUrl} />
          </div>

          {/* ── フッター ── */}
          <footer className="footer">
            <span>
              © {new Date().getFullYear()} makoto iwabuchi — <i>slowly, but daily.</i>
            </span>
            <span className="ex">$ exit 0</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
