// src/app/(frontend)/page.tsx
// トップページ「ミスト・ターミナル」— 群青×ミストの透明感 × ターミナル/git log のメタファー
// （docs/README.md + docs/design-reference-top.html の hifi 移植。Timeline が主役）
export const dynamic = 'force-static'
export const revalidate = 60

import './mist.css'
import { mistFontVars } from '@/lib/mistFonts'
import { Analytics } from '@vercel/analytics/next'
import { getPayloadClient } from '@/lib/payloadClient'
import MistTitlebar from '@/components/mist/MistTitlebar'
import MistHero from '@/components/mist/MistHero'
import MistStatusBar, { type NoticeItem } from '@/components/mist/MistStatusBar'
import MistLogTimeline from '@/components/mist/MistLogTimeline'
import MistGallery from '@/components/mist/MistGallery'
import MistPortalSection, { type PortalItem } from '@/components/mist/MistPortalSection'
import MistRail from '@/components/mist/MistRail'
import MistCompactIntro from '@/components/mist/MistCompactIntro'
import type { TimelineDoc, MediaDoc, BlogPost, Event, Product } from '@/lib/payloadTypes'
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

/* ── データ取得・集計 ─────────────────────── */

// タイムライン専用画像を除いた「ギャラリー写真」の条件
const GALLERY_WHERE = {
  or: [{ isTimelineOnly: { equals: false } }, { isTimelineOnly: { exists: false } }],
}

/** Asia/Tokyo での日付キー（YYYY-MM-DD） */
const toDayKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(date)

/** 日次投稿数から連続投稿日数（streak）を計算（草グリッドは廃止・CHANGELOG §3/§5） */
function buildStreak(dates: string[]): number {
  const days = new Set<string>()
  for (const d of dates) {
    const t = new Date(d)
    if (Number.isNaN(t.getTime())) continue
    days.add(toDayKey(t))
  }

  const DAY_MS = 24 * 60 * 60 * 1000
  let streak = 0
  let cursor = Date.now()
  // 今日未投稿なら昨日起点
  if (!days.has(toDayKey(new Date(cursor)))) cursor -= DAY_MS
  while (days.has(toDayKey(new Date(cursor)))) {
    streak += 1
    cursor -= DAY_MS
  }
  return streak
}

/** `YYYY.MM.DD`（Asia/Tokyo） */
function fmtDate(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}.${get('month')}.${get('day')}`
}

/** イベントのプラットフォーム → バッジ（ラベル + 識別色） */
function platformBadge(platform?: string): { label: string; color: string } {
  switch (platform) {
    case 'twitch':
      return { label: 'Twitch', color: 'oklch(0.55 0.2 300)' }
    case 'youtube':
      return { label: 'YouTube', color: 'oklch(0.6 0.22 25)' }
    case 'nico':
      return { label: 'ニコニコ', color: 'oklch(0.68 0.16 55)' }
    case 'offline':
      return { label: '現地', color: 'oklch(0.65 0.16 155)' }
    default:
      return { label: 'Event', color: 'oklch(0.6 0.03 260)' }
  }
}

/** お知らせの日付を「MM.DD」バッジ文字列に（Asia/Tokyo） */
function toBadge(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('month')}.${get('day')}`
}

