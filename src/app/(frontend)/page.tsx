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
import MistRail from '@/components/mist/MistRail'
import MistStream from '@/components/mist/MistStream'
import type { TimelineDoc, MediaDoc } from '@/lib/payloadTypes'

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
    images: [
      {
        url: 'https://iwabuchi-makoto.com/myicon.png',
        width: 1200,
        height: 630,
        alt: 'OGP画像 - いわぶちまこと',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '岩渕誠（いわぶちまこと） | ライフログ',
    description:
      '岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録など日々の記録をタイムラインで残しています。',
    images: ['https://iwabuchi-makoto.com/myicon.png'],
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

  const [postsRes, statsRes, entriesCount, photosCount, galleryRes, settings, noticesRes] =
    await Promise.all([
      payload.find({ collection: 'timeline', limit: 50, sort: '-publishedAt', depth: 2 }),
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
        limit: 14,
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
  }
}

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
    }
  }

  const { posts, entriesTotal, photosTotal, gallery, streak, notices, hero, profile, spotifyUrl } =
    data

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

          {/* ── 統合バー: NOTICE ローテ + entries/photos/streak + 天気/時計 ── */}
          <MistStatusBar
            notices={notices}
            entries={entriesTotal}
            photos={photosTotal}
            streak={streak}
          />

          {/* ── メイングリッド: git log 風タイムライン + 右レール ── */}
          <div className="main">
            <MistLogTimeline posts={posts} total={entriesTotal} />
            <MistRail
              profile={profile}
              photos={gallery}
              photosTotal={photosTotal}
              spotifyUrl={spotifyUrl}
            />
          </div>

          {/* ── ギャラリーストリーム ── */}
          <MistStream photos={gallery} />

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
