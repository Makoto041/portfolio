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

// 右レールに並べるギャラリーのサムネ枚数（残りは +n タイルに集約。3列グリッド＝8枚+残数で3行）
const RAIL_THUMBS = 8

/** Spotify 共有URL → 埋め込みURL。playlist/album/track/artist に対応。不正なら null */
function spotifyEmbedUrl(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/(playlist|album|track|artist)[/:]([a-zA-Z0-9]+)/)
  if (!m) return null
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator`
}

type Props = {
  profile: ProfileData
  photos: MediaDoc[]
  /** ギャラリー総枚数（"n files →" と +n タイルに使う） */
  photosTotal: number
  /** Payload（SiteSettings.spotify.playlistUrl）で設定された Spotify 共有URL */
  spotifyUrl?: string | null
}

export default function MistRail({ profile, photos, photosTotal, spotifyUrl }: Props) {
  const thumbs = photos.slice(0, RAIL_THUMBS)
  const restCount = Math.max(photosTotal - thumbs.length, 0)
  const spotifyEmbed = spotifyEmbedUrl(spotifyUrl)

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
          {thumbs.map((p) =>
            p.url ? (
              <Link key={p.id} href="/gallery" className="tile">
                <Image
                  src={toCFUrl(p.sizes?.thumbnail?.url ?? p.url)}
                  alt={p.alt || 'gallery photo'}
                  fill
                  sizes="110px"
                  quality={70}
                  className="object-cover"
                />
              </Link>
            ) : null,
          )}
          {restCount > 0 && (
            <Link href="/gallery" className="more">
              +{restCount}
            </Link>
          )}
        </div>
      </div>

      {/* spotify（設定時）: 目次リンクの代わりにプレイリストを埋め込む。未設定ならリンク一覧 */}
      {spotifyEmbed ? (
        <div className="card">
          <span className="cmd">$ spotify --playlist</span>
          <iframe
            className="spotify-embed"
            src={spotifyEmbed}
            height={352}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            // 多層防御: 埋め込み先(open.spotify.com 固定)に自サイトへのフルアクセスを与えない。
            // Spotify プレイヤー動作に必要な最小権限のみ許可
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
            loading="lazy"
            title="Spotify プレイリスト"
          />
        </div>
      ) : (
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
      )}
    </div>
  )
}
