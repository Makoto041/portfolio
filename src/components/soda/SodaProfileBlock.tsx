// src/components/soda/SodaProfileBlock.tsx
// ホーム下段のプロフィール帯（丸アバター・名前・自己紹介・SNS）。
import Image from 'next/image'
import SodaIcon, { socialIcon } from '@/components/soda/SodaIcon'
import { toCFUrl } from '@/lib/cfUrl'
import { socialLabel, type ProfileData } from '@/lib/social'

export default function SodaProfileBlock({ profile }: { profile: ProfileData }) {
  const name = profile.nameJapanese ?? profile.name ?? 'いわぶちまこと'
  return (
    <div className="s-pblock">
      <div className="s-who">
        <div className="s-av">
          <Image
            src={toCFUrl(profile.imageUrl || '/profile.jpg')}
            alt={`${name}のプロフィール写真`}
            fill
            sizes="84px"
            className="object-cover"
          />
        </div>
        <div>
          <div className="s-nm">{name}</div>
          {profile.name && <div className="s-ro">{profile.name}</div>}
          {profile.title && <div className="s-ro">{profile.title}</div>}
        </div>
      </div>
      {profile.description && <p className="s-bio">{profile.description}</p>}
      {(profile.socialLinks?.length ?? 0) > 0 && (
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
      )}
    </div>
  )
}
