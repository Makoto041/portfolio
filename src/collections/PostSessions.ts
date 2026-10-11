// src/collections/PostSessions.ts
// さっと投稿（/post）にログイン中の端末。1件 = 1台のログイン。
// Cookie には推測できない乱数だけを入れ、ここにはそのハッシュ（tokenHash）だけを保存する。
// 管理画面で削除すると、その端末はすぐに投稿できなくなる（すべて選んで削除 = 全端末からログアウト）。
// 作成・更新はサーバー（/api/quickpost/*）だけが行う。
import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'

const never = () => false

export const PostSessions: CollectionConfig = {
  slug: 'post-sessions',
  labels: { singular: 'ログイン中の端末', plural: 'ログイン中の端末' },
  admin: {
    group: 'さっと投稿',
    useAsTitle: 'name',
    defaultColumns: ['name', 'lastUsedAt', 'expiresAt', 'postCount', 'createdAt'],
    description:
      '投稿ページ（/post）にログイン中の端末です。削除すると、その端末はすぐに投稿できなくなります。すべて選んで削除すれば、全端末からログアウトします。',
  },
  access: {
    read: adminOnly,
    create: never,
    update: never,
    delete: adminOnly,
  },
  fields: [
    { name: 'name', type: 'text', label: '端末', admin: { readOnly: true } },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'ユーザー',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'passkey',
      type: 'relationship',
      relationTo: 'passkeys',
      label: 'ログインに使ったパスキー',
      index: true,
      admin: { readOnly: true },
    },
    {
      // ログイン Cookie の SHA-256。API の応答にも管理画面にも出さない
      name: 'tokenHash',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { read: never },
      admin: { hidden: true },
    },
    {
      // ログインに使った確認値（チャレンジ）の SHA-256。同じ確認値でのログインを2回通さない
      name: 'challengeHash',
      type: 'text',
      unique: true,
      access: { read: never },
      admin: { hidden: true },
    },
    {
      name: 'lastUsedAt',
      type: 'date',
      label: '最後に使った日時',
      required: true,
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: 'ログインの最長期限',
      required: true,
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'lastPostAt',
      type: 'date',
      label: '最後に投稿した日時',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'postCount', type: 'number', label: '投稿数', defaultValue: 0, admin: { readOnly: true } },
    // 回数制限（1時間ごとの枠）
    { name: 'rlWindowStart', type: 'date', access: { read: never }, admin: { hidden: true } },
    { name: 'rlPosts', type: 'number', defaultValue: 0, access: { read: never }, admin: { hidden: true } },
    { name: 'rlPhotos', type: 'number', defaultValue: 0, access: { read: never }, admin: { hidden: true } },
  ],
}
