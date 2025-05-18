// src/collections/Letter.ts
import { CollectionConfig } from 'payload'

const Letter: CollectionConfig = {
  slug: 'letter',
  labels: {
    singular: 'Letter',
    plural: 'Letters',
  },
  access: {
    read: () => true, // 全員閲覧可（必要に応じて制限）
    create: () => true, // フォームからの投稿を許可
    update: () => false, // 管理画面でのみ編集可
    delete: () => false,
  },
  fields: [
    {
      name: 'name',
      label: 'お名前',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'メールアドレス',
      type: 'email',
      required: true,
    },
    {
      name: 'message',
      label: 'メッセージ',
      type: 'textarea',
      required: true,
    },
    {
      name: 'createdAt',
      label: '送信日時',
      type: 'date',
      admin: {
        readOnly: true,
      },
      defaultValue: () => new Date().toISOString(),
    },
  ],
}

export default Letter
