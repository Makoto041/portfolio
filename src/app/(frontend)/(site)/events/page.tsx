import type { Metadata } from 'next'
import MistPageHead from '@/components/mist/MistPageHead'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
import { fetchInEvent } from '@/lib/fetchInEvent'
import EventCard from '@/components/cards/EventCard'

const eventsDescription =
  '岩渕誠（いわぶちまこと）の配信・イベントの記録一覧。Twitch / YouTube などでの配信や現地イベントの情報を公開しています。'

export const metadata: Metadata = {
  // template がブランド接尾辞を付与するため <title> はページ名のみ。og はフル表記
  title: 'イベント一覧',
  description: eventsDescription,
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/events',
  },
  openGraph: {
    title: 'イベント一覧 | 岩渕誠（いわぶちまこと）',
    description: eventsDescription,
    url: 'https://iwabuchi-makoto.com/events',
    siteName: 'いわぶちまこと',
    locale: 'ja_JP',
    type: 'website',
    // og:image は /api/og（1200×630 生成）を明示指定
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'イベント一覧 | 岩渕誠（いわぶちまこと）',
    description: eventsDescription,
    images: [OG_IMAGE_URL],
  },
}
export const revalidate = 60 // ISR: 更新時は各コレクションの afterChange で on-demand 再検証

export default async function InEventPage() {
  const inEvent = await fetchInEvent()

  return (
    <main className="content">
      <MistPageHead cmd="ls ./events" title="Events" desc="配信・イベントの記録" />
      {inEvent.length === 0 && <p className="empty">$ no upcoming events</p>}
      <div className="cardgrid">
        {inEvent.map((e) => (
          <EventCard key={e.id} e={e} />
        ))}
      </div>
    </main>
  )
}
