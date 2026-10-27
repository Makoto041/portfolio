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
import { Notices } from './collections/Notices'
import { Passkeys } from './collections/Passkeys'
import { PostSessions } from './collections/PostSessions'
import { QuickpostNonces } from './collections/QuickpostNonces'

// Globals
import { SiteSettings } from './globals/SiteSettings'
import { SITE_URL } from './lib/siteUrl'
import { adminLoginSlug } from './lib/adminGate'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 自サイトのオリジン（CORS / CSRF 制限用。src/lib/siteUrl.ts でさっと投稿の送信元チェックと共有）
const siteURL = SITE_URL

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
    // ログイン画面の URL は /admin/<ADMIN_LOGIN_SLUG>（狙われやすい /admin/login を使わない）。
    // 門番は src/middleware.ts。未設定・使えない値のときは既定の /admin/login のまま（本番ではどのみち門番が閉じる）
    routes: { login: adminLoginSlug() ? `/${adminLoginSlug()}` : '/login' },
    importMap: {
      baseDir: path.resolve(__dirname),
    },
  },

  // コレクション定義
  collections: [
    Users,
    Media,
    TimelinePosts,
    BlogPosts,
    BlogMedia,
    Letter,
    Events,
    Products,
    Notices,
    // さっと投稿（/post）のパスキー・ログイン中の端末・1回きりの記録
    Passkeys,
    PostSessions,
    QuickpostNonces,
  ],
  
  // グローバル設定
  globals: [SiteSettings],
  // DB 設定
  db: vercelPostgresAdapter({
    // pnpm dev がコレクションの変更を DB の表へそのまま反映する（Payload の dev mode の push）のは
    // PAYLOAD_DEV_PUSH=true のときだけ。.env が本番を指していても、表や列を変えたり消したりしないように既定は止める
    push: process.env.PAYLOAD_DEV_PUSH === 'true',
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
