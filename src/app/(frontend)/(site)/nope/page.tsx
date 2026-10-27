// src/app/(frontend)/(site)/nope/page.tsx
// /admin に通行証なしで来た人に見せるネタページ（src/middleware.ts が差し替える。URL は /admin/... のまま）。
// ログインフォームは見た目だけで、入力はどこにも送らない・記録しない。静的ページ（ISR）なので、ボットが何度来てもリクエストごとには DB を引かず軽い。
import type { Metadata } from 'next'
import Link from 'next/link'
import SodaPageHead from '@/components/soda/SodaPageHead'
import SodaIcon from '@/components/soda/SodaIcon'
import NopeForm from './NopeForm'

// 外枠（フッター・メニュー）にサイト設定を出すため ISR にする（設定変更時は全ページが再検証される）
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'ここには何もありません',
  description: 'ここは管理画面ではありません。',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
}

/** ログ風の演出。実際の試行を記録しているわけではない */
const TRIES: { cmd: string; res: string }[] = [
  { cmd: '$ try admin / admin', res: '× 空振り' },
  { cmd: '$ try admin / password', res: '× 空振り' },
  { cmd: '$ try root / 123456', res: '× 空振り' },
  { cmd: '$ GET /wp-login.php', res: '× ここは WordPress ではありません' },
  { cmd: '$ GET /.env', res: '× 夢を見すぎです' },
]

export default function NopePage() {
  return (
    <div className="s-wrap">
      <SodaPageHead
        en="NOPE"
        title="ここは /admin です。ただし、何もありません。"
        desc="毎日たくさんの方（主にボット）が来てくれます。ご苦労さまです。"
      />
      <div className="s-pbody">
        <div className="s-nope">
          <section className="s-lform" aria-labelledby="nope-form-h">
            <h2 id="nope-form-h" className="s-nope-h">
              ログイン（にせもの）
            </h2>
            <p className="s-hint">入力した内容は、どこにも送られません。</p>
            <NopeForm />
          </section>

          <section className="s-nope-log" aria-labelledby="nope-log-h">
            <h2 id="nope-log-h" className="s-nope-h">
              いまの試行（ぜんぶ空振り）
            </h2>
            <p className="s-nope-cap">演出です。あなたの入力は記録していません。</p>
            <ol>
              {TRIES.map((t) => (
                <li key={t.cmd}>
                  <span>{t.cmd}</span>
                  <b>{t.res}</b>
                </li>
              ))}
              <li>
                <span>
                  $ try makoto / ???<i className="s-nope-caret" aria-hidden="true" />
                </span>
                <em>… 本人は、ちゃんと知っています</em>
              </li>
            </ol>
          </section>
        </div>

        <div className="s-oops">
          <p>探しているのが管理画面なら、残念ながらここではありません。ふつうのサイトをお探しなら、こちらからどうぞ。</p>
          <div className="s-oops-actions">
            <Link href="/" className="s-pill is-solid">
              <SodaIcon name="home" />
              ホームへ
            </Link>
            <Link href="/timeline" className="s-pill">
              タイムライン
            </Link>
            <Link href="/posts" className="s-pill">
              ブログ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
