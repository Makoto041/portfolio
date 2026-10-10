// src/app/(frontend)/og/route.tsx
// 全 frontend ルート共通の OGP 画像（1200×630）を next/og で動的生成する安定URLのルートハンドラ。
// 各ページの openGraph.images から明示的に参照する（src/lib/seo.ts の OG_IMAGE_URL）。
// デザインはサイトと同じ Soda Press: 地色 + 丸いロゴ「MAKOTO」+ 罫線タブの見出し。
import { ImageResponse } from 'next/og'
import { PALETTES } from '@/lib/palette'

const size = { width: 1200, height: 630 }

const BG = PALETTES.gunjo.bg
const LOGO = '#95a1da'
const INK = '#141414'
const WORD = 'MAKOTO'

/** Google Fonts から必要な文字だけの TTF を取得（Satori は woff2 非対応のため TTF を要求） */
async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`, {
        signal: AbortSignal.timeout(5000),
      })
    ).text()
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    if (!src) return null
    const res = await fetch(src, { signal: AbortSignal.timeout(5000) })
    return res.ok ? await res.arrayBuffer() : null
  } catch (error) {
    console.warn('OG font load failed (falling back to default font):', error)
    return null
  }
}

const tab = {
  display: 'flex',
  background: BG,
  border: `2px solid ${INK}`,
  color: INK,
} as const

const LATIN_TEXT = 'LIFE LOG — TOKYO iwabuchi-makoto.com'

export async function GET() {
  try {
    const [bagel, dmSans] = await Promise.all([
      loadGoogleFont('Bagel+Fat+One', WORD),
      loadGoogleFont('DM+Sans:wght@500', LATIN_TEXT),
    ])
    // 先頭のフォントが既定書体になるため、本文用の DM Sans を先に、ロゴ用の Bagel を後に並べる
    const fonts = [
      ...(dmSans ? [{ name: 'DM Sans', data: dmSans, weight: 500 as const, style: 'normal' as const }] : []),
      ...(bagel ? [{ name: 'Bagel Fat One', data: bagel, weight: 400 as const, style: 'normal' as const }] : []),
    ]
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 64px 56px',
            background: BG,
            color: INK,
            fontFamily: dmSans ? 'DM Sans' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, letterSpacing: 4 }}>
            <div style={{ display: 'flex' }}>LIFE LOG — TOKYO</div>
            <div style={{ display: 'flex' }}>iwabuchi-makoto.com</div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: -10,
              fontFamily: bagel ? 'Bagel Fat One' : undefined,
              fontWeight: 800,
              fontSize: 250,
              lineHeight: 1,
              letterSpacing: -2,
              color: LOGO,
            }}
          >
            {WORD}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{ ...tab, padding: '8px 20px', fontSize: 24, borderBottom: 'none', borderRadius: '10px 10px 0 0' }}
            >
              ライフログ
            </div>
            <div style={{ ...tab, padding: '16px 24px', fontSize: 40, borderRadius: '0 10px 10px 10px' }}>
              岩渕誠（いわぶちまこと）
            </div>
            <div style={{ ...tab, padding: '8px 20px', fontSize: 24, borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
              日々の記録、ときどき写真。
            </div>
          </div>
        </div>
      ),
      {
        ...size,
        fonts: fonts.length > 0 ? fonts : undefined,
        headers: {
          // 生成コストを抑えるため長めにキャッシュ（デザイン変更時は OG_IMAGE_URL の版を上げる）
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
