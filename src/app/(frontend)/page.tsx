// src/app/(frontend)/page.tsx
// ホーム（日記帳 × フィルムカメラ）— 左寄せの題字「MAKOTO」と赤インクの日付印で「きょうのページ」を開き、
// いちばん新しい投稿（文章ならノート・写真つきならプリント）とタイムラインを主役に置く。
//   PC: [日記（最新の投稿＋タイムライン） | 脇（メモ帳・ベタ焼き）] の2段組
//   SP: 最新 → おしらせのピン留め → タイムライン → ベタ焼き → メモ帳 の1段
// その下にブログ・つくったもの（ステッカー）・イベント（半券）・プロフィール。
// データ取得・集計は src/features/home/getHomePageData.ts に分離し、ここはレイアウトに専念する。
export const dynamic = 'force-static'
export const revalidate = 60

import { Analytics } from '@vercel/analytics/next'
import SodaShell from '@/components/soda/SodaShell'
import SodaMasthead from '@/components/soda/SodaMasthead'
import SodaLead from '@/components/soda/SodaLead'
import SodaPin from '@/components/soda/SodaPin'
import SodaMemo from '@/components/soda/SodaMemo'
import SodaContactSheet from '@/components/soda/SodaContactSheet'
import SodaTimeline from '@/components/soda/SodaTimeline'
import SodaSectionHead from '@/components/soda/SodaSectionHead'
import SodaSticker from '@/components/soda/SodaSticker'
import SodaTicket from '@/components/soda/SodaTicket'
import SodaBlogRow from '@/components/soda/SodaBlogRow'
import SodaProfileBlock from '@/components/soda/SodaProfileBlock'
import { getHomePageData, emptyHomePageData, type HomePageData } from '@/features/home/getHomePageData'
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
  const { lead, feed, today, photos, hero, profile, blog, events, products, counts } = data

  return (
    <SodaShell chrome={chrome} home>
      <Analytics />
      <div className="s-wrap">
        <SodaMasthead role={hero.role} tagline={hero.tagline} today={new Date().toISOString()} />

        <div className="s-home">
          <div className="s-home-main">
            <SodaLead post={lead} />
            <SodaPin notices={today.notices} />
            <section aria-labelledby="h-timeline">
              <SodaSectionHead id="h-timeline" title="タイムライン" count={today.stats.entries} href="/timeline" />
              {feed.length > 0 ? (
                <SodaTimeline posts={feed} total={today.stats.entries} compact />
              ) : (
                <p className="s-empty">まだ投稿がありません</p>
              )}
            </section>
          </div>
          <aside className="s-side" aria-label="おしらせと写真">
            <SodaMemo notices={today.notices} />
            <SodaContactSheet photos={photos} total={today.stats.photos} />
          </aside>
        </div>

        <div className="s-sections">
          {blog.length > 0 && (
            <section aria-labelledby="h-blog">
              <SodaSectionHead id="h-blog" title="ブログ" count={counts.blog} href="/posts" />
              <div className="s-blist">
                {blog.map((b) => (
                  <SodaBlogRow key={b.id} {...b} />
                ))}
              </div>
            </section>
          )}

          {products.length > 0 && (
            <section aria-labelledby="h-products">
              <SodaSectionHead id="h-products" title="つくったもの" count={counts.products} href="/products" />
              <div className="s-stickers">
                {products.map((p) => (
                  <SodaSticker key={p.id} {...p} />
                ))}
              </div>
            </section>
          )}

          {events.length > 0 && (
            <section aria-labelledby="h-events">
              <SodaSectionHead id="h-events" title="イベント" count={counts.events} href="/events" />
              <div className="s-tickets">
                {events.map((e) => (
                  <SodaTicket key={e.id} {...e} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="h-profile">
            <SodaSectionHead id="h-profile" title="プロフィール" href="/profile" more="くわしく" />
            <SodaProfileBlock profile={profile} />
          </section>
        </div>
      </div>
    </SodaShell>
  )
}
