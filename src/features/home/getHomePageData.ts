// ───────────────────────────────────────────
// src/features/home/getHomePageData.ts
// ホームのデータ取得・集計・表示モデルへのマッピング。
// page.tsx はレイアウトに専念し、Payload アクセスと整形はここに集約する。
// 別コレクションの取得失敗はセクション単位で握りつぶし、ホーム全体を巻き込まない。
// ───────────────────────────────────────────
import { getPayloadClient } from '@/lib/payloadClient'
import { GALLERY_WHERE, getTodayData, EMPTY_TODAY, type TodayData } from '@/features/site/getTodayData'
import { blogRow, eventCard, productCard } from '@/features/site/cardViews'
import type { CardView } from '@/components/soda/SodaCard'
import type { BlogRowView } from '@/components/soda/SodaBlogRow'
import type { ColumnPhoto } from '@/components/soda/SodaPhotoColumn'
import type { TimelineDoc, MediaDoc, Event, Product } from '@/lib/payloadTypes'
import type { BlogPost as BlogPostDoc } from '@/payload-types'
import type { ProfileData } from '@/lib/social'

export type HomePageData = {
  /** 最新の投稿 */
  lead?: TimelineDoc
  /** 最新の投稿に続く投稿 */
  feed: TimelineDoc[]
  today: TodayData
  gallery: ColumnPhoto[]
  hero: { tagline: string; role: string }
  profile: ProfileData
  blog: BlogRowView[]
  events: CardView[]
  products: CardView[]
}

const HERO_DEFAULTS = {
  tagline: '日々の記録、ときどき写真。つぶやきくらいの気軽さで。',
  role: '— tokyo',
}

/** 取得失敗時のフォールバック（ホームを空状態で成立させる） */
export function emptyHomePageData(): HomePageData {
  return {
    feed: [],
    today: EMPTY_TODAY,
    gallery: [],
    hero: { ...HERO_DEFAULTS },
    profile: {},
    blog: [],
    events: [],
    products: [],
  }
}

/** ホームに載せる投稿数（最新1 + タイムライン6） */
const HOME_POSTS = 7

export async function getHomePageData(): Promise<HomePageData> {
  const payload = await getPayloadClient()
  const emptyDocs = { docs: [] as unknown[], totalDocs: 0 }

  const [postsRes, galleryRes, settings, blogRes, eventsRes, productsRes, today] = await Promise.all([
    payload.find({ collection: 'timeline', limit: HOME_POSTS, sort: '-publishedAt', depth: 2 }),
    payload
      // PC の写真は 5列×2段の 10 枚（SP・タブレットは CSS で 6 枚に絞る）
      .find({ collection: 'media', limit: 10, sort: '-createdAt', where: GALLERY_WHERE, depth: 0 })
      .catch((e) => {
        console.error('Gallery fetch failed (section hidden):', e)
        return emptyDocs
      }),
    // 設定はスキーマ変更（新カラム）未適用でもホーム全体を巻き込まないよう既定値へ縮退
    payload.findGlobal({ slug: 'site-settings', depth: 1 }).catch((e) => {
      console.error('site-settings fetch failed (using defaults):', e)
      return null
    }),
    payload.find({ collection: 'blogPosts', limit: 3, sort: '-publishedAt', depth: 1 }).catch((e) => {
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
    payload.find({ collection: 'products', limit: 4, sort: 'order', depth: 1 }).catch((e) => {
      console.error('Products fetch failed (section hidden):', e)
      return emptyDocs
    }),
    getTodayData(),
  ])

  const posts = postsRes.docs as unknown as TimelineDoc[]
  const [lead, ...feed] = posts

  const gallery: ColumnPhoto[] = (galleryRes.docs as unknown as MediaDoc[])
    .filter((m) => m.url)
    .map((m) => ({ key: String(m.id), url: m.url as string, alt: m.alt }))

  const heroData = settings?.hero
  const hero = {
    tagline: heroData?.tagline || HERO_DEFAULTS.tagline,
    role: heroData?.roleEn || HERO_DEFAULTS.role,
  }

  const profileData = settings?.profile
  const profileImage = profileData?.profileImage
  const profile: ProfileData = {
    name: profileData?.name,
    nameJapanese: profileData?.nameJapanese,
    title: profileData?.title,
    description: profileData?.description,
    imageUrl: typeof profileImage === 'object' && profileImage?.url ? profileImage.url : null,
    socialLinks: profileData?.socialLinks ?? [],
  }

  return {
    lead,
    feed,
    today,
    gallery,
    hero,
    profile,
    blog: (blogRes.docs as unknown as BlogPostDoc[]).map(blogRow),
    events: (eventsRes.docs as unknown as Event[]).map((e) => eventCard(e)),
    products: (productsRes.docs as unknown as Product[]).map(productCard),
  }
}

/** 表紙の号の年月 `2026.10`（Asia/Tokyo） */
export function issueMonth(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit' })
    .formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}.${get('month')}`
}
