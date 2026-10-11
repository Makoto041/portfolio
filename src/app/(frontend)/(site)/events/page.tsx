import type { Metadata } from 'next'
import SodaPageHead from '@/components/soda/SodaPageHead'
import SodaCard from '@/components/soda/SodaCard'
import Phrase from '@/components/soda/Phrase'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
import { fetchInEvent } from '@/lib/fetchInEvent'
import { eventCard } from '@/features/site/cardViews'

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
    // og:image は /og（1200×630 生成）を明示指定
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

export default async function EventsPage() {
  const events = await fetchInEvent()

  return (
    <div className="s-wrap">
      <SodaPageHead en="Events" title="イベント" desc="配信・イベントの記録" />
      <div className="s-pbody">
        {events.length === 0 ? (
          <p className="s-empty">予定しているイベントはまだありません</p>
        ) : (
          <div className="s-cgrid">
            {events.map((e) => {
              const card = eventCard(e, false)
              return (
                <div key={card.id}>
                  <SodaCard
                    {...card}
                    title={<Phrase text={card.label} />}
                    sizes="(max-width: 600px) 92vw, (max-width: 1080px) 46vw, 400px"
                  />
                  {e.summary && <p className="s-cnote">{e.summary}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
