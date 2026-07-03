// src/components/home/SideRail.tsx
// トップページ脇の最小限のサイドレール
// （ミニプロフィール・タグ・最近の写真）
import Image from 'next/image'
import Link from 'next/link'
import { toCFUrl } from '@/lib/cfUrl'
import type { MediaDoc } from '@/lib/payloadTypes'

type ProfileData = {
  name?: string | null
  nameJapanese?: string | null
  title?: string | null
  description?: string | null
  imageUrl?: string | null
  socialLinks?: { platform?: string | null; url?: string | null; displayName?: string | null }[]
}

type SideRailProps = {
  profile: ProfileData
  tags: string[]
  photos: MediaDoc[]
}

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'X',
  instagram: 'Instagram',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
}

export default function SideRail({ profile, tags, photos }: SideRailProps) {
  return (
    <div className="space-y-4">
      {/* ミニプロフィール */}
      <section className="glass-card p-5">
        <div className="flex items-center gap-3">
          {profile.imageUrl && (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
              <Image
                src={toCFUrl(profile.imageUrl)}
                alt={profile.nameJapanese ?? 'profile'}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {profile.nameJapanese ?? profile.name}
            </p>
            {profile.title && <p className="text-xs text-muted">{profile.title}</p>}
          </div>
        </div>
        {profile.description && (
          <p className="mt-3 text-xs leading-relaxed text-muted">{profile.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {profile.socialLinks?.map(({ platform, url, displayName }) =>
            url ? (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--accent)] transition-opacity hover:opacity-70"
              >
                {displayName || (platform ? PLATFORM_LABELS[platform] : null) || 'Link'}
              </a>
            ) : null,
          )}
          <Link href="/profile" className="ml-auto text-muted transition-opacity hover:opacity-70">
            もっと見る →
          </Link>
        </div>
      </section>

      {/* タグ */}
      {tags.length > 0 && (
        <section className="glass-card p-5">
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-muted">TAGS</h2>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="chip">
                #{tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 最近の写真 */}
      {photos.length > 0 && (
        <section className="glass-card p-5">
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-muted">PHOTOS</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.slice(0, 6).map((photo) => {
              const url = photo.sizes?.thumbnail?.url ?? photo.url
              if (!url) return null
              return (
                <Link
                  key={photo.id}
                  href="/gallery"
                  className="relative aspect-square overflow-hidden rounded-lg"
                >
                  <Image
                    src={toCFUrl(url)}
                    alt={photo.alt || 'photo'}
                    fill
                    sizes="96px"
                    quality={70}
                    className="object-cover transition-transform duration-300 hover:scale-[1.05]"
                  />
                </Link>
              )
            })}
          </div>
          <Link
            href="/gallery"
            className="mt-3 inline-block text-xs text-muted transition-opacity hover:opacity-70"
          >
            もっと見る →
          </Link>
        </section>
      )}
    </div>
  )
}
