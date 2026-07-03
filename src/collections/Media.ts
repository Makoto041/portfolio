// src/collections/Media.ts
import type { CollectionConfig } from 'payload'
import { anyone, adminOnly } from '@/lib/access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: anyone,
    create: adminOnly, // アップロードは管理者のみ
    update: adminOnly,
    delete: adminOnly,
  },
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
  ],
}
