// src/components/soda/SodaPin.tsx
// SP のホームで、最新のおしらせを1行だけピン留めで見せる（全件は下のメモ帳へ）。PC では出さない（CSS）。
import type { NoticeView } from '@/features/site/getTodayData'

export default function SodaPin({ notices }: { notices: NoticeView[] }) {
  const first = notices[0]
  if (!first) return null
  const rest = notices.length - 1
  return (
    <a className="s-pin" href="#memo">
      <span className="s-pin-head" aria-hidden="true" />
      {first.badge && <b className="s-num">{first.badge}</b>}
      <span className="s-pin-text">{first.text}</span>
      {rest > 0 && <span className="s-pin-more">ほか{rest}件</span>}
    </a>
  )
}
