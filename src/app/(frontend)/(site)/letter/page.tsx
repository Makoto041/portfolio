// src/app/(frontend)/(site)/letter/page.tsx
import type { Metadata } from 'next'
import SodaPageHead from '@/components/soda/SodaPageHead'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
import LetterForm from './LetterForm'

// 外枠（フッター・メニュー）にサイト設定を出すため、他のページと同じく ISR にする
// （設定変更時は SiteSettings の afterChange が全ページを再検証する）
export const revalidate = 60

const letterDescription = '岩渕誠（いわぶちまこと）へのお便り・メッセージはこちらから。感想やおしらせ、なんでもどうぞ。'

export const metadata: Metadata = {
  // template が「| 岩渕誠（いわぶちまこと）」を付与するためページ名のみ
  title: 'お便り',
  description: letterDescription,
  openGraph: {
    title: 'お便り | 岩渕誠（いわぶちまこと）',
    description: letterDescription,
    url: 'https://iwabuchi-makoto.com/letter',
    siteName: 'いわぶちまこと',
    locale: 'ja_JP',
    type: 'website',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'お便り | 岩渕誠（いわぶちまこと）',
    description: letterDescription,
    images: [OG_IMAGE_URL],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/letter',
  },
}

export default function LetterPage() {
  return (
    <div className="s-wrap">
      <SodaPageHead en="Letter" title="お便り" desc="感想・おしらせ・なんでもどうぞ" />
      <div className="s-pbody s-letter">
        <LetterForm />
      </div>
    </div>
  )
}
