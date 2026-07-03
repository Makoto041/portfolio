import type { CollectionConfig } from 'payload'
import { anyone, adminOnly } from '@/lib/access'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: { useAsTitle: 'name' },
  access: {
    read: anyone,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'url', type: 'text' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'order', type: 'number', defaultValue: 0 }, // 並び替え用
  ],
}
