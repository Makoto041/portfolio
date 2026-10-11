import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PALETTES, currentPalette, type PaletteKey } from '../palette'

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

  for (const key of Object.keys(PALETTES) as PaletteKey[]) {
    it(`${key}: bg と logo が一致`, () => {
      const decls = block(key)
      expect(value(decls, 'bg')).toBe(PALETTES[key].bg)
      expect(value(decls, 'logo')).toBe(PALETTES[key].logo)
    })
  }
})

