// src/app/(frontend)/og/route.tsx
// 全 frontend ルート共通の OGP 画像（1200×630）を next/og で動的生成する安定URLのルートハンドラ。
// 各ページの openGraph.images から明示的に参照する（src/lib/seo.ts の OG_IMAGE_URL）。
// デザインはサイトと同じ「日記帳 × フィルムカメラ」: 地色 + 左寄せの題字「MAKOTO」+ 朱の日付印 +
// テープで留めた罫線のノート（名前と手書きの添え書き）。
import { ImageResponse } from 'next/og'
import { PALETTES, SITE_PALETTE } from '@/lib/palette'

const size = { width: 1200, height: 630 }

// SNS 側で長くキャッシュされるため、月替わり設定のときも定番のクリームソーダで固定する
const PALETTE = PALETTES[SITE_PALETTE === 'monthly' ? 'creamsoda' : SITE_PALETTE]
const BG = PALETTE.bg
const LOGO = PALETTE.logo
const INK = '#141414'
/** 日付印の朱（soda.css の --s-stamp） */
const STAMP = '#b3301b'
/** ノートの紙・横罫 */
const PAPER = '#fbfcf8'
const RULE = '#b9d6c2'
/** マスキングテープ（soda.css の creamsoda の --s-card） */
const TAPE = '#fbf3dc'
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

const LATIN_TEXT = 'LIFE LOG — TOKYO iwabuchi-makoto.com'
const STAMP_TEXT = 'LIFE LOG SINCE 2025 TOKYO'
const NAME = '岩渕誠（いわぶちまこと）'
const CAPTION = '日々の記録、ときどき写真。'

/** フォントが取れたときだけ fontFamily を指定する（Satori は fontFamily: undefined で落ちる） */
const family = (name: string, loaded: ArrayBuffer | null) => (loaded ? { fontFamily: name } : {})

/** ノートの1行（文字の下に横罫） */
function Ruled({ children, size, font }: { children: string; size: number; font?: { fontFamily?: string } }) {
  return (
    <div
      style={{
        display: 'flex',
        paddingBottom: 6,
        borderBottom: `2px solid ${RULE}`,
        fontSize: size,
        lineHeight: 1.45,
        ...font,
      }}
    >
      {children}
    </div>
  )
}

export async function GET() {
  try {
    const [bagel, dmSans, dmSansBold, klee] = await Promise.all([
      loadGoogleFont('Bagel+Fat+One', WORD),
      loadGoogleFont('DM+Sans:wght@500', LATIN_TEXT),
      loadGoogleFont('DM+Sans:wght@700', STAMP_TEXT),
      loadGoogleFont('Klee+One:wght@600', CAPTION),
    ])
    // 先頭のフォントが既定書体になるため、本文用の DM Sans を先に、ロゴ・添え書き用を後に並べる
    const fonts = [
      ...(dmSans ? [{ name: 'DM Sans', data: dmSans, weight: 500 as const, style: 'normal' as const }] : []),
      ...(dmSansBold ? [{ name: 'DM Sans', data: dmSansBold, weight: 700 as const, style: 'normal' as const }] : []),
      ...(bagel ? [{ name: 'Bagel Fat One', data: bagel, weight: 400 as const, style: 'normal' as const }] : []),
      ...(klee ? [{ name: 'Klee One', data: klee, weight: 600 as const, style: 'normal' as const }] : []),
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
            padding: '44px 64px 52px',
            background: BG,
            color: INK,
            ...family('DM Sans', dmSans),
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: 14,
              borderBottom: `2px solid ${INK}`,
              fontSize: 22,
              letterSpacing: 4,
            }}
          >
            <div style={{ display: 'flex' }}>LIFE LOG — TOKYO</div>
            <div style={{ display: 'flex' }}>iwabuchi-makoto.com</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                display: 'flex',
                ...family('Bagel Fat One', bagel),
                fontWeight: 800,
                fontSize: 196,
                lineHeight: 1,
                letterSpacing: -2,
                color: LOGO,
              }}
            >
              {WORD}
            </div>
            {/* 朱の日付印（少し傾けて押す） */}
            <div
              style={{
                width: 196,
                height: 196,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 18,
                border: `5px solid ${STAMP}`,
                borderRadius: 999,
                color: STAMP,
                fontWeight: 700,
                transform: 'rotate(-9deg)',
              }}
            >
              <div style={{ display: 'flex', fontSize: 20, letterSpacing: 3, marginBottom: 8 }}>LIFE LOG</div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '6px 0',
                  borderTop: `3px solid ${STAMP}`,
                  borderBottom: `3px solid ${STAMP}`,
                  fontSize: 27,
                  letterSpacing: 1,
                }}
              >
                SINCE 2025
              </div>
              <div style={{ display: 'flex', fontSize: 18, letterSpacing: 3, marginTop: 8 }}>TOKYO</div>
            </div>
          </div>

          {/* テープで留めた罫線のノート */}
          <div style={{ display: 'flex', position: 'relative', width: 760 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                width: '100%',
                padding: '28px 34px 26px',
                border: `2px solid ${INK}`,
                borderRadius: 18,
                background: PAPER,
              }}
            >
              <Ruled size={42}>{NAME}</Ruled>
              <Ruled size={30} font={family('Klee One', klee)}>
                {CAPTION}
              </Ruled>
            </div>
            <div
              style={{
                position: 'absolute',
                top: -14,
                left: 330,
                width: 120,
                height: 28,
                background: TAPE,
                borderLeft: '2px dashed #c9c3ad',
                borderRight: '2px dashed #c9c3ad',
                transform: 'rotate(-3deg)',
              }}
            />
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
