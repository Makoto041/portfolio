// src/components/soda/SodaDrawer.tsx
// 全画面メニュー（反転色）。ネイティブ <dialog> + showModal() で
// フォーカストラップ・Escape で閉じる・閉時のフォーカス復帰をブラウザ標準に委ねる。
'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SodaIcon, { socialIcon } from '@/components/soda/SodaIcon'
import { useSodaNav } from '@/components/soda/SodaNav'
import { NAV, isActive } from '@/components/soda/nav'
import { socialLabel, type SocialLink } from '@/lib/social'

type Props = { socials: SocialLink[]; tagline: string }

export default function SodaDrawer({ socials, tagline }: Props) {
  const pathname = usePathname() ?? '/'
  const { isOpen, close } = useSodaNav()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    else if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  // 開いている間は背景スクロールをロック
  useEffect(() => {
    if (!isOpen) return
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = prev
    }
  }, [isOpen])

  // ページ遷移で閉じる
  useEffect(() => {
    close()
  }, [pathname, close])

  return (
    <dialog ref={ref} className="s-drawer" aria-label="メニュー" onClose={close}>
      <div className="s-dtop">
        <span className="s-logo-s" aria-hidden="true">
          MAKOTO
        </span>
        <button type="button" className="s-iconbtn" onClick={close} aria-label="メニューを閉じる">
          <SodaIcon name="close" />
        </button>
      </div>
      <div className="s-dbody">
        <nav className="s-dnav" aria-label="すべてのページ">
          {NAV.map(({ href, ja, en }) => {
            const on = isActive(pathname, href)
            return (
              <Link key={href} href={href} aria-current={on ? 'page' : undefined} onClick={close}>
                {ja}
                <small>{en}</small>
              </Link>
            )
          })}
        </nav>
        <div className="s-dside">
          {socials.length > 0 && (
            <div className="s-sns">
              {socials.map((link) =>
                link.url ? (
                  <a key={link.url} className="s-pill" href={link.url} target="_blank" rel="noopener noreferrer">
                    <SodaIcon name={socialIcon(link.platform)} />
                    {socialLabel(link, 'full')}
                  </a>
                ) : null,
              )}
            </div>
          )}
          <p className="s-dnote">
            {tagline}
            <br />
            slowly, but daily.
          </p>
        </div>
      </div>
    </dialog>
  )
}
