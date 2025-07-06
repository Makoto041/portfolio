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
    
    // Content-Typeをチェック
    const contentType = request.headers.get('content-type')
    console.log('Content-Type:', contentType)
    
    let data: any = {}
    
    if (contentType?.includes('application/json')) {
      // JSON形式の場合
      const jsonData = await request.json()
      console.log('JSON data:', jsonData)
      data = jsonData
    } else {
      // FormData形式の場合
      const formData = await request.formData()
      console.log('FormData entries:')
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`)
      }
      
      // PayloadCMS Admin UIの場合、_payloadフィールドにJSONデータが含まれている
      const payloadData = formData.get('_payload')
      if (payloadData) {
        try {
          const parsedData = JSON.parse(payloadData.toString())
          console.log('Parsed _payload data:', parsedData)
          data = parsedData
        } catch (error) {
          console.error('Error parsing _payload data:', error)
        }
      }
      
      // 従来の方法も維持（他のクライアントから直接送信される場合）
      if (Object.keys(data).length === 0) {
        // textフィールドを確実に処理
        const textValue = formData.get('text') || formData.get('Text')
        if (textValue) {
          data.text = textValue.toString()
        }
        
        // publishedAtフィールドを処理
        const publishedAtValue = formData.get('publishedAt')
        if (publishedAtValue) {
          data.publishedAt = publishedAtValue.toString()
        }
        
        // imagesフィールドを処理
        const imagesValue = formData.get('images')
        if (imagesValue) {
          if (typeof imagesValue === 'string') {
            try {
              data.images = JSON.parse(imagesValue)
            } catch {
              data.images = imagesValue
            }
          } else {
            data.images = imagesValue
          }
        }
      }
    }
    
    console.log('Timeline POST data after processing:', data)
    
    const doc = await payload.create({
      collection: 'timeline',
      data,
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('Error creating timeline post:', error)
    return NextResponse.json(
      { error: 'Failed to create timeline post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
