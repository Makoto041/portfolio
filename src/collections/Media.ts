import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
    // 原寸サイズのデフォルトフォーマット設定
    formatOptions: {
      format: 'jpeg',
      options: {
        quality: 85,
      },
    },
    imageSizes: [
      {
        name: 'thumbnail',
        width: 320,    // 幅だけ固定 → 高さはアスペクト比維持
        // height: undefined, // 省略可
        formatOptions: {
          format: 'jpeg',     // 生成フォーマット
          options: {
            quality: 60,      // サムネイル品質
          },
        },
      },
      {
        name: 'medium',
        width: 800,
        formatOptions: {
          format: 'jpeg',
          options: {
            quality: 75,      // 中サイズ品質
          },
        },
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: false, // 任意フィールドに
      // defaultValue を外す
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
