// src/components/mist/MistCompactIntro.tsx
// SP 専用のコンパクト自己紹介（D-1 案2）。hero 直下に「小アバター + 名前 + role + SNS」を1行で。
// 「誰のサイトか」をファーストビュー近くで示す。フルの profile カード（MistRail）は現位置に残す。
// 表示は CSS（.compact-intro）で ≤760px のみ。
import Image from 'next/image'
import { toCFUrl } from '@/lib/cfUrl'
import { socialLabel, type ProfileData } from '@/lib/social'

export default function MistCompactIntro({ profile }: { profile: ProfileData }) {
  const name = profile.nameJapanese ?? profile.name
  if (!name && !profile.imageUrl) return null

  return (
    <div className="compact-intro" aria-label="プロフィール概要">
      {profile.imageUrl && (
        <div className="ci-av">
          <Image
            src={toCFUrl(profile.imageUrl)}
            alt={name ?? 'avatar'}
            fill
            sizes="34px"
            className="object-cover"
          />
        </div>
      )}
      <div className="ci-meta">
        <span className="ci-nm jp">{name}</span>
        {profile.title && <span className="ci-rl">{profile.title}</span>}
      </div>
      <div className="ci-sns">
        {/* コンパクト行なので最大4件に制限（全件は /profile ページに表示） */}
        {profile.socialLinks?.slice(0, 4).map((link) =>
          link.url ? (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.displayName ?? link.platform ?? 'link'}
            >
              {socialLabel(link, 'short', '↗')}
            </a>
          ) : null,
        )}
      </div>
    </div>
  )
}
