// ───────────────────────────────────────────
// src/features/home/getHomePageData.ts
// ホームのデータ取得・集計・表示モデルへのマッピング。
// page.tsx はレイアウトに専念し、Payload アクセスと整形はここに集約する。
// 別コレクションの取得失敗はセクション単位で握りつぶし、ホーム全体を巻き込まない。
// ───────────────────────────────────────────
import { getPayloadClient } from '@/lib/payloadClient'
import { getTodayData, EMPTY_TODAY, type TodayData } from '@/features/site/getTodayData'
import { getRecentPhotos } from '@/features/site/getRecentPhotos'
import { blogRow, eventTicket, productSticker } from '@/features/site/cardViews'
import type { TicketView } from '@/components/soda/SodaTicket'
import type { StickerView } from '@/components/soda/SodaSticker'
import type { BlogRowView } from '@/components/soda/SodaBlogRow'
import type { ColumnPhoto } from '@/components/soda/SodaContactSheet'
import type { TimelineDoc, Event, Product } from '@/lib/payloadTypes'
import type { BlogPost as BlogPostDoc } from '@/payload-types'
import type { ProfileData } from '@/lib/social'

export type HomePageData = {
  /** 最新の投稿（ノート / プリント） */
  lead?: TimelineDoc
  /** 最新の投稿に続く投稿 */
  feed: TimelineDoc[]
  today: TodayData
  /** ベタ焼き（最近の写真） */
  photos: ColumnPhoto[]
  hero: { tagline: string; role: string }
  profile: ProfileData
  blog: BlogRowView[]
  events: TicketView[]
  products: StickerView[]
  /** 見出しの耳に出す件数（ホームに載せた分ではなく全件） */
  counts: { blog: number; events: number; products: number }
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
    photos: [],
    hero: { ...HERO_DEFAULTS },
    profile: {},
    blog: [],
    events: [],
    products: [],
    counts: { blog: 0, events: 0, products: 0 },
  }
}

/** ホームに載せる投稿数（最新1 + タイムライン6） */
const HOME_POSTS = 7

export async function getHomePageData(): Promise<HomePageData> {
  const payload = await getPayloadClient()
  const emptyDocs = { docs: [] as unknown[], totalDocs: 0 }

  const [postsRes, photos, settings, blogRes, eventsRes, productsRes, today] = await Promise.all([
    payload.find({ collection: 'timeline', limit: HOME_POSTS, sort: '-publishedAt', depth: 2 }),
    getRecentPhotos(),
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
        limit: 3,
        sort: '-startDate',
        depth: 0,
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
    photos,
    hero,
    profile,
    blog: (blogRes.docs as unknown as BlogPostDoc[]).map(blogRow),
    events: (eventsRes.docs as unknown as Event[]).map((e) => eventTicket(e)),
    products: (productsRes.docs as unknown as Product[]).map((p) => productSticker(p)),
    counts: { blog: blogRes.totalDocs, events: eventsRes.totalDocs, products: productsRes.totalDocs },
  }
}
