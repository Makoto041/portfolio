import { fetchInEvent } from '@/lib/fetchInEvent'
import EventCard from '@/components/cards/EventCard'
import Breadcrumb from '@/components/layout/Breadcrumb'

export const metadata = { title: 'イベント一覧 - いわぶちまこと' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

const WRAP = 'mx-auto w-full max-w-[58rem] px-5 sm:px-8 section-pad'

export default async function InEventPage() {
  const inEvent = await fetchInEvent()

  return (
    <main className="min-h-screen flex flex-col">
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>
      <section className={WRAP}>
        <h1 className="text-3xl font-semibold mb-8 text-gray-900 dark:text-white">Events</h1>
        {inEvent.length === 0 && <p className="text-gray-700 dark:text-gray-300">現在予定されているイベントはありません。</p>}
        <div className="grid gap-6 sm:grid-cols-2">
          {inEvent.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </div>
      </section>
    </main>
  )
}
