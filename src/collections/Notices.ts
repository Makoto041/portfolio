// src/collections/Notices.ts
// お知らせ（NOTICE）コレクション。トップページの統合バーで日付+メッセージを
// 新しい順にローテーション表示する（docs/CHANGELOG.md §3 参照）。
import type { CollectionConfig } from 'payload'
import { anyone, adminOnly } from '@/lib/access'

export const Notices: CollectionConfig = {
  slug: 'notices',
  labels: {
    singular: 'お知らせ',
    plural: 'お知らせ',
  },
  admin: {
    useAsTitle: 'body',
    defaultColumns: ['date', 'body', 'isPublic'],
    group: 'コンテンツ',
  },
  defaultSort: '-date',
  access: {
    read: anyone,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'date',
      type: 'date',
      required: true,
      label: '日付',
      admin: {
        description: 'バーに「12.06」形式で表示されます',
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'body',
      type: 'text',
      required: true,
      label: 'メッセージ',
      admin: {
        description: '例: アドベントカレンダー執筆中です',
      },
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: true,
      label: '公開',
    },
  ],
}
