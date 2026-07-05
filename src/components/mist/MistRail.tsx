// src/components/mist/MistRail.tsx
// 右レール: $ cat profile.txt / $ ls ./gallery / $ ls ./more の3カード
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

// ターミナル意匠に合わせた小文字ラベル
const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'x',
  instagram: 'instagram',
  github: 'github',
  linkedin: 'linkedin',
  youtube: 'youtube',
}

const MORE_LINKS = [
  { label: 'posts/', href: '/posts' },
  { label: 'events/', href: '/in_event' },
  { label: 'products/', href: '/products' },
  { label: 'letter/', href: '/letter' },
] as const

type Props = {
  profile: ProfileData
  photos: MediaDoc[]
  /** ギャラリー総枚数（"n files →" と +n タイルに使う） */
  photosTotal: number
}

export default function MistRail({ profile, photos, photosTotal }: Props) {
  const [wide, sq] = photos
  const restCount = Math.max(photosTotal - 2, 0)

  return (
    <div className="rail">
      {/* profile */}
      <div className="card">
        <span className="cmd">$ cat profile.txt</span>
        <div className="who">
          {profile.imageUrl && (
            <div className="avatar">
              <Image
                src={toCFUrl(profile.imageUrl)}
                alt={profile.nameJapanese ?? 'avatar'}
                fill
                sizes="54px"
                className="object-cover"
              />
            </div>
          )}
          <div>
            <div className="nm jp">{profile.nameJapanese ?? profile.name}</div>
            {profile.title && <div className="rl">{profile.title}</div>}
          </div>
        </div>
        {profile.description && <p className="bio jp">{profile.description}</p>}
        <div className="socials">
          {profile.socialLinks?.map(({ platform, url, displayName }) =>
            url ? (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                {(displayName?.toLowerCase() || (platform ? PLATFORM_LABELS[platform] : null) || 'link') +
                  ' ↗'}
              </a>
            ) : null,
          )}
        </div>
      </div>

      {/* gallery */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span className="cmd">$ ls ./gallery</span>
          <Link href="/gallery" className="gal-link">
            {photosTotal} files →
          </Link>
        </div>
        <div className="gal-mini">
          {wide?.url && (
            <Link href="/gallery" className="tile wide">
              <Image
                src={toCFUrl(wide.sizes?.thumbnail?.url ?? wide.url)}
                alt={wide.alt || 'gallery photo'}
                fill
                sizes="280px"
                quality={70}
                className="object-cover"
              />
            </Link>
          )}
          {sq?.url && (
            <Link href="/gallery" className="tile sq">
              <Image
                src={toCFUrl(sq.sizes?.thumbnail?.url ?? sq.url)}
                alt={sq.alt || 'gallery photo'}
                fill
                sizes="140px"
                quality={70}
                className="object-cover"
              />
            </Link>
          )}
          {restCount > 0 && (
            <Link href="/gallery" className="more">
              +{restCount}
            </Link>
          )}
        </div>
      </div>

      {/* more */}
      <div className="card" style={{ gap: 0 }}>
        <span className="cmd" style={{ paddingBottom: 6 }}>
          $ ls ./more
        </span>
        {MORE_LINKS.map(({ label, href }) => (
          <Link key={href} href={href} className="lsrow">
            {label}
            <span aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
