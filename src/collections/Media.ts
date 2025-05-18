import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
    // bulkUpload: true はデフォルトで有効
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: false, // 任意フィールドに
      // defaultValue を外す
    },
  ],
}
