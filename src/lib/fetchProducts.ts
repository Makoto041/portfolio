import type { Product } from '@/lib/payloadTypes'

export async function fetchProducts(): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_CMS_URL
  if (!base) {
    // サーバーサイドで相対パスfetchはNGなのでエラーを返す
    console.error('NEXT_PUBLIC_CMS_URL is not defined')
    return []
  }
  const url = `${base.replace(/\/$/, '')}/api/products?sort=order`
  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const json = await res.json()
    return json.docs as Product[]
  } catch (e) {
    console.error('fetchProducts error', e)
    return []
  }
}

