// src/collections/Media.ts
import type { CollectionConfig } from 'payload'
import { adminOnly, publishedMediaOnly } from '@/lib/access'
import { makeRevalidate } from '@/lib/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    // さっと投稿で上げて、まだ投稿に使っていない写真（pending）は、ログインしていない人には見せない
    read: publishedMediaOnly,
    create: adminOnly, // アップロードは管理者のみ
    update: adminOnly,
    delete: adminOnly,
  },
  // 画像追加/削除で Home（Gallery/ストリーム）とギャラリー一覧を再検証
  hooks: makeRevalidate(['/', '/gallery']),
  upload: true, // ← S3 保存の紐付けは payload.config.ts 側のプラグイン設定で行うので、ここには不要です
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: false,
    },
    {
      name: 'isTimelineOnly',
      type: 'checkbox',
      label: 'タイムライン専用画像',
      defaultValue: false,
      admin: {
        description:
          'チェックを入れるとギャラリーには表示されず、タイムラインのみに表示される画像になります',
      },
    },
    {
      name: 'pending',
      type: 'checkbox',
      label: '投稿待ち（さっと投稿）',
      defaultValue: false,
      admin: {
        description:
          'さっと投稿で上げて、まだ投稿に使っていない写真。投稿に使われるまで、公開の一覧や API には出ません（チェックを外すと公開されます）',
      },
    },
  ],
}
