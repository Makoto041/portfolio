// src/app/(frontend)/page.tsx
// トップページ「ミスト・ターミナル」— 群青×ミストの透明感 × ターミナル/git log のメタファー
// （docs/README.md + docs/design-reference-top.html の hifi 移植。Timeline が主役）
export const dynamic = 'force-static'
export const revalidate = 60

import './mist.css'
import { Outfit, IBM_Plex_Mono, Noto_Sans_JP } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { getPayloadClient } from '@/lib/payloadClient'
import { getActiveEvent } from '@/lib/getActiveEvent'
import MistTitlebar from '@/components/mist/MistTitlebar'
import MistEnvBar from '@/components/mist/MistEnvBar'
import MistLogTimeline from '@/components/mist/MistLogTimeline'
import MistRail from '@/components/mist/MistRail'
import MistStream from '@/components/mist/MistStream'
import type { TimelineDoc, MediaDoc } from '@/lib/payloadTypes'

/* ── フォント（デザイン指定: Outfit / IBM Plex Mono / Noto Sans JP、next/fontでセルフホスト）
   ここで読むのはトップページのみ。他ページは既存の Higure Gothic を維持する ── */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
})
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})
const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-jp',
  display: 'swap',
  preload: false, // 日本語フォントはunicode-range分割で必要分のみ取得される
})

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

// 草グリッド4段階（デザイントークン）
const CONTRIB_COLORS = [
  'oklch(0.88 0.015 262)',
  'oklch(0.72 0.05 268)',
  'oklch(0.58 0.07 268)',
  'oklch(0.42 0.09 270)',
] as const

const CONTRIB_DAYS = 30

/** Asia/Tokyo での日付キー（YYYY-MM-DD） */
const toDayKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(date)

/** 日次投稿数から連続投稿日数と草グリッド（過去30日 → レベル0-3）を計算 */
function buildActivity(dates: string[]) {
  const counts = new Map<string, number>()
  for (const d of dates) {
    const t = new Date(d)
    if (Number.isNaN(t.getTime())) continue
    const key = toDayKey(t)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const DAY_MS = 24 * 60 * 60 * 1000
  const now = Date.now()

  // streak: 今日から遡って連続で投稿がある日数（今日未投稿なら昨日起点）
  let streak = 0
  let cursor = now
  if (!counts.has(toDayKey(new Date(cursor)))) cursor -= DAY_MS
  while (counts.has(toDayKey(new Date(cursor)))) {
    streak += 1
    cursor -= DAY_MS
  }

  // 草: 過去30日（左が古い）を投稿数→4段階にマップ（0 / 1 / 2 / 3以上）
  const contrib: number[] = []
  for (let i = CONTRIB_DAYS - 1; i >= 0; i--) {
    const count = counts.get(toDayKey(new Date(now - i * DAY_MS))) ?? 0
    contrib.push(Math.min(count, 3))
  }

  return { streak, contrib }
}

async function fetchTopPageData() {
  const payload = await getPayloadClient()

  const [postsRes, statsRes, entriesCount, photosCount, galleryRes, settings, activeEvent] =
    await Promise.all([
      payload.find({ collection: 'timeline', limit: 50, sort: '-publishedAt', depth: 2 }),
      // 集計用は日付だけを軽量に取得（草グリッド・streak計算）
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
        limit: 10,
        sort: '-createdAt',
        where: GALLERY_WHERE,
      }),
      payload.findGlobal({ slug: 'site-settings' }),
      getActiveEvent(),
    ])

  const posts = postsRes.docs as unknown as TimelineDoc[]
  const gallery = (galleryRes.docs as unknown as MediaDoc[]).filter(
    (g) => g.url || g.sizes?.thumbnail?.url,
  )

  const { streak, contrib } = buildActivity(
    (statsRes.docs as { publishedAt?: string; createdAt: string }[]).map(
      (d) => d.publishedAt ?? d.createdAt,
    ),
  )

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

  // STATUS 行: 開催中イベント → ピン留め投稿タイトル → デフォルト
  const pinned = posts.find((p) => p.priority === 'pinned')
  const status = activeEvent?.title
    ? `${activeEvent.title} 開催中`
    : pinned?.title || '日々更新中'

  return {
    posts,
    entriesTotal: entriesCount.totalDocs,
    photosTotal: photosCount.totalDocs,
    gallery,
    streak,
    contrib,
    profile,
    status,
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
      contrib: Array(CONTRIB_DAYS).fill(0),
      profile: {} as never,
      status: '日々更新中',
    }
  }

  const { posts, entriesTotal, photosTotal, gallery, streak, contrib, profile, status } = data

  return (
    <div className={`mist ${outfit.variable} ${plexMono.variable} ${notoSansJP.variable}`}>
      <Analytics />
      <div className="page">
        <div className="mist1" aria-hidden />
        <div className="mist2" aria-hidden />
        <main className="inner">
          {/* ── ウィンドウタイトルバー ── */}
          <MistTitlebar />

          {/* ── ヒーロー ── */}
          <header className="hero">
            <span className="prompt">~/life $ whoami</span>
            <h1 className="nameblock">
              <span className="name-outline">MAKOTO</span>
              <span className="name-fill">
                IWABUCHI
                <span className="cursor" aria-hidden />
              </span>
              {/* SEO: 実名・かな表記はスクリーンリーダー/クローラー向けに保持 */}
              <span className="sr-only">岩渕誠（いわぶちまこと）のライフログ</span>
            </h1>
            <div className="tagline">
              <span className="jp">日々の記録、ときどき写真。つぶやきくらいの気軽さで。</span>
              <span className="en">— web engineer, tokyo</span>
            </div>

            {/* ステータスストリップ */}
            <div className="status">
              <span className="lab">
                <span className="livedot" aria-hidden />
                STATUS: <span className="jp">{status}</span>
              </span>
              <span className="kv">
                entries: <b>{entriesTotal}</b>
              </span>
              <span className="kv">
                photos: <b>{photosTotal}</b>
              </span>
              <span className="kv">
                streak: <b>{streak}d</b>
              </span>
              <div className="contrib" aria-label={`過去${CONTRIB_DAYS}日の投稿アクティビティ`}>
                {contrib.map((level, i) => (
                  <i key={i} style={{ background: CONTRIB_COLORS[level] }} />
                ))}
              </div>
            </div>
          </header>

          {/* ── ライブ環境バー（時刻・現在地・天気） ── */}
          <MistEnvBar />

          {/* ── メイングリッド: git log 風タイムライン + 右レール ── */}
          <div className="main">
            <MistLogTimeline posts={posts} total={entriesTotal} />
            <MistRail profile={profile} photos={gallery} photosTotal={photosTotal} />
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
