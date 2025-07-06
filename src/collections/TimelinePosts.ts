import { CollectionConfig } from 'payload'
import { fetchUrlMetadata } from '@/lib/urlMetadata'

// タイムライン投稿の前処理
const beforeChangeHook = async ({ req, data, operation }: { req: any; data: any; operation: string }) => {
  try {
    console.log('Timeline beforeChange hook - operation:', operation)
    console.log('Timeline beforeChange hook - data:', data)
    
    // 新規作成または更新時に画像IDを収集
    if (data?.images && Array.isArray(data.images) && data.images.length > 0) {
      const imageIds = data.images
        .filter((img: any) => img?.image)
        .map((img: any) => img.image)

      // タイムライン用の画像IDを一時保存
      req.timelineImageIds = imageIds
      console.log('Timeline beforeChange hook - imageIds:', imageIds)
    }

    return data
  } catch (error) {
    console.error('Timeline beforeChange hook error:', error)
    throw error
  }
}

// タイムライン投稿の後処理
const afterChangeHook = async ({ req, operation, doc }: { req: any; operation: string; doc: any }) => {
  try {
    console.log('Timeline afterChange hook - operation:', operation)
    console.log('Timeline afterChange hook - doc:', doc)
    
    // 保存した画像IDがあれば、それらの画像にフラグを設定
    if (req.timelineImageIds && req.timelineImageIds.length > 0) {
      const payload = req.payload

      // 各画像に対してisTimelineOnlyフラグをtrueに設定
      for (const imageId of req.timelineImageIds) {
        try {
          await payload.update({
            collection: 'media',
            id: imageId,
            data: { isTimelineOnly: true },
          })
          console.log(`画像の更新成功: ${imageId}`)
        } catch (err) {
          console.error(`画像の更新に失敗: ${imageId}`, err)
        }
      }
    }

    return doc
  } catch (error) {
    console.error('Timeline afterChange hook error:', error)
    throw error
  }
}

export const TimelinePosts: CollectionConfig = {
  slug: 'timeline',
  labels: { singular: 'Timeline Post', plural: 'Timeline Posts' },
  admin: { useAsTitle: 'text', defaultColumns: ['text', 'publishedAt'] },
  access: {
    read: () => true, // 全員閲覧可
    create: () => true, // 全員作成可
  },
  hooks: {
    // タイムライン投稿時に自動的に画像に「タイムライン専用」フラグを設定
    beforeChange: [beforeChangeHook],
    afterChange: [afterChangeHook],
  },
  fields: [
    { 
      name: 'text', 
      type: 'richText', 
      required: true
    },
    {
      name: 'embedUrl',
      type: 'text',
      admin: {
        description: 'URLを入力すると自動的にメタデータを取得してプレビューが生成されます'
      },
      hooks: {
        beforeChange: [
          async ({ value, req, data }) => {
            if (value && value.startsWith('http')) {
              try {
                console.log('URL detected for metadata extraction:', value)
                const metadata = await fetchUrlMetadata(value)
                if (metadata) {
                  // URLメタデータを同じドキュメントに保存
                  if (data) {
                    data.urlMetadata = {
                      title: metadata.title,
                      description: metadata.description,
                      image: metadata.image,
                      siteName: metadata.siteName,
                      url: metadata.url
                    }
                  }
                  console.log('URL metadata extracted:', metadata)
                }
              } catch (error) {
                console.error('Error fetching URL metadata:', error)
              }
            }
            return value
          }
        ]
      }
    },
    {
      name: 'urlMetadata',
      type: 'group',
      admin: {
        condition: (data) => !!data.embedUrl
      },
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'image', type: 'text' },
        { name: 'siteName', type: 'text' },
        { name: 'url', type: 'text' }
      ]
    },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
      admin: {
        description: 'タグを追加（カンマ区切り）'
      }
    },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: '通常', value: 'normal' },
        { label: '重要', value: 'important' },
        { label: 'ピン留め', value: 'pinned' }
      ]
    },
    { name: 'publishedAt', type: 'date', defaultValue: () => new Date() },
    {
      name: 'images',
      type: 'array',
      minRows: 0,
      maxRows: 3,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'likes',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
  ],
}
