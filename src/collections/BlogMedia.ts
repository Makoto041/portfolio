// src/collections/BlogMedia.ts
import type { CollectionConfig } from 'payload'

export const BlogMedia: CollectionConfig = {
  slug: 'blogMedia',
  upload: true, // enable uploads
  access: {
    read: () => true,
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
