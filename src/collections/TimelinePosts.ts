import { CollectionConfig } from 'payload'
import type { CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload'
import { fetchUrlMetadata } from '@/lib/urlMetadata'
import { extractUrlsFromRichText } from '@/lib/urlExtractor'
import { anyone, adminOnly } from '@/lib/access'
import { makeRevalidate, TIMELINE_PAGES } from '@/lib/revalidate'

// タイムライン更新で Home（ダイジェスト/entries/streak）と専用タブを再検証
const revalidateTimeline = makeRevalidate(TIMELINE_PAGES)

interface TimelineData {
  text?: unknown
  images?: Array<{ image?: string }>
  embedUrl?: string
  urlMetadata?: {
    title?: string
    description?: string
    image?: string
    siteName?: string
    url?: string
  }
}

// タイムライン投稿の前処理
const beforeChangeHook: CollectionBeforeChangeHook = async ({ req, data }) => {
  try {
    // 新規作成または更新時に画像IDを収集
    const timelineData = data as TimelineData
    if (timelineData?.images && Array.isArray(timelineData.images) && timelineData.images.length > 0) {
      const imageIds = timelineData.images
        .filter((img) => img?.image)
        .map((img) => img.image)

      // タイムライン用の画像IDを一時保存
      ;(req as any).timelineImageIds = imageIds
    }

    // リッチテキストからURLを自動検出してメタデータを取得
    if (timelineData?.text && !timelineData?.embedUrl) {
      try {
        const urls = extractUrlsFromRichText(timelineData.text as any)

        if (urls.length > 0) {
          // 最初のURLを使用してメタデータを取得
          const firstUrl = urls[0]
          const metadata = await fetchUrlMetadata(firstUrl)
          if (metadata) {
            timelineData.embedUrl = firstUrl
            timelineData.urlMetadata = {
              title: metadata.title,
              description: metadata.description,
              image: metadata.image,
              siteName: metadata.siteName,
              url: metadata.url
            }
          }
        }
      } catch (error) {
        console.error('Error auto-extracting URL metadata:', error)
      }
    }

    return data
  } catch (error) {
    console.error('Timeline beforeChange hook error:', error)
    throw error
  }
}

// タイムライン投稿の後処理
const afterChangeHook: CollectionAfterChangeHook = async ({ req, doc }) => {
  try {
    // 保存した画像IDがあれば、それらの画像にフラグを設定
    if ((req as any).timelineImageIds && (req as any).timelineImageIds.length > 0) {
      const payload = req.payload

      // 各画像に対してisTimelineOnlyフラグをtrueに設定（さっと投稿の「投稿待ち」も外して公開する）
      // req を渡して投稿の保存と同じトランザクションで更新する。渡さないと別トランザクションになり、
      // 投稿側が保持する画像行のロック（images の外部キー）を待ち続けて保存が止まる
      for (const imageId of (req as any).timelineImageIds) {
        const transactionBefore = req.transactionID
        try {
          await payload.update({
            collection: 'media',
            id: imageId,
            data: { isTimelineOnly: true, pending: false },
            req,
          })
        } catch (err) {
          console.error(`画像の更新に失敗: ${imageId}`, err)
          // 失敗した更新はトランザクションごと取り消す（投稿も保存されない）。そのときは成功として返さない
          if (transactionBefore && !req.transactionID) throw err
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
    read: anyone, // 閲覧は公開
    create: adminOnly, // 投稿は管理者のみ
    update: adminOnly, // 編集は管理者のみ
    delete: adminOnly, // 削除は管理者のみ
  },
  hooks: {
    // タイムライン投稿時に自動的に画像に「タイムライン専用」フラグを設定
    beforeChange: [beforeChangeHook],
    afterChange: [...revalidateTimeline.afterChange, afterChangeHook], // 再検証を先に（画像フラグ処理が例外でもキャッシュを更新）
    afterDelete: [...revalidateTimeline.afterDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'タイトル',
      admin: {
        description: '任意。入力するとカードの見出しとして表示されます',
      },
    },
    {
      name: 'postType',
      type: 'select',
      label: '投稿タイプ',
      defaultValue: 'diary',
      options: [
        { label: '日記', value: 'diary' },
        { label: '技術メモ', value: 'tech' },
        { label: '写真', value: 'photo' },
        { label: '制作ログ', value: 'making' },
        { label: 'イベント記録', value: 'event' },
        { label: '旅行記', value: 'travel' },
        { label: '学習ログ', value: 'study' },
      ],
    },
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
          async ({ value, data }) => {
            if (value && value.startsWith('http')) {
              try {
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
      name: 'related',
      type: 'group',
      label: '関連リンク',
      admin: {
        description: '関連するイベント・記事・制作物があれば紐付けられます',
      },
      fields: [
        { name: 'event', type: 'relationship', relationTo: 'events', label: '関連イベント' },
        { name: 'post', type: 'relationship', relationTo: 'blogPosts', label: '関連記事' },
        { name: 'product', type: 'relationship', relationTo: 'products', label: '関連制作物' },
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
