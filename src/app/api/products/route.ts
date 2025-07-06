import { NextResponse } from 'next/server'
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

export async function POST(request: Request) {
  try {
    const payload = await getPayloadClient()
    
    // Content-Typeをチェック
    const contentType = request.headers.get('content-type')
    console.log('Products POST Content-Type:', contentType)
    
    let data: any = {}
    
    if (contentType?.includes('application/json')) {
      // JSON形式の場合
      const jsonData = await request.json()
      console.log('Products JSON data:', jsonData)
      data = jsonData
    } else if (contentType?.includes('multipart/form-data')) {
      // FormData形式の場合
      const formData = await request.formData()
      console.log('Products FormData entries:')
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`)
      }
      
      // PayloadCMS Admin UIの場合、_payloadフィールドにJSONデータが含まれている
      const payloadData = formData.get('_payload')
      if (payloadData) {
        try {
          const parsedData = JSON.parse(payloadData.toString())
          console.log('Products Parsed _payload data:', parsedData)
          data = parsedData
        } catch (error) {
          console.error('Error parsing _payload data:', error)
        }
      }
      
      // 従来の方法も維持（他のクライアントから直接送信される場合）
      if (Object.keys(data).length === 0) {
        // 通常のフィールドを処理
        const name = formData.get('name')
        const description = formData.get('description')
        const url = formData.get('url')
        const order = formData.get('order')
        const tags = formData.get('tags')
        
        if (name) data.name = name.toString()
        if (description) data.description = description.toString()
        if (url) data.url = url.toString()
        if (order) data.order = parseInt(order.toString(), 10)
        if (tags) {
          // タグは配列として処理
          data.tags = tags.toString().split(',').map(tag => tag.trim()).filter(tag => tag)
        }
      }
    }
    
    console.log('Products POST data after processing:', data)
    
    const doc = await payload.create({
      collection: 'products',
      data,
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}