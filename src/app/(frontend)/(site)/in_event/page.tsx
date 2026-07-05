import MistPageHead from '@/components/mist/MistPageHead'
import { fetchInEvent } from '@/lib/fetchInEvent'
import EventCard from '@/components/cards/EventCard'

export const metadata = {
  // template がブランド接尾辞を付与するため <title> はページ名のみ。og はフル表記
  title: 'イベント一覧',
  openGraph: { title: 'イベント一覧 | 岩渕誠（いわぶちまこと）' },
}
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
