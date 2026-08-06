// src/components/mist/MistRail.tsx
// 右端に固定（sticky）するプロフィール列: $ cat profile.txt + $ spotify --playlist
import Image from 'next/image'
import { toCFUrl } from '@/lib/cfUrl'
import { socialLabel, type ProfileData } from '@/lib/social'
import { spotifyEmbedUrl } from '@/lib/spotify'

type Props = {
  profile: ProfileData
  /** Payload（SiteSettings.spotify.playlistUrl）で設定された Spotify 共有URL */
  spotifyUrl?: string | null
}

export default function MistRail({ profile, spotifyUrl }: Props) {
  const spotifyEmbed = spotifyEmbedUrl(spotifyUrl)

  return (
    <aside className="profilecol">
      {/* profile */}
      <div className="card">
        <span className="cmd">$ cat profile.txt</span>
        <div className="who">
          {profile.imageUrl && (
            <div className="avatar">
              <Image
                src={toCFUrl(profile.imageUrl)}
                alt={profile.nameJapanese ?? 'プロフィール画像'}
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
          {profile.socialLinks?.map((link) =>
            link.url ? (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                {socialLabel(link, 'term')} ↗
              </a>
            ) : null,
          )}
        </div>
      </div>

      {/* spotify（設定時のみ） */}
      {spotifyEmbed && (
        <div className="card">
          <span className="cmd">$ spotify --playlist</span>
          <iframe
            className="spotify-embed"
            src={spotifyEmbed}
            height={352}
            // Spotify 公式埋め込みに準拠し sandbox は付けない（allow="encrypted-media" 等で制御）。
            // 参考: https://developer.spotify.com/documentation/embeds
            // 理由: 再生には自オリジン(open.spotify.com)のストレージが必要で、sandbox で
            //   allow-same-origin を外すと不透明オリジン化して再生不可。一方 allow-scripts+
            //   allow-same-origin の併用は静的解析で「sandbox 実質無効化」と指摘される。
            //   src は固定の信頼オリジンかつ cross-origin のため、フレーム内容から親DOMへは
            //   到達できず、sandbox 無しでも自サイトへのアクセスは生じない。
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify プレイリスト"
          />
        </div>
      )}
    </aside>
  )
}
