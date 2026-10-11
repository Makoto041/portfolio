import { describe, expect, it } from 'vitest'
import { monthBuckets, monthRange, streakFact } from '../timeline'

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

describe('monthBuckets', () => {
  it('Asia/Tokyo の年月ごとに数え、新しい月から並べる', () => {
    expect(
      monthBuckets([
        '2026-07-05T07:39:57.365Z',
        '2026-07-04T04:09:14.047Z',
        '2025-12-06T09:26:12.831Z',
        // 7/31 21:06 JST（UTC では 7/31 12:06）
        '2025-07-31T12:06:15.745Z',
        // 8/1 0:30 JST（UTC では 7/31 15:30）→ 8月に数える
        '2025-07-31T15:30:00.000Z',
      ]),
    ).toEqual([
      { key: '2026-07', year: 2026, month: 7, count: 2 },
      { key: '2025-12', year: 2025, month: 12, count: 1 },
      { key: '2025-08', year: 2025, month: 8, count: 1 },
      { key: '2025-07', year: 2025, month: 7, count: 1 },
    ])
  })

  it('並び順が崩れていても新しい月から返し、不正な日付は無視する', () => {
    expect(monthBuckets(['2025-01-10T00:00:00Z', 'nope', '2025-03-10T00:00:00Z']).map((b) => b.key)).toEqual([
      '2025-03',
      '2025-01',
    ])
  })
})

describe('monthRange', () => {
  it('日本時間の月初 0 時から翌月初 0 時まで（UTC で表す）', () => {
    expect(monthRange('2025-07')).toEqual({
      start: '2025-06-30T15:00:00.000Z',
      end: '2025-07-31T15:00:00.000Z',
    })
  })

  it('12月は翌年1月まで', () => {
    expect(monthRange('2025-12')).toEqual({
      start: '2025-11-30T15:00:00.000Z',
      end: '2025-12-31T15:00:00.000Z',
    })
  })

  it('不正なキーは null', () => {
    expect(monthRange('2025-13')).toBeNull()
    expect(monthRange('2025-7')).toBeNull()
    expect(monthRange('')).toBeNull()
  })
})
