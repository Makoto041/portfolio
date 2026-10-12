import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import type { Event } from '@/payload-types'

export async function fetchInEvent(): Promise<Event[]> {
  try {
    const payload = await getPayload({ config: configPromise })

    const events = await payload.find({
      collection: 'events',
      where: {
        isPublic: {
          equals: true,
        },
      },
      sort: '-startDate',
    })

    return events.docs
  } catch (e) {
    console.error('fetchInEvent error:', e)
    return []
  }
}
