import type { GlobalConfig } from 'payload'
import { anyone, adminOnly, notPendingMedia } from '@/lib/access'
import { revalidateAllPages } from '@/lib/revalidate'

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
  // SNS リンク・タグラインは全ページの外枠（フッター・メニュー）に出るため、全ページを再検証する
  hooks: {
    afterChange: [
      async ({ doc }) => {
        // 再検証失敗が保存操作の失敗として管理画面に伝播しないよう握りつぶす
        try {
          await revalidateAllPages()
        } catch (e) {
          console.error('SiteSettings revalidate failed:', e)
        }
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
          // 投稿待ち（さっと投稿で上げて、まだ投稿に使っていない写真）は選べない（24 時間で片付けられるため）
          filterOptions: notPendingMedia,
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
            description: 'ホームの題字のカバーライン（ロゴ「MAKOTO」の上、PC は右）とメニューに表示される日本語コピー',
          },
        },
        {
          name: 'roleEn',
          type: 'text',
          label: 'ロール（英字）',
          defaultValue: '— web engineer, tokyo',
          admin: {
            description: 'カバーラインの「LIFE LOG」に続けて表示する英字（例: — tokyo）',
          },
        },
      ],
    },
    {
      name: 'spotify',
      type: 'group',
      label: 'Spotify',
      fields: [
        {
          name: 'playlistUrl',
          type: 'text',
          label: 'プレイリスト/アルバムURL',
          admin: {
            description:
              'Spotify の共有URL（例: https://open.spotify.com/playlist/XXXX）。設定するとプロフィールページに埋め込み表示されます。',
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