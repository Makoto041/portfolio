// app/(frontend)/error.tsx
// 予期しないエラー時の画面（Soda Press の見た目で、再読み込みとホームへの導線を出す）。
// レイアウトごと置き換わるため、最小限のヘッダーを自前で持つ。
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import SodaPageHead from '@/components/soda/SodaPageHead'
import SodaIcon from '@/components/soda/SodaIcon'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="soda">
      <header className="s-hdr">
        <Link href="/" className="s-logo-s" aria-label="いわぶちまこと ホームへ">
          MAKOTO
        </Link>
      </header>
      <main id="main" className="s-main">
        <div className="s-wrap">
          <SodaPageHead en="Oops" title="うまく表示できませんでした" />
          <div className="s-oops">
            <p>ページの読み込み中に問題が起きました。時間をおいて、もう一度お試しください。</p>
            <div className="s-oops-actions">
              <button type="button" className="s-pill is-solid" onClick={() => reset()}>
                もう一度読み込む
              </button>
              <Link href="/" className="s-pill">
                <SodaIcon name="home" />
                ホームへ戻る
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
