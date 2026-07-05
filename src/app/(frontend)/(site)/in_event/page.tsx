import PageHeader from '@/components/layout/PageHeader'
import { fetchInEvent } from '@/lib/fetchInEvent'
import EventCard from '@/components/cards/EventCard'

export const metadata = { title: 'イベント一覧 | 岩渕誠（いわぶちまこと）' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function InEventPage() {
  const inEvent = await fetchInEvent()

  return (
    <main className="pb-16">
      <PageHeader title="Events" description="配信・イベントの記録" />
      {inEvent.length === 0 && <p className="text-muted">現在予定されているイベントはありません。</p>}
      <div className="grid gap-6 sm:grid-cols-2">
        {inEvent.map((e) => (
          <EventCard key={e.id} e={e} />
        ))}
      </div>
    </main>
  )
}
