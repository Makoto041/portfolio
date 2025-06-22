// lib/getActiveEvent.ts
export async function getActiveEvent() {
  const nowISO = new Date().toISOString()

  // ① 公開フラグ on ② startDate <= 今日 ③ endDate が無い or endDate >= 今日
  const qs = new URLSearchParams({
    'where[isPublic][equals]': 'true',
    'where[startDate][less_than_equal]': nowISO,
    'where[endDate][greater_than_equal]': nowISO,
    sort: '-startDate',
    limit: '1',
  }).toString()

  // dev / preview で NEXT_PUBLIC_CMS_URL が未設定の場合は同一オリジンを使用
const baseUrl = process.env.NEXT_PUBLIC_CMS_URL
if (!baseUrl) {
  console.error('NEXT_PUBLIC_CMS_URL is not defined')
  return null
}
const url = `${baseUrl.replace(/\/$/, '')}/api/events?${qs}`

try {
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return null
  const json = await res.json()
  return json.docs?.[0] ?? null
} catch (e) {
  console.error('getActiveEvent fetch error:', e)
  return null
}
}
