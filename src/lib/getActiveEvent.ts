// lib/getActiveEvent.ts
export async function getActiveEvent() {
  const nowISO = new Date().toISOString()

  // Vercel本番環境では NEXT_PUBLIC_CMS_URL、開発環境では同一オリジンを使用
  const baseUrl = process.env.NEXT_PUBLIC_CMS_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000'
  
  console.log('getActiveEvent - baseUrl:', baseUrl)
  console.log('getActiveEvent - nowISO:', nowISO)

  try {
    // まず未来のイベントを取得
    const futureQs = new URLSearchParams({
      'where[isPublic][equals]': 'true',
      'where[startDate][greater_than]': nowISO,
      sort: 'startDate',
      limit: '1',
    }).toString()

    const futureUrl = `${baseUrl.replace(/\/$/, '')}/api/events?${futureQs}`
    console.log('getActiveEvent - futureUrl:', futureUrl)
    
    const futureRes = await fetch(futureUrl, { 
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log('getActiveEvent - futureRes status:', futureRes.status)
    
    if (futureRes.ok) {
      const futureJson = await futureRes.json()
      console.log('getActiveEvent - future events found:', futureJson.docs?.length || 0)
      if (futureJson.docs?.[0]) {
        console.log('getActiveEvent - returning future event:', futureJson.docs[0].title)
        return futureJson.docs[0]
      }
    } else {
      console.error('getActiveEvent - future fetch failed:', await futureRes.text())
    }

    // 未来のイベントがない場合は、現在進行中のイベントを取得
    const currentQs = new URLSearchParams({
      'where[isPublic][equals]': 'true',
      'where[startDate][less_than_equal]': nowISO,
      'where[endDate][greater_than_equal]': nowISO,
      sort: '-startDate',
      limit: '1',
    }).toString()

    const currentUrl = `${baseUrl.replace(/\/$/, '')}/api/events?${currentQs}`
    console.log('getActiveEvent - currentUrl:', currentUrl)
    
    const currentRes = await fetch(currentUrl, { 
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log('getActiveEvent - currentRes status:', currentRes.status)
    
    if (currentRes.ok) {
      const currentJson = await currentRes.json()
      console.log('getActiveEvent - current events found:', currentJson.docs?.length || 0)
      if (currentJson.docs?.[0]) {
        console.log('getActiveEvent - returning current event:', currentJson.docs[0].title)
      }
      return currentJson.docs?.[0] ?? null
    } else {
      console.error('getActiveEvent - current fetch failed:', await currentRes.text())
    }

    console.log('getActiveEvent - no events found')
    return null
  } catch (e) {
    console.error('getActiveEvent fetch error:', e)
    return null
  }
}
