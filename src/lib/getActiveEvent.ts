// lib/getActiveEvent.ts
export async function getActiveEvent() {
  const nowISO = new Date().toISOString()

  // dev / preview で NEXT_PUBLIC_CMS_URL が未設定の場合は同一オリジンを使用
  const baseUrl = process.env.NEXT_PUBLIC_CMS_URL
  if (!baseUrl) {
    console.error('NEXT_PUBLIC_CMS_URL is not defined')
    return null
  }

  try {
    // まず未来のイベントを取得
    const futureQs = new URLSearchParams({
      'where[isPublic][equals]': 'true',
      'where[startDate][greater_than]': nowISO,
      sort: 'startDate',
      limit: '1',
    }).toString()

    const futureUrl = `${baseUrl.replace(/\/$/, '')}/api/events?${futureQs}`
    const futureRes = await fetch(futureUrl, { next: { revalidate: 60 } })
    
    if (futureRes.ok) {
      const futureJson = await futureRes.json()
      if (futureJson.docs?.[0]) {
        return futureJson.docs[0]
      }
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
    const currentRes = await fetch(currentUrl, { next: { revalidate: 60 } })
    
    if (currentRes.ok) {
      const currentJson = await currentRes.json()
      return currentJson.docs?.[0] ?? null
    }

    return null
  } catch (e) {
    console.error('getActiveEvent fetch error:', e)
    return null
  }
}
