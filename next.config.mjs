import { withPayload } from '@payloadcms/next/withPayload'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// CloudFront のドメイン（例: d3abc123xyz.cloudfront.net）を環境変数から取得
const CF_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      // Long-term cache for Next.js static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Allow bfcache by avoiding no-store on HTML; short cache for page data
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=600',
          },
        ],
      },
    ]
  },
  // ① CloudFront 画像を許可
  images: {
    remotePatterns: CF_DOMAIN
      ? [
          {
            protocol: 'https',
            hostname: CF_DOMAIN,
            pathname: '/**',
          },
        ]
      : [],
    domains: CF_DOMAIN ? [CF_DOMAIN] : [],
    // ② WebP / AVIF を自動切替
    formats: ['image/avif', 'image/webp'],
  },

  // 既存設定はそのまま
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
    // ③ alias も既存のまま
    config.resolve.alias['@/payload.config'] = path.resolve(__dirname, 'payload.config.ts')
    return config
  },
}

// withPayload ラッパー
export default withPayload(nextConfig, { devBundleServerPackages: false })
