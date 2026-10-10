// app/(frontend)/not-found.tsx
// notFound()（存在しない記事など）の画面。通常ページと同じ外枠で、主要ページへの導線を出す。
import Link from 'next/link'
import SodaShell from '@/components/soda/SodaShell'
import SodaPageHead from '@/components/soda/SodaPageHead'
import SodaIcon from '@/components/soda/SodaIcon'
import { getSiteChrome } from '@/features/site/getSiteChrome'

export default async function NotFound() {
  const chrome = await getSiteChrome()
  return (
    <SodaShell chrome={chrome}>
      <div className="s-wrap">
        <SodaPageHead en="404" title="ページが見つかりませんでした" />
        <div className="s-oops">
          <p>URL が変わったか、削除されたようです。</p>
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
    </SodaShell>
  )
}
