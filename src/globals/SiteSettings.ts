import type { GlobalConfig } from 'payload'
import { anyone, adminOnly } from '@/lib/access'
import { revalidatePaths } from '@/lib/revalidate'

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
  // hero/プロフィール/Spotify 設定の変更で Home とプロフィールを再検証
  hooks: {
    afterChange: [
      async ({ doc }) => {
        await revalidatePaths(['/', '/profile'])
        return doc
      },
    ],
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
      name: 'hero',
      type: 'group',
      label: 'トップページ ヒーロー',
      fields: [
        {
          name: 'tagline',
          type: 'text',
          label: 'タグライン',
          defaultValue: '日々の記録、ときどき写真。つぶやきくらいの気軽さで。',
          admin: {
            description: 'ヒーロー大型ワードマーク直下に表示される日本語コピー',
          },
        },
        {
          name: 'roleEn',
          type: 'text',
          label: 'ロール（英字）',
          defaultValue: '— web engineer, tokyo',
          admin: {
            description: 'タグライン横に添える英字ロール',
          },
        },
      ],
    },
    {
      name: 'spotify',
      type: 'group',
      label: '右レール Spotify',
      fields: [
        {
          name: 'playlistUrl',
          type: 'text',
          label: 'プレイリスト/アルバムURL',
          admin: {
            description:
              'Spotify の共有URL（例: https://open.spotify.com/playlist/XXXX）。設定するとトップページ右レールに埋め込み表示されます。未設定ならリンク一覧を表示。',
          },
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