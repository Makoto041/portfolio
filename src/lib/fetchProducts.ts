import type { Product } from '@/lib/payloadTypes'

export async function fetchProducts(): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_CMS_URL
  if (!base) {
    // サーバーサイドで相対パスfetchはNGなのでエラーを返す
    console.error('NEXT_PUBLIC_CMS_URL is not defined')
    return []
  }
  const url = `${base.replace(/\/$/, '')}/api/products?sort=order&limit=100`
  console.log('Fetching products from:', url)
  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) {
      console.error('Products API response not ok:', res.status, res.statusText)
      return []
    }
    const json = await res.json()
    console.log('Products API response:', json)
    console.log('Products count:', json.docs?.length || 0)
    return json.docs as Product[]
  } catch (e) {
    console.error('fetchProducts error', e)
    
    // フォールバック: サーバーサイドで直接PayloadCMSにアクセス
    if (typeof window === 'undefined') {
      try {
        const { getPayloadClient } = await import('@/lib/payloadClient')
        const payload = await getPayloadClient()
        const { docs } = await payload.find({
          collection: 'products',
          sort: 'order',
          limit: 100,
        })
        console.log('Fallback: Products fetched directly from Payload:', docs.length)
        return docs as Product[]
      } catch (fallbackError) {
        console.error('Fallback fetchProducts error', fallbackError)
      }
    }
    
    return []
  }
}

