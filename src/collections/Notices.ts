// src/collections/Notices.ts
// お知らせ（NOTICE）コレクション。トップページの統合バーで日付+メッセージを
// 新しい順にローテーション表示する（docs/CHANGELOG.md §3 参照）。
import type { Access, CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'

// 未ログインには公開分（isPublic:true）のみ返す。ログイン（管理者）は全件。
// UI 側の where ではなくアクセス制御で非公開お知らせを保護する。
const readPublicOnly: Access = ({ req: { user } }) =>
  user ? true : { isPublic: { equals: true } }

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
    read: readPublicOnly,
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