async function fetchTopPageData() {
  const payload = await getPayloadClient()

  // 別コレクションは失敗してもトップ全体を巻き込まないよう既定空へ縮退
  const emptyDocs = { docs: [] as unknown[], totalDocs: 0 }
  const [
    postsRes,
    statsRes,
    entriesCount,
    photosCount,
    galleryRes,
    settings,
    noticesRes,
    blogRes,
    eventsRes,
    productsRes,
  ] = await Promise.all([
      // Home は直近10件のダイジェスト（全件は専用の /timeline タブで）
      payload.find({ collection: 'timeline', limit: 6, sort: '-publishedAt', depth: 2 }),
      // 集計用は日付だけを軽量に取得（streak計算）
      payload.find({
        collection: 'timeline',
        limit: 366,
        sort: '-publishedAt',
        depth: 0,
        select: { publishedAt: true, createdAt: true },
      }),
      payload.count({ collection: 'timeline' }),
      payload.count({ collection: 'media', where: GALLERY_WHERE }),
      payload.find({
        collection: 'media',
        limit: 20,
        sort: '-createdAt',
        where: GALLERY_WHERE,
      }),
      // 設定はスキーマ変更（新カラム）未適用でもトップ全体を巻き込まないよう握りつぶし、既定値へ縮退
      payload.findGlobal({ slug: 'site-settings' }).catch((e) => {
        console.error('site-settings fetch failed (using defaults):', e)
        return null
      }),
      // お知らせ（NOTICE）: 公開分を新しい順に。
      // notices テーブル未マイグレーション時でもトップ全体を巻き込まないよう独立して握りつぶす
      payload
        .find({
          collection: 'notices',
          limit: 20,
          sort: '-date',
          depth: 0,
          where: { isPublic: { equals: true } },
        })
        .catch((e) => {
          console.error('Notices fetch failed (falling back to none):', e)
          return { docs: [] as { date: string; body: string }[] }
        }),
      // Blog / Events / Products（トップに載せる分。depth:1 でサムネ関係を解決）
      payload
        .find({ collection: 'blogPosts', limit: 4, sort: '-publishedAt', depth: 1 })
        .catch((e) => {
          console.error('Blog fetch failed (section hidden):', e)
          return emptyDocs
        }),
      payload
        .find({
          collection: 'events',
          limit: 4,
          sort: '-startDate',
          depth: 1,
          where: { isPublic: { equals: true } },
        })
        .catch((e) => {
          console.error('Events fetch failed (section hidden):', e)
          return emptyDocs
        }),
      payload
        .find({ collection: 'products', limit: 4, sort: 'order', depth: 1 })
        .catch((e) => {
          console.error('Products fetch failed (section hidden):', e)
          return emptyDocs
        }),
    ])

  const posts = postsRes.docs as unknown as TimelineDoc[]
  const gallery = (galleryRes.docs as unknown as MediaDoc[]).filter(
    (g) => g.url || g.sizes?.thumbnail?.url,
  )

  const streak = buildStreak(
    (statsRes.docs as { publishedAt?: string; createdAt: string }[]).map(
      (d) => d.publishedAt ?? d.createdAt,
    ),
  )

  const notices: NoticeItem[] = (noticesRes.docs as { date: string; body: string }[])
    .map((n) => ({ badge: toBadge(n.date), text: n.body }))
    .filter((n) => n.text)

  const heroData = settings?.hero
  const hero = {
    tagline: heroData?.tagline || '日々の記録、ときどき写真。つぶやきくらいの気軽さで。',
    role: heroData?.roleEn || '— web engineer, tokyo',
  }

  const spotifyUrl = settings?.spotify?.playlistUrl ?? null

  // ── トップに載せる Blog / Events / Products ──
  const blog = {
    total: blogRes.totalDocs,
    items: (blogRes.docs as unknown as BlogPost[]).map<PortalItem>((p) => ({
      key: String(p.id),
      title: p.title,
      href: p.slug ? `/posts/${p.slug}` : '/posts',
      thumbUrl: p.coverImage?.url ?? null,
      meta: `${fmtDate(p.publishedAt ?? p.createdAt)} · Blog`,
    })),
  }
  const events = {
    total: eventsRes.totalDocs,
    items: (eventsRes.docs as unknown as Event[]).map<PortalItem>((e) => ({
      key: String(e.id),
      title: e.title,
      href: e.externalUrl || '/events',
      external: !!e.externalUrl,
      thumbUrl: (typeof e.thumbnail === 'object' ? e.thumbnail?.url : null) ?? null,
      meta: fmtDate(e.startDate),
      badge: platformBadge(e.platform),
    })),
  }
  const products = {
    total: productsRes.totalDocs,
    items: (productsRes.docs as unknown as Product[]).map<PortalItem>((p) => ({
      key: String(p.id),
      title: p.name,
      href: p.url || '/products',
      external: !!p.url,
      thumbUrl: (typeof p.image === 'object' ? p.image?.url : null) ?? null,
      meta: p.tags?.slice(0, 3).join(' · ') || undefined,
    })),
  }

  const profileData = settings?.profile
  const profileImage = profileData?.profileImage
  const profile = {
    name: profileData?.name,
    nameJapanese: profileData?.nameJapanese,
    title: profileData?.title,
    description: profileData?.description,
    imageUrl: typeof profileImage === 'object' && profileImage?.url ? profileImage.url : null,
    socialLinks: profileData?.socialLinks ?? [],
  }

  return {
    posts,
    entriesTotal: entriesCount.totalDocs,
    photosTotal: photosCount.totalDocs,
    gallery,
    streak,
    notices,
    hero,
    profile,
    spotifyUrl,
    blog,
    events,
    products,
  }
}

const EMPTY_SECTION = { total: 0, items: [] as PortalItem[] }

export default async function Home() {
  let data: Awaited<ReturnType<typeof fetchTopPageData>>
  try {
    data = await fetchTopPageData()
  } catch (error) {
    console.error('Error fetching top page data:', error)
    data = {
      posts: [],
      entriesTotal: 0,
      photosTotal: 0,
      gallery: [],
      streak: 0,
      notices: [],
      hero: {
        tagline: '日々の記録、ときどき写真。つぶやきくらいの気軽さで。',
        role: '— web engineer, tokyo',
      },
      profile: {} as never,
      spotifyUrl: null,
      blog: EMPTY_SECTION,
      events: EMPTY_SECTION,
      products: EMPTY_SECTION,
    }
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
