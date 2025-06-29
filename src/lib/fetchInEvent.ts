import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import type { Event } from '@/payload-types'

export async function fetchInEvent(): Promise<Event[]> {
  try {
    const payload = await getPayload({ config: configPromise })
    
    console.log('fetchInEvent - using direct Payload API')
    
    const events = await payload.find({
      collection: 'events',
      where: {
        isPublic: {
          equals: true,
        },
      },
      sort: '-startDate',
    })

    console.log('fetchInEvent - events found:', events.docs.length)
    return events.docs
  } catch (e) {
    console.error('fetchInEvent error:', e)
    return []
  }
}
