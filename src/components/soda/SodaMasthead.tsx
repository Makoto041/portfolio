// src/components/soda/SodaMasthead.tsx
// ホームの表紙。カバーライン（ロール / タグライン / 号数）+ 巨大ワードマーク「MAKOTO」。
// ワードマークの下 26% は下のカバーストーリーに重なる（.s-wordmark の負マージン）。
// id="soda-wordmark" はヘッダーが「最上部か」を判定するのに使う。
type Props = {
  role: string
  tagline: string
  /** 号数（＝タイムラインの投稿数） */
  issue: number
  /** 号の年月 `2026.10` */
  month: string
}

const WORD = 'MAKOTO'

export default function SodaMasthead({ role, tagline, issue, month }: Props) {
  return (
    <div className="s-mast">
      <div className="s-coverline">
        <span>Life log {role}</span>
        <span className="s-tagline">{tagline}</span>
        <span className="s-num">
          No.{issue} · {month}
        </span>
      </div>
      <h1 className="sr-only">岩渕誠（いわぶちまこと）のライフログ</h1>
      <span id="soda-wordmark" className="s-wordmark" aria-hidden="true">
        {WORD.split('').map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </span>
    </div>
  )
}
