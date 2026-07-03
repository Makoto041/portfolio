// ───────────────────────────────────────────
// src/app/(frontend)/profile/page.tsx
// ───────────────────────────────────────────
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import Breadcrumb from '@/components/layout/Breadcrumb'
import { toCFUrl } from '@/lib/cfUrl'
import { getPayloadClient } from '@/lib/payloadClient'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const payload = await getPayloadClient()
    const siteSettings = await payload.findGlobal({
      slug: 'site-settings',
      depth: 2,
    })

    const profileImage = siteSettings.profile?.profileImage
    const profileImageUrl = profileImage && typeof profileImage === 'object' && 'url' in profileImage 
      ? toCFUrl(profileImage.url!) 
      : toCFUrl('/profile.jpg')

    const title = `プロフィール | ${siteSettings.profile?.nameJapanese || 'いわぶちまこと'}`
    const description = siteSettings.profile?.description || '岩渕誠（いわぶちまこと）のプロフィールページ。ウェブエンジニア・フロントエンド開発者として活動しています。'
    const siteName = siteSettings.profile?.nameJapanese || 'いわぶちまこと'

    return {
      title,
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
        images: [
          {
            url: profileImageUrl,
            width: 1200,
            height: 630,
            alt: `${siteName} プロフィール写真`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [profileImageUrl],
      },
      alternates: {
        canonical: 'https://iwabuchi-makoto.com/profile',
      },
    }
  } catch (error) {
    console.error('Failed to generate profile metadata:', error)
    // フォールバック
    return {
      title: 'プロフィール | 岩渕誠（いわぶちまこと）',
      description: '岩渕誠（いわぶちまこと）のプロフィールページ。ウェブエンジニア・フロントエンド開発者として活動しています。',
    }
  }
}
const WRAP =
  'mx-auto w-full max-w-[28rem] px-5 sm:px-8 section-pad flex flex-col items-center text-center'
const CARD = 'glass p-8 flex flex-col items-center'

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
      <main className="min-h-screen flex flex-col">
        <div className="mx-auto w-full max-w-[28rem] px-5 sm:px-8 pt-6">
          <Breadcrumb />
        </div>
        <section className={WRAP}>
          <div className={CARD}>
            <div className="relative w-40 h-40 rounded-full mb-6 overflow-hidden">
              <Image
                src={profileImageUrl}
                alt="Profile"
                width={160}
                height={160}
                sizes="160px"
                priority
                className="object-cover w-full h-full"
              />
            </div>
            <h1 className="text-2xl font-semibold mb-4">{profileData.name}</h1>
            <p className="mb-6 opacity-80">
              {profileData.description}
            </p>
            <div className="flex gap-6 flex-wrap justify-center">
              {profileData.socialLinks.map((link: any, index: number) => (
                <Link key={index} href={link.url} className="underline" target="_blank" rel="noopener noreferrer">
                  {getPlatformDisplayName(link.platform, link.displayName)}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
