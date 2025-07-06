import { withPayload } from '@payloadcms/next/withPayload'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// CloudFront のドメイン（例: d3abc123xyz.cloudfront.net）を環境変数から取得
const CF_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN

/** @type {import('next').NextConfig} */
const nextConfig = {
  // SEO とパフォーマンス向上のための追加設定
  compress: true, // gzip圧縮を有効化
  poweredByHeader: false, // X-Powered-By ヘッダーを無効化（セキュリティ向上）
  
  // 実験的機能（パフォーマンス向上）
  experimental: {
    scrollRestoration: true, // スクロール位置復元
  },

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
      // SEO向けセキュリティヘッダーの追加
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
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
  // ① CloudFront 画像を許可 + 外部ドメイン
  images: {
    remotePatterns: [
      // CloudFront ドメイン
      ...(CF_DOMAIN
        ? [
            {
              protocol: 'https',
              hostname: CF_DOMAIN,
              pathname: '/**',
            },
          ]
        : []),
      // URLメタデータ用の外部ドメイン
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
    ],
    domains: CF_DOMAIN ? [CF_DOMAIN] : [],
    // ② WebP / AVIF を自動切替（AVIF優先でより高圧縮）
    formats: ['image/avif', 'image/webp'],
    // ③ デバイス用のサイズ設定
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // ④ レスポンシブ画像用のサイズ
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // ⑤ 静的画像のローダー設定（パフォーマンス向上）
    loader: 'default',
    // ⑥ 画像最適化の無効化（本番では基本的にfalse）
    unoptimized: false,
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
