// src/collections/BlogMedia.ts
import type { CollectionConfig } from 'payload'
import { anyone, adminOnly } from '@/lib/access'

export const BlogMedia: CollectionConfig = {
  slug: 'blogMedia',
  upload: true, // enable uploads
  access: {
    read: anyone,
    create: adminOnly, // アップロードは管理者のみ
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    // you can add more metadata fields here if needed
  ],
}
