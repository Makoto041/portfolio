// src/app/api/timelineGET/route.ts
import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payloadClient'
import type { TimelineDoc } from '@/lib/payloadTypes'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '10', 10)

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'timeline',
    page,
    limit,
    sort: '-publishedAt',
  })

  return NextResponse.json(docs as unknown as TimelineDoc[])
}
