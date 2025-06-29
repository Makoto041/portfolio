// lib/getActiveEvent.ts
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import type { Event } from '@/payload-types'

export async function getActiveEvent(): Promise<Event | null> {
  try {
    const payload = await getPayload({ config: configPromise })
    const now = new Date()
    const nowISO = now.toISOString()
    
    console.log('getActiveEvent - using direct Payload API')
    console.log('getActiveEvent - nowISO:', nowISO)

    // 全ての公開イベントを取得
    const allEvents = await payload.find({
      collection: 'events',
      where: {
        isPublic: {
          equals: true,
        },
      },
      sort: 'startDate',
    })

    console.log('getActiveEvent - all events found:', allEvents.docs.length)

    if (allEvents.docs.length === 0) {
      console.log('getActiveEvent - no events found')
      return null
    }

    // 現在日時に最も近いイベントを見つける
    let closestEvent: Event | null = null
    let smallestTimeDiff = Infinity

    for (const event of allEvents.docs) {
      const startDate = new Date(event.startDate)
      const endDate = event.endDate ? new Date(event.endDate) : null
      
      // 進行中のイベントは最優先
      if (startDate <= now && (!endDate || endDate >= now)) {
        console.log('getActiveEvent - returning current event:', event.title)
        return event
      }
      
      // 未来のイベントの場合、現在時刻との差を計算
      if (startDate > now) {
        const timeDiff = startDate.getTime() - now.getTime()
        if (timeDiff < smallestTimeDiff) {
          smallestTimeDiff = timeDiff
          closestEvent = event
        }
      }
    }

    if (closestEvent) {
      console.log('getActiveEvent - returning closest future event:', closestEvent.title)
      return closestEvent
    }

    console.log('getActiveEvent - no suitable events found')
    return null
  } catch (e) {
    console.error('getActiveEvent error:', e)
    return null
  }
}
