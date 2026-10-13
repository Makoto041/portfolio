import type { CollectionConfig } from 'payload'
import { anyone, adminOnly, notPendingMedia } from '@/lib/access'
import { makeRevalidate } from '@/lib/revalidate'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: { useAsTitle: 'name' },
  access: {
    read: anyone,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  // プロダクト更新で Home（Products カード）と一覧を再検証
  hooks: makeRevalidate(['/', '/products']),
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'url', type: 'text' },
    // 投稿待ち（さっと投稿で上げて、まだ投稿に使っていない写真）は選べない（24 時間で片付けられるため）
    { name: 'image', type: 'upload', relationTo: 'media', filterOptions: notPendingMedia },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'order', type: 'number', defaultValue: 0 }, // 並び替え用
  ],
}
