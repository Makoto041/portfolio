// src/components/soda/SodaTicket.tsx
// イベントの「半券」。左の半券に開催日（年.月 / 日 / 曜日）、ミシン目をはさんで右に内容。
// 配信中は LIVE。外部リンク（配信ページ）は新しいタブで開く。
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'

export type TicketView = {
  id: string
  href: string
  external: boolean
  title: string
  platform: string
  year?: number
  month?: number
  day?: number
  /** 曜日（漢字1文字） */
  weekday?: string
  /** `14:30〜15:30`（25時表記あり） */
  time: string
  live: boolean
  /** 一覧ページで添える概要 */
  note?: string | null
}

export default function SodaTicket({ href, external, title, platform, year, month, day, weekday, time, live, note }: TicketView) {
  const inner = (
    <>
      <span className="s-ticket-stub">
        {year && month ? (
          <span className="s-ticket-ym s-num">
            {year}.{month}
          </span>
        ) : null}
        <span className="s-ticket-d s-num">{day ?? '—'}</span>
        {weekday && <span className="s-ticket-wd">{weekday}曜</span>}
      </span>
      <div className="s-ticket-body">
        <span className="s-ticket-meta">
          <span className="s-ticket-plat">{platform}</span>
          {live && <span className="s-live">LIVE</span>}
        </span>
        <h3 className="s-ticket-title">{title}</h3>
        <span className="s-ticket-time s-num">{time}</span>
        {note && <span className="s-ticket-note">{note}</span>}
      </div>
      {external && (
        <span className="s-ticket-ext" aria-hidden="true">
          <SodaIcon name="external" />
        </span>
      )}
    </>
  )

  if (external) {
    return (
      <a className="s-ticket is-ext" href={href} target="_blank" rel="noopener noreferrer">
        {inner}
        <span className="sr-only">（新しいタブで開く）</span>
      </a>
    )
  }
  return (
    <Link className="s-ticket" href={href}>
      {inner}
    </Link>
  )
}
