// src/app/(frontend)/og/route.tsx
// 全 frontend ルート共通の OGP 画像（1200×630）を next/og で動的生成する安定URLの
// ルートハンドラ。旧 opengraph-image.tsx（ファイル規約）は openGraph キーが
// セグメント間でシャロー置換されるとサブページで og:image が消える問題があったため、
// 安定URL `/og` に一本化し、各ページの openGraph.images から明示的に参照する。
import { ImageResponse } from 'next/og'

const size = { width: 1200, height: 630 }

export function GET() {
  try {
    return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          // 群青（ウルトラマリン）グラデーション＝サイトのシグネチャーカラー
          background: 'linear-gradient(135deg, #1b2350 0%, #232b52 45%, #3d5cc9 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 2, opacity: 0.82 }}>
          ~/life $ whoami
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 116, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
            MAKOTO
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 116,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.05,
              color: '#aec4f7',
            }}
          >
            IWABUCHI
          </div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: 30, opacity: 0.9 }}>
            岩渕誠（いわぶちまこと）／ web engineer, tokyo
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 24,
            opacity: 0.72,
          }}
        >
          <div style={{ display: 'flex' }}>日々の記録、ときどき写真。</div>
          <div style={{ display: 'flex' }}>iwabuchi-makoto.com</div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        // 生成コストを抑えるため長めにキャッシュ（内容はほぼ不変）
        'Cache-Control': 'public, immutable, no-transform, max-age=31536000',
      },
    },
    )
  } catch (err) {
    // ImageResponse(Satori) 生成失敗時もクラッシュさせず 500 を返す
    console.error('OG image generation failed:', err)
    return new Response('Failed to generate OG image', { status: 500 })
  }
}
