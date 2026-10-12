import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PALETTES, SITE_PALETTE, currentPalette, type PaletteKey } from '../palette'

describe('currentPalette', () => {
  it('固定指定ならそのキーを返す', () => {
    expect(currentPalette('lemon', new Date('2026-01-15T00:00:00Z'))).toBe('lemon')
  })

  it('monthly は Asia/Tokyo の月で決まる（UTC の月末でも JST で翌月）', () => {
    // 2026-09-30 16:00 UTC = 2026-10-01 01:00 JST → 10月
    expect(currentPalette('monthly', new Date('2026-09-30T16:00:00Z'))).toBe('gunjo')
  })

  it('monthly の割当はすべて定義済みパレット', () => {
    for (let m = 0; m < 12; m++) {
      const key = currentPalette('monthly', new Date(Date.UTC(2026, m, 15)))
      expect(Object.keys(PALETTES)).toContain(key)
    }
  })
})

describe('PALETTES と soda.css の色値', () => {
  // theme-color / OGP 用に TS 側にも持っている bg・logo が、CSS の実際の色とずれていないこと
  const css = readFileSync(join(__dirname, '../../app/(frontend)/soda.css'), 'utf8')
  const block = (key: PaletteKey) => {
    // 既定（:root）はクリームソーダ。ほかは :root[data-palette='…']
    const re = key === 'creamsoda' ? /:root \{([^}]*)\}/ : new RegExp(`:root\\[data-palette='${key}'\\] \\{([^}]*)\\}`)
    return css.match(re)?.[1] ?? ''
  }
  const value = (decls: string, name: string) => decls.match(new RegExp(`--s-${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]

  // 文字色の既定（パレットが --s-pal-* を持たないとき）は .soda の var() の2番目の値
  const fallback = (name: 'ink' | 'sub' | 'faint') =>
    css.match(new RegExp(`--s-${name}:\\s*var\\(--s-pal-${name},\\s*(#[0-9a-f]{6})\\)`, 'i'))?.[1]

  for (const key of Object.keys(PALETTES) as PaletteKey[]) {
    it(`${key}: bg・logo・ink・sub が一致`, () => {
      const decls = block(key)
      expect(value(decls, 'bg')).toBe(PALETTES[key].bg)
      expect(value(decls, 'logo')).toBe(PALETTES[key].logo)
      expect(value(decls, 'pal-ink') ?? fallback('ink')).toBe(PALETTES[key].ink)
      expect(value(decls, 'pal-sub') ?? fallback('sub')).toBe(PALETTES[key].sub)
    })

    it(`${key}: 文字（本文・補助・微メタ）が地色・カード・紙面の上で AA(4.5:1) 以上`, () => {
      const decls = block(key)
      const bg = value(decls, 'bg')
      const card = value(decls, 'card')
      expect(bg).toBeDefined()
      expect(card).toBeDefined()
      const surfaces = [bg!, card!, paper(bg!)]
      for (const name of ['ink', 'sub', 'faint'] as const) {
        const text = value(decls, `pal-${name}`) ?? fallback(name)
        expect(text).toBeDefined()
        for (const surface of surfaces) expect(contrast(text!, surface)).toBeGreaterThanOrEqual(4.5)
      }
    })

    it(`${key}: ベタ面（文字色の面）の上の明るい文字（地色・カードの色）が AA(4.5:1) 以上`, () => {
      // フッター・メニュー・塗りのボタンなどは、文字色の面に地色・カードの色で文字を置く
      const decls = block(key)
      const ink = value(decls, 'pal-ink') ?? fallback('ink')
      expect(ink).toBeDefined()
      for (const name of ['bg', 'card']) {
        const light = value(decls, name)
        expect(light).toBeDefined()
        expect(contrast(light!, ink!)).toBeGreaterThanOrEqual(4.5)
      }
    })

    it(`${key}: ベタ面（文字色の面）の上の赤が 3:1 以上`, () => {
      const ink = value(block(key), 'pal-ink') ?? fallback('ink')
      // パレットが --s-pal-hot-inv を持てばその色、なければ --s-hot（.soda の --s-hot-inv の既定）
      const hotInv = value(block(key), 'pal-hot-inv') ?? css.match(/--s-hot:\s*(#[0-9a-f]{6})/i)?.[1]
      expect(ink).toBeDefined()
      expect(hotInv).toBeDefined()
      expect(contrast(hotInv!, ink!)).toBeGreaterThanOrEqual(3)
    })
  }
})

describe('ホーム画面に追加したときの色', () => {
  it.skipIf(SITE_PALETTE === 'monthly')('post.webmanifest の色がいまのパレットの地色と一致', () => {
    // skipIf で飛ばしているが、下の PALETTES[SITE_PALETTE] の型を絞り込むために必要
    if (SITE_PALETTE === 'monthly') return
    const manifest = JSON.parse(
      readFileSync(join(__dirname, '../../../public/post.webmanifest'), 'utf8'),
    )
    expect(manifest.theme_color).toBe(PALETTES[SITE_PALETTE].bg)
    expect(manifest.background_color).toBe(PALETTES[SITE_PALETTE].bg)
  })
})

/** WCAG の相対輝度によるコントラスト比 */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** 紙面の色（soda.css の color-mix(in srgb, #ffffff 60%, 地色) と同じ） */
function paper(bg: string): string {
  return (
    '#' +
    [1, 3, 5]
      .map((i) => Math.round(255 * 0.6 + parseInt(bg.slice(i, i + 2), 16) * 0.4))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  )
}
