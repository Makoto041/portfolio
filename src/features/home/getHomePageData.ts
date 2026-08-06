// ───────────────────────────────────────────
// src/features/home/getHomePageData.ts
// トップページのデータ取得・集計・表示モデルへのマッピング。
// page.tsx はレイアウトに専念し、Payload アクセスと整形はここに集約する。
// ───────────────────────────────────────────
import { getPayloadClient } from '@/lib/payloadClient'
import { buildStreak, fmtDate, fmtDateBadge } from '@/lib/date'
import type { NoticeItem } from '@/components/mist/MistStatusBar'
import type { PortalItem } from '@/components/mist/MistPortalSection'
import type { TimelineDoc, MediaDoc, BlogPost, Event, Product } from '@/lib/payloadTypes'
import type { ProfileData } from '@/lib/social'

/** タイムライン専用画像を除いた「ギャラリー写真」の条件 */
const GALLERY_WHERE = {
  or: [{ isTimelineOnly: { equals: false } }, { isTimelineOnly: { exists: false } }],
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

export type PortalSection = { total: number; items: PortalItem[] }

export type HomePageData = {
  posts: TimelineDoc[]
  entriesTotal: number
  photosTotal: number
  gallery: MediaDoc[]
  streak: number
  notices: NoticeItem[]
  hero: { tagline: string; role: string }
  profile: ProfileData
  spotifyUrl: string | null
  blog: PortalSection
  events: PortalSection
  products: PortalSection
}

const HERO_DEFAULTS = {
  tagline: '日々の記録、ときどき写真。つぶやきくらいの気軽さで。',
  role: '— web engineer, tokyo',
}

const EMPTY_SECTION: PortalSection = { total: 0, items: [] }

/** 取得失敗時のフォールバック（トップページを空状態で成立させる） */
export function emptyHomePageData(): HomePageData {
  return {
    posts: [],
    entriesTotal: 0,
    photosTotal: 0,
    gallery: [],
    streak: 0,
    notices: [],
    hero: { ...HERO_DEFAULTS },
    profile: {},
    spotifyUrl: null,
    blog: EMPTY_SECTION,
    events: EMPTY_SECTION,
    products: EMPTY_SECTION,
  }
}

export async function getHomePageData(): Promise<HomePageData> {
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
    // Home は直近6件のダイジェスト（全件は専用の /timeline タブで）
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
    .map((n) => ({ badge: fmtDateBadge(n.date), text: n.body }))
    .filter((n) => n.text)

  const heroData = settings?.hero
  const hero = {
    tagline: heroData?.tagline || HERO_DEFAULTS.tagline,
    role: heroData?.roleEn || HERO_DEFAULTS.role,
  }

  const spotifyUrl = settings?.spotify?.playlistUrl ?? null

  // ── トップに載せる Blog / Events / Products ──
  const blog: PortalSection = {
    total: blogRes.totalDocs,
    items: (blogRes.docs as unknown as BlogPost[]).map<PortalItem>((p) => ({
      key: String(p.id),
      title: p.title,
      href: p.slug ? `/posts/${p.slug}` : '/posts',
      thumbUrl: p.coverImage?.url ?? null,
      meta: `${fmtDate(p.publishedAt ?? p.createdAt)} · Blog`,
    })),
  }
  const events: PortalSection = {
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
  const products: PortalSection = {
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
  const profile: ProfileData = {
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
