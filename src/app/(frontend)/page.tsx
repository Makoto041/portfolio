// src/app/(frontend)/page.tsx
// ホーム（Soda Press）— 雑誌の表紙のような巨大ロゴ「MAKOTO」の下に、
// いちばん新しい投稿をカバーストーリーとして置き、タイムライン（日記帳）が主役の3段組:
//   PC: [写真の柱 | カバーストーリー＋タイムライン | TODAY]  SP: 1段（TODAY は表紙の直下）
// その下にブログ・つくったもの・イベント・プロフィール。
// データ取得・集計は src/features/home/getHomePageData.ts に分離し、ここはレイアウトに専念する。
export const dynamic = 'force-static'
export const revalidate = 60

import { Analytics } from '@vercel/analytics/next'
import SodaShell from '@/components/soda/SodaShell'
import SodaTicker from '@/components/soda/SodaTicker'
import SodaMasthead from '@/components/soda/SodaMasthead'
import SodaLead from '@/components/soda/SodaLead'
import SodaToday from '@/components/soda/SodaToday'
import SodaTimeline from '@/components/soda/SodaTimeline'
import SodaPhotoColumn from '@/components/soda/SodaPhotoColumn'
import SodaSectionHead from '@/components/soda/SodaSectionHead'
import SodaRail from '@/components/soda/SodaRail'
import SodaTabCard from '@/components/soda/SodaTabCard'
import SodaBlogRow from '@/components/soda/SodaBlogRow'
import SodaProfileBlock from '@/components/soda/SodaProfileBlock'
import Phrase from '@/components/soda/Phrase'
import {
  getHomePageData,
  emptyHomePageData,
  issueMonth,
  type HomePageData,
} from '@/features/home/getHomePageData'
import { getSiteChrome } from '@/features/site/getSiteChrome'
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
  const [data, chrome] = await Promise.all([
    getHomePageData().catch((error): HomePageData => {
      console.error('Error fetching top page data:', error)
      return emptyHomePageData()
    }),
    getSiteChrome(),
  ])
  const { lead, feed, ticker, today, gallery, hero, profile, blog, events, products } = data

  return (
    <SodaShell chrome={chrome} home before={<SodaTicker items={ticker} />}>
      <Analytics />
      <div className="s-wrap">
        <SodaMasthead
          role={hero.role}
          tagline={hero.tagline}
          issue={today.stats.entries}
          month={issueMonth()}
        />

        <div className="s-home-grid">
          <SodaLead post={lead} />
          <SodaToday notices={today.notices} stats={today.stats} />
          <section className="s-feedsec" aria-labelledby="h-timeline">
            <SodaSectionHead id="h-timeline" ja="タイムライン" en="Timeline" href="/timeline" />
            {feed.length > 0 ? (
              <SodaTimeline posts={feed} total={today.stats.entries} compact />
            ) : (
              <p className="s-empty">まだ投稿がありません</p>
            )}
          </section>
          <SodaPhotoColumn photos={gallery} total={today.stats.photos} />
        </div>

        <div className="s-sections">
          {blog.length > 0 && (
            <section aria-labelledby="h-blog">
              <SodaSectionHead id="h-blog" ja="ブログ" en="Blog" href="/posts" />
              <div className="s-blist">
                {blog.map((b) => (
                  <SodaBlogRow key={b.id} {...b} />
                ))}
              </div>
            </section>
          )}

          {products.length > 0 && (
            <section aria-labelledby="h-products">
              <SodaSectionHead id="h-products" ja="つくったもの" en="Products" href="/products" />
              <SodaRail count={products.length} four>
                {products.map((p) => (
                  <SodaTabCard key={p.id} {...p} title={<Phrase text={p.label} />} />
                ))}
              </SodaRail>
            </section>
          )}

          {events.length > 0 && (
            <section aria-labelledby="h-events">
              <SodaSectionHead id="h-events" ja="イベント" en="Events" href="/events" />
              <SodaRail count={events.length} four={events.length >= 4}>
                {events.map((e) => (
                  <SodaTabCard key={e.id} {...e} title={<Phrase text={e.label} />} />
                ))}
              </SodaRail>
            </section>
          )}

          <section aria-labelledby="h-profile">
            <SodaSectionHead id="h-profile" ja="プロフィール" en="Profile" href="/profile" more="くわしく" />
            <SodaProfileBlock profile={profile} />
          </section>
        </div>
      </div>
    </SodaShell>
  )
}
