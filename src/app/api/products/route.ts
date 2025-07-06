import { getPayloadClient } from '@/lib/payloadClient'
import type { Product } from '@/lib/payloadTypes'

export async function GET() {
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      sort: 'order',
      limit: 100,
    })
    
    return Response.json({ docs: docs as Product[] })
  } catch (error) {
    console.error('Products API error:', error)
    return Response.json({ docs: [] }, { status: 500 })
  }
}