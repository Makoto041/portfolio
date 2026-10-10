import { describe, expect, it } from 'vitest'
import { streakFact } from '../timeline'

describe('streakFact', () => {
  it('連続投稿中は「N日 / 連続」', () => {
    expect(streakFact({ streak: 3, last: '10.10' })).toEqual({ value: '3日', label: '連続' })
  })

  it('途切れているときは「最終更新」の日付', () => {
    expect(streakFact({ streak: 0, last: '7.5' })).toEqual({ value: '7.5', label: '最終更新' })
  })

  it('投稿が無いときはダッシュ', () => {
    expect(streakFact({ streak: 0, last: '' })).toEqual({ value: '—', label: '連続' })
  })
})
