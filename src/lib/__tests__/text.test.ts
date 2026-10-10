import { describe, expect, it } from 'vitest'
import { charLength, clip } from '../text'

describe('clip', () => {
  it('max 文字以内はそのまま', () => {
    expect(clip('那須のグランピング', 9)).toBe('那須のグランピング')
  })

  it('超えたら切って … を付ける', () => {
    expect(clip('那須のグランピングに行ってきた', 5)).toBe('那須のグラ…')
  })

  it('絵文字（サロゲートペア）を途中で割らない', () => {
    expect(clip('🍺🍺🍺', 2)).toBe('🍺🍺…')
    expect(charLength('🍺a')).toBe(2)
  })
})
