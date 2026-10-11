// src/components/soda/SodaMemo.tsx
// おしらせの「メモ帳」（上がミシン目の切り取りメモ・手書きの添え書き）＋お便りへの導線。
// PC はホーム・タイムラインの脇、SP はホームの写真の下に置く（id="memo" は SP のピン留めの飛び先）。
import { Fragment } from 'react'
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'
import type { NoticeView } from '@/features/site/getTodayData'

export default function SodaMemo({ notices }: { notices: NoticeView[] }) {
  return (
    <section className="s-memo" id="memo" aria-labelledby="h-memo">
      <h2 id="h-memo" className="s-memo-h">
        MEMO <span>おしらせ</span>
      </h2>
      {notices.length > 0 ? (
        <ul className="s-memo-list">
          {notices.map((n) => (
            <li key={n.key}>
              {n.badge && <b className="s-num">{n.badge}</b>}
              <span>
                {n.chunks.map((c, i) => (
                  <Fragment key={i}>
                    {i > 0 && <wbr />}
                    {c}
                  </Fragment>
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="s-memo-empty">いまはおしらせはありません。</p>
      )}
      <Link href="/letter" className="s-pill is-solid s-memo-cta">
        <SodaIcon name="mail" />
        お便りを送る
      </Link>
    </section>
  )
}
