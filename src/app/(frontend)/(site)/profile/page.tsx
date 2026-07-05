// ───────────────────────────────────────────
// src/app/(frontend)/profile/page.tsx
// ───────────────────────────────────────────
export const revalidate = 60 // ISR: 更新時は各コレクションの afterChange で on-demand 再検証

import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import MistPageHead from '@/components/mist/MistPageHead'
import { toCFUrl } from '@/lib/cfUrl'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
import { getPayloadClient } from '@/lib/payloadClient'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const payload = await getPayloadClient()
    const siteSettings = await payload.findGlobal({
      slug: 'site-settings',
      depth: 2,
    })

    const title = `プロフィール | ${siteSettings.profile?.nameJapanese || 'いわぶちまこと'}`
    const description = siteSettings.profile?.description || '岩渕誠（いわぶちまこと）のプロフィールページ。ウェブエンジニア・フロントエンド開発者として活動しています。'
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
      description: '岩渕誠（いわぶちまこと）のプロフィールページ。ウェブエンジニア・フロントエンド開発者として活動しています。',
    }
  }
}

export default async function ProfilePage() {
  let profileData = {
    name: 'Makoto Iwabuchi',
    nameJapanese: 'いわぶちまこと',
    title: 'ウェブエンジニア',
    description: 'ウェブエンジニア／フロントエンド好き。Payload CMS × Next.jsでポートフォリオサイトを構築しています。',
    profileImage: null as any,
    socialLinks: [
      { platform: 'twitter', url: '#', displayName: 'X' },
      { platform: 'instagram', url: 'https://instagram.com/makoto0140', displayName: 'Instagram' },
      { platform: 'github', url: 'https://github.com/Makoto041', displayName: 'GitHub' },
    ] as any,
  }

  try {
    const payload = await getPayloadClient()
    const siteSettings = await payload.findGlobal({
      slug: 'site-settings',
      depth: 2,
    })

    if (siteSettings.profile) {
      profileData = {
        name: siteSettings.profile.name || profileData.name,
        nameJapanese: siteSettings.profile.nameJapanese || profileData.nameJapanese,
        title: siteSettings.profile.title || profileData.title,
        description: siteSettings.profile.description || profileData.description,
        profileImage: siteSettings.profile.profileImage,
        socialLinks: siteSettings.profile.socialLinks || profileData.socialLinks,
      }
    }
  } catch (error) {
    console.error('Failed to fetch profile data:', error)
    // フォールバックデータを使用
  }

  const profileImageUrl = profileData.profileImage && typeof profileData.profileImage === 'object' && 'url' in profileData.profileImage
    ? toCFUrl(profileData.profileImage.url!)
    : toCFUrl('/profile.jpg')

  const getPlatformDisplayName = (platform: string, displayName?: string) => {
    if (displayName) return displayName
    switch (platform) {
      case 'twitter': return 'X'
      case 'instagram': return 'Instagram'
      case 'github': return 'GitHub'
      case 'linkedin': return 'LinkedIn'
      case 'youtube': return 'YouTube'
      default: return platform
    }
  }
  
  return (
    <>
      <link rel="preload" as="image" href={profileImageUrl} />
      <main className="content">
        <MistPageHead cmd="cat ./profile.txt" title="Profile" />
        <section className="single">
          <div
            className="card"
            style={{ alignItems: 'center', textAlign: 'center', padding: '32px 28px', gap: 0 }}
          >
            <div
              className="avatar"
              style={{ width: 140, height: 140, borderRadius: '50%', marginBottom: 22 }}
            >
              <Image
                src={profileImageUrl}
                alt={`${profileData.nameJapanese}（${profileData.name}）のプロフィール写真`}
                width={140}
                height={140}
                sizes="140px"
                priority
                className="object-cover w-full h-full"
              />
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-outfit), sans-serif',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              {profileData.name}
            </h2>
            <p className="jp" style={{ margin: '6px 0 18px', fontSize: 11.5, color: 'var(--m-faint)' }}>
              {profileData.nameJapanese}・{profileData.title}
            </p>
            <p
              className="bio jp"
              style={{ marginBottom: 22, textAlign: 'center', maxWidth: 380 }}
            >
              {profileData.description}
            </p>
            <div className="socials" style={{ justifyContent: 'center' }}>
              {profileData.socialLinks.map((link: any, index: number) => (
                <Link key={index} href={link.url} target="_blank" rel="noopener noreferrer">
                  {getPlatformDisplayName(link.platform, link.displayName)} ↗
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
