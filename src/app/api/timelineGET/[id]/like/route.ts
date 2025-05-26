// src/app/api/timelineGET/[id]/like/route.ts
import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payloadClient'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const payload = await getPayloadClient()
  const doc = await payload.findByID({ collection: 'timeline', id })
  const likes = (doc.likes ?? 0) + 1

  await payload.update({
    collection: 'timeline',
    id,
    data: { likes },
  })

  return NextResponse.json({ likes })
}
