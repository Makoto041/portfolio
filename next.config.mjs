import { withPayload } from '@payloadcms/next/withPayload'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // AWS SDK v3 系の依存モジュールを Next.js の Server Components バンドル対象から除外し、
  // ネイティブの require を使わせることで `Cannot find module './xxxx.js'` エラーを防ぐ
  serverExternalPackages: [
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-presigned-post',
    '@smithy/middleware-retry',
    '@smithy/middleware-stack',
    '@smithy/types',
    '@smithy/protocol-http',
    '@smithy/signature-v4',
  ],
  webpack: (config) => {
    // ① 拡張子まで含めた絶対パスを alias に登録
    config.resolve.alias['@/payload.config'] = path.resolve(__dirname, 'payload.config.ts')

    return config
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
