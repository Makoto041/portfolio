// src/components/soda/SodaFooter.tsx
// 全ページ共通フッター（反転色）。モットー・全ページへのリンク・SNS・袋文字の巨大ロゴ。
import Link from 'next/link'
import SodaIcon, { socialIcon } from '@/components/soda/SodaIcon'
import { NAV } from '@/components/soda/nav'
import { socialLabel, type SocialLink } from '@/lib/social'

export default function SodaFooter({ socials }: { socials: SocialLink[] }) {
  return (
    <footer className="s-ftr">
      <div className="s-ftr-top">
        <p className="s-motto">slowly, but daily.</p>
        <nav className="s-ftr-cols" aria-label="サイトマップ">
          {NAV.map(({ href, ja, en }) => (
            <Link key={href} href={href}>
              {ja}
              <small>{en}</small>
            </Link>
          ))}
        </nav>
        {socials.length > 0 && (
          <div className="s-sns">
            {socials.map((link) =>
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
      <div className="s-bigword" aria-hidden="true">
        MAKOTO
      </div>
      <div className="s-copy">
        <span>© {new Date().getFullYear()} makoto iwabuchi</span>
        <span>iwabuchi-makoto.com</span>
      </div>
    </footer>
  )
}
