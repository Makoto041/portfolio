import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: { useAsTitle: 'name' },
  access: { read: () => true },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'url', type: 'text' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'order', type: 'number', defaultValue: 0 }, // 並び替え用
  ],
}
