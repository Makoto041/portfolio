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

export async function POST(request: Request) {
  try {
    const payload = await getPayloadClient()
    const formData = await request.formData()
    
    const data: any = {}
    for (const [key, value] of formData.entries()) {
      data[key] = value
    }
    
    const doc = await payload.create({
      collection: 'timeline',
      data,
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('Error creating timeline post:', error)
    return NextResponse.json(
      { error: 'Failed to create timeline post' },
      { status: 500 }
    )
  }
}
