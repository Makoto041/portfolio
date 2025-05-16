import { CollectionConfig } from 'payload'

export const TimelinePosts: CollectionConfig = {
  slug: 'timeline',
  labels: { singular: 'Timeline Post', plural: 'Timeline Posts' },
  admin: { useAsTitle: 'text', defaultColumns: ['text', 'publishedAt'] },
  access: { read: () => true }, // 全員閲覧可
  fields: [
    { name: 'text', type: 'textarea', required: true, maxLength: 280 },
    { name: 'publishedAt', type: 'date', defaultValue: () => new Date() },
  ],
}
