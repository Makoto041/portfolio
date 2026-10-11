// src/components/soda/SodaMasthead.tsx
// ホームの題字。左寄せの「MAKOTO」と、右の日付印（＋東京の時刻・天気）。
// 日記帳の「きょうのページ」を開く入口で、下の投稿には重ねない。
// id="soda-wordmark" はヘッダーが「最上部か」（小ロゴを隠すか）を判定するのに使う。
import SodaTodayStamp from '@/components/soda/SodaTodayStamp'

type Props = {
  /** 欧文の肩書き（SiteSettings.hero.roleEn。例 `— tokyo`） */
  role: string
  tagline: string
  /** 描画時刻（ISO）。日付印の初期表示に使う */
  today: string
}

const WORD = 'MAKOTO'

export default function SodaMasthead({ role, tagline, today }: Props) {
  return (
    <div className="s-mast">
      <h1 className="sr-only">岩渕誠（いわぶちまこと）のライフログ</h1>
      <span id="soda-wordmark" className="s-wordmark" aria-hidden="true">
        {WORD.split('').map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </span>
      <SodaTodayStamp today={today} />
      <p className="s-mast-sub">
        <span className="s-kick">Life log {role}</span>
        <span className="s-tagline">{tagline}</span>
      </p>
    </div>
  )
}
