// ───────────────────────────────────────────
// src/app/(frontend)/profile/page.tsx
// ───────────────────────────────────────────
export const revalidate = 60 // ISR: 更新時は各コレクションの afterChange で on-demand 再検証

import Image from 'next/image'
import type { Metadata } from 'next'
import SodaPageHead from '@/components/soda/SodaPageHead'
import SodaIcon, { socialIcon } from '@/components/soda/SodaIcon'
import { toCFUrl } from '@/lib/cfUrl'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
import { getPayloadClient } from '@/lib/payloadClient'
import { socialLabel, type ProfileData, type SocialLink } from '@/lib/social'
import { spotifyEmbedUrl } from '@/lib/spotify'
import { getTodayData } from '@/features/site/getTodayData'
import { streakFact } from '@/lib/timeline'

const FALLBACK_PROFILE: Required<Pick<ProfileData, 'name' | 'nameJapanese' | 'title' | 'description'>> & ProfileData = {
  name: 'Makoto Iwabuchi',
  nameJapanese: 'いわぶちまこと',
  title: 'ウェブエンジニア',
  description:
    'ウェブエンジニア／フロントエンド好き。Payload CMS × Next.jsでポートフォリオサイトを構築しています。',
  imageUrl: null,
  socialLinks: [
    { platform: 'instagram', url: 'https://instagram.com/makoto0140', displayName: 'Instagram' },
    { platform: 'github', url: 'https://github.com/Makoto041', displayName: 'GitHub' },
    { platform: 'twitter', url: 'https://x.com/613_kmk', displayName: 'X' },
  ],
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const payload = await getPayloadClient()
    const siteSettings = await payload.findGlobal({
      slug: 'site-settings',
      depth: 2,
    })

    const title = `プロフィール | ${siteSettings.profile?.nameJapanese || 'いわぶちまこと'}`
    const description =
      siteSettings.profile?.description ||
      '岩渕誠（いわぶちまこと）のプロフィールページ。ウェブエンジニア・フロントエンド開発者として活動しています。'
    const siteName = siteSettings.profile?.nameJapanese || 'いわぶちまこと'

    return {
      // <title> はページ名のみ（template がブランド接尾辞を付与）。og/twitter はフル表記
      title: 'プロフィール',
      description,
      keywords: ['プロフィール', '岩渕誠', 'いわぶちまこと', 'ウェブエンジニア', 'フロントエンド', '開発者'],
      authors: [{ name: siteName }],
      openGraph: {
        title,
        description,
        url: 'https://iwabuchi-makoto.com/profile',
        siteName,
        locale: 'ja_JP',
        type: 'profile',
        // og:image は /og（1200×630 生成）を明示指定
        images: [OG_IMAGE],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [OG_IMAGE_URL],
      },
      alternates: {
        canonical: 'https://iwabuchi-makoto.com/profile',
      },
    }
  } catch (error) {
    console.error('Failed to generate profile metadata:', error)
    // フォールバック
    return {
      title: 'プロフィール',
      description:
        '岩渕誠（いわぶちまこと）のプロフィールページ。ウェブエンジニア・フロントエンド開発者として活動しています。',
    }
  }
}

async function getProfilePageData(): Promise<{ profile: ProfileData; spotifyUrl: string | null }> {
  try {
    const payload = await getPayloadClient()
    const siteSettings = await payload.findGlobal({ slug: 'site-settings', depth: 2 })
    const p = siteSettings.profile
    const profileImage = p?.profileImage
    return {
      profile: {
        name: p?.name || FALLBACK_PROFILE.name,
        nameJapanese: p?.nameJapanese || FALLBACK_PROFILE.nameJapanese,
        title: p?.title || FALLBACK_PROFILE.title,
        description: p?.description || FALLBACK_PROFILE.description,
        imageUrl: typeof profileImage === 'object' && profileImage?.url ? profileImage.url : null,
        socialLinks: (p?.socialLinks as SocialLink[] | undefined) ?? FALLBACK_PROFILE.socialLinks,
      },
      spotifyUrl: siteSettings.spotify?.playlistUrl ?? null,
    }
  } catch (error) {
    console.error('Failed to fetch profile data:', error)
    return { profile: FALLBACK_PROFILE, spotifyUrl: null }
  }
}

export default async function ProfilePage() {
  const [{ profile, spotifyUrl }, today] = await Promise.all([getProfilePageData(), getTodayData()])
  const fact = streakFact(today.stats)
  const profileImageUrl = profile.imageUrl ? toCFUrl(profile.imageUrl) : toCFUrl('/profile.jpg')
  const spotifyEmbed = spotifyEmbedUrl(spotifyUrl)

  return (
    <div className="s-wrap">
      <SodaPageHead en="Profile" title="プロフィール" desc="このサイトを書いている人" />
      <div className="s-pbody s-prof">
        <div className="s-prof-ph">
          <Image
            src={profileImageUrl}
            alt={`${profile.nameJapanese}（${profile.name}）のプロフィール写真`}
            fill
            priority
            sizes="(max-width: 900px) 92vw, 420px"
            className="object-cover"
          />
        </div>
        <div>
          <h2 className="s-prof-nm">{profile.nameJapanese}</h2>
          <p className="s-prof-en">
            {profile.name} · {profile.title}
          </p>
          <p className="s-prof-bio">{profile.description}</p>
          <div className="s-sns">
            {profile.socialLinks?.map((link) =>
              link.url ? (
                <a key={link.url} className="s-pill" href={link.url} target="_blank" rel="noopener noreferrer">
                  <SodaIcon name={socialIcon(link.platform)} />
                  {socialLabel(link)}
                </a>
              ) : null,
            )}
          </div>

          <div className="s-facts">
            <div>
              <b>{today.stats.entries}</b>
              <span>投稿</span>
            </div>
            <div>
              <b>{today.stats.photos}</b>
              <span>写真</span>
            </div>
            <div>
              <b>{fact.value}</b>
              <span>{fact.label}</span>
            </div>
          </div>

          {/* Spotify（SiteSettings.spotify.playlistUrl 設定時のみ） */}
          {spotifyEmbed && (
            <section className="s-spotify" aria-labelledby="h-spotify">
              <h2 id="h-spotify" className="s-spotify-h">
                いま聴いてる <span>Spotify</span>
              </h2>
              <iframe
                src={spotifyEmbed}
                height={352}
                // Spotify 公式埋め込みに準拠し sandbox は付けない。
                // 再生には自オリジン(open.spotify.com)のストレージが必要で、sandbox で allow-same-origin を外すと
                // 不透明オリジン化して再生不可。src は固定の信頼オリジンかつ cross-origin のため、
                // フレーム内容から親 DOM へは到達できない。参考: https://developer.spotify.com/documentation/embeds
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify プレイリスト"
              />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
