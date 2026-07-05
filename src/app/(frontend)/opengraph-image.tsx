// src/app/(frontend)/opengraph-image.tsx
// 全 frontend ルート共通の OGP 画像（1200×630）を next/og で動的生成する。
// 実寸460×460の myicon を 1200 と偽って配信していた問題を解消し、群青ブランドの
// 正しい 16:9 シェア画像に一本化する（各ページで openGraph.images を上書きしない限りこれが使われる）。
import { ImageResponse } from 'next/og'

export const alt = '岩渕誠（いわぶちまこと） | ライフログ'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
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
    { ...size },
  )
}
