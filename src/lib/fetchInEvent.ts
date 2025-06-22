import type { Event } from '@/lib/payloadTypes'

export async function fetchInEvent(): Promise<Event[]> {
  const base = process.env.NEXT_PUBLIC_CMS_URL ?? ''
  const url = base
    ? `${base.replace(/\/$/, '')}/api/events?where[isPublic][equals]=true&sort=-startDate`
    : '/api/events?where[isPublic][equals]=true&sort=-startDate'
  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const json = await res.json()
    return json.docs as Event[]
  } catch (e) {
    console.error('fetchInEvent error', e)
    return []
  }
}
