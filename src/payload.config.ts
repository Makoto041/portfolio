// payload.config.ts
import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import sharp from 'sharp'

// DB Adapter
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'

// Payload Cloud (optional)
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'

// Rich-text Editor
import { lexicalEditor } from '@payloadcms/richtext-lexical'

// S3 ストレージアダプター
import { s3Storage } from '@payloadcms/storage-s3'

// Collections
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { TimelinePosts } from './collections/TimelinePosts'
import { BlogPosts } from './collections/BlogPosts'
import { BlogMedia } from './collections/BlogMedia'
import Letter from './collections/Letters'
import { Events } from './collections/Events'
import { Products } from './collections/Products'

// Globals
import { SiteSettings } from './globals/SiteSettings'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 自サイトのオリジン（CORS / CSRF 制限用）
// 空文字は || で既定値に落とし、Origin ヘッダーとの突き合わせのため末尾スラッシュを除去
const siteURL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://iwabuchi-makoto.com'
    : 'http://localhost:3000')
).replace(/\/$/, '')

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET!,
  // NOTE: serverURL は設定しない（メディアURLが絶対URL化され toCFUrl の
  // CloudFront 変換を素通りしてしまうため。相対URLのまま扱う）

  // クロスオリジンからのAPI利用・認証Cookie送信を自サイトに限定
  cors: [siteURL],
  csrf: [siteURL],

  // 管理画面の設定
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(__dirname),
    },
  },

  // コレクション定義
  collections: [Users, Media, TimelinePosts, BlogPosts, BlogMedia, Letter, Events, Products],
  
  // グローバル設定
  globals: [SiteSettings],
  // DB 設定
  db: vercelPostgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL!,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  }),

  // リッチテキストエディタ
  editor: lexicalEditor(),

  // TypeScript 型定義の出力先
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },

  // 画像処理ライブラリ
  sharp,

  // プラグインをひとつにまとめる
  plugins: [
    ...(process.env.PAYLOAD_CLOUD === 'true' ? [payloadCloudPlugin()] : []),

    s3Storage({
      bucket: process.env.S3_BUCKET!,
      config: {
        region: process.env.S3_REGION!,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      },
      collections: {
        [Media.slug]: true,
        [BlogMedia.slug]: true,
      },
    }),
  ],
})
