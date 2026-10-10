import { describe, expect, it } from 'vitest'
import { PALETTES, currentPalette } from '../palette'

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
