import type { Product } from '@/lib/payloadTypes'

export async function fetchProducts(): Promise<Product[]> {
  // サーバーサイドでは直接PayloadCMSを使用
  if (typeof window === 'undefined') {
    try {
      const { getPayloadClient } = await import('@/lib/payloadClient')
      const payload = await getPayloadClient()
      const { docs } = await payload.find({
        collection: 'products',
        sort: 'order',
        limit: 100,
      })
      console.log('Products fetched directly from Payload:', docs.length)
      return docs as Product[]
    } catch (error) {
      console.error('Direct fetchProducts error', error)
      return []
    }
  }

  // クライアントサイドではAPIエンドポイント経由
  let base = process.env.NEXT_PUBLIC_CMS_URL
  
  if (!base || base.includes('localhost')) {
    base = window.location.origin
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
    console.error('fetchProducts API error', e)
    return []
  }
}

