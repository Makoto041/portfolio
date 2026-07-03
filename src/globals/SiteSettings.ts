import type { GlobalConfig } from 'payload'
import { anyone, adminOnly } from '@/lib/access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'サイト設定',
  admin: {
    group: '設定',
  },
  access: {
    read: anyone,
    update: adminOnly, // サイト設定の変更は管理者のみ
  },
  fields: [
    {
      name: 'profile',
      type: 'group',
      label: 'プロフィール設定',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: '名前',
          defaultValue: 'Makoto Iwabuchi',
          required: true,
        },
        {
          name: 'nameJapanese',
          type: 'text',
          label: '日本語名',
          defaultValue: 'いわぶちまこと',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          label: '肩書き',
          defaultValue: 'ウェブエンジニア',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
          label: '自己紹介',
          defaultValue: 'ウェブエンジニア／フロントエンド好き。Payload CMS × Next.jsでポートフォリオサイトを構築しています。',
          required: true,
        },
        {
          name: 'profileImage',
          type: 'upload',
          relationTo: 'media',
          label: 'プロフィール画像',
          required: true,
        },
        {
          name: 'socialLinks',
          type: 'array',
          label: 'ソーシャルリンク',
          minRows: 2,
          maxRows: 10,
          defaultValue: [
            { platform: 'twitter', url: 'https://x.com/iwabuchi', displayName: 'X' },
            { platform: 'instagram', url: 'https://instagram.com/makoto0140', displayName: 'Instagram' },
          ],
          fields: [
            {
              name: 'platform',
              type: 'select',
              label: 'プラットフォーム',
              options: [
                { label: 'Twitter/X', value: 'twitter' },
                { label: 'Instagram', value: 'instagram' },
                { label: 'GitHub', value: 'github' },
                { label: 'LinkedIn', value: 'linkedin' },
                { label: 'YouTube', value: 'youtube' },
                { label: 'その他', value: 'other' },
              ],
              required: true,
            },
            {
              name: 'url',
              type: 'text',
              label: 'URL',
              required: true,
            },
            {
              name: 'displayName',
              type: 'text',
              label: '表示名',
              admin: {
                condition: (data) => data.platform === 'other',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      label: 'SEO設定',
      fields: [
        {
          name: 'siteTitle',
          type: 'text',
          label: 'サイトタイトル',
          defaultValue: 'いわぶち | 個人ポートフォリオサイト',
          required: true,
        },
        {
          name: 'siteDescription',
          type: 'textarea',
          label: 'サイト説明',
          defaultValue: 'いわぶちの個人ポートフォリオサイト。日記、ブログ、写真ギャラリーなど日々の活動や作品を公開しています。',
          required: true,
        },
        {
          name: 'siteUrl',
          type: 'text',
          label: 'サイトURL',
          defaultValue: 'https://iwabuchi-makoto.com',
          required: true,
        },
        {
          name: 'twitterHandle',
          type: 'text',
          label: 'Twitterハンドル（@なし）',
          defaultValue: 'iwabuchi',
        },
      ],
    },
  ],
}