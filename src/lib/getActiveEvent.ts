// lib/getActiveEvent.ts
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import type { Event } from '@/payload-types'

export async function getActiveEvent(): Promise<Event | null> {
  try {
    const payload = await getPayload({ config: configPromise })
    const nowISO = new Date().toISOString()
    
    console.log('getActiveEvent - using direct Payload API')
    console.log('getActiveEvent - nowISO:', nowISO)

    // まず未来のイベントを取得
    const futureEvents = await payload.find({
      collection: 'events',
      where: {
        and: [
          {
            isPublic: {
              equals: true,
            },
          },
          {
            startDate: {
              greater_than: nowISO,
            },
          },
        ],
      },
      sort: 'startDate',
      limit: 1,
    })

    console.log('getActiveEvent - future events found:', futureEvents.docs.length)
    
    if (futureEvents.docs.length > 0) {
      console.log('getActiveEvent - returning future event:', futureEvents.docs[0].title)
      return futureEvents.docs[0]
    }

    // 未来のイベントがない場合は、現在進行中のイベントを取得
    const currentEvents = await payload.find({
      collection: 'events',
      where: {
        and: [
          {
            isPublic: {
              equals: true,
            },
          },
          {
            startDate: {
              less_than_equal: nowISO,
            },
          },
          {
            endDate: {
              greater_than_equal: nowISO,
            },
          },
        ],
      },
      sort: '-startDate',
      limit: 1,
    })

    console.log('getActiveEvent - current events found:', currentEvents.docs.length)
    
    if (currentEvents.docs.length > 0) {
      console.log('getActiveEvent - returning current event:', currentEvents.docs[0].title)
      return currentEvents.docs[0]
    }

    console.log('getActiveEvent - no events found')
    return null
  } catch (e) {
    console.error('getActiveEvent error:', e)
    return null
  }
}
