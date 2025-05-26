import { CollectionConfig } from 'payload'

// タイムライン投稿の前処理
const beforeChangeHook = async ({ req, data, operation }: { req: any; data: any; operation: string }) => {
  // 新規作成または更新時に画像IDを収集
  if (data?.images && Array.isArray(data.images) && data.images.length > 0) {
    const imageIds = data.images
      .filter((img: any) => img?.image)
      .map((img: any) => img.image)

    // タイムライン用の画像IDを一時保存
    req.timelineImageIds = imageIds
  }

  return data
}

// タイムライン投稿の後処理
const afterChangeHook = async ({ req, operation, doc }: { req: any; operation: string; doc: any }) => {
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
      } catch (err) {
        console.error(`画像の更新に失敗: ${imageId}`, err)
      }
    }
  }

  return doc
}

export const TimelinePosts: CollectionConfig = {
  slug: 'timeline',
  labels: { singular: 'Timeline Post', plural: 'Timeline Posts' },
  admin: { useAsTitle: 'text', defaultColumns: ['text', 'publishedAt'] },
  access: { read: () => true }, // 全員閲覧可
  hooks: {
    // タイムライン投稿時に自動的に画像に「タイムライン専用」フラグを設定
    beforeChange: [beforeChangeHook],
    afterChange: [afterChangeHook],
  },
  fields: [
    { name: 'text', type: 'textarea', required: true, maxLength: 280 },
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
