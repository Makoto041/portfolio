import { describe, expect, it } from 'vitest'
import {
  buildStreak,
  dayParts,
  fmtDate,
  fmtDateBadge,
  fmtDateJa,
  fmtMonthDay,
  fmtTime,
  toDayKey,
} from '../date'

// Asia/Tokyo 正午（JST の日付跨ぎに影響されない基準時刻）
const NOW = Date.parse('2026-08-05T12:00:00+09:00')
const day = (offset: number, time = 'T10:00:00+09:00') => {
  const d = new Date(NOW + offset * 24 * 60 * 60 * 1000)
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(d)
  return `${key}${time}`
}

describe('toDayKey', () => {
  it('Asia/Tokyo の日付キーを返す（UTC 日付跨ぎを吸収）', () => {
    // 2026-08-04 16:30 UTC = 2026-08-05 01:30 JST
    expect(toDayKey(new Date('2026-08-04T16:30:00Z'))).toBe('2026-08-05')
  })
})

describe('buildStreak', () => {
  it('今日投稿ありなら今日から連続日数を数える', () => {
    expect(buildStreak([day(0), day(-1), day(-2)], NOW)).toBe(3)
  })

  it('今日未投稿なら昨日起点で数える', () => {
    expect(buildStreak([day(-1), day(-2)], NOW)).toBe(2)
  })

  it('連続が切れたところで止まる', () => {
    expect(buildStreak([day(0), day(-2), day(-3)], NOW)).toBe(1)
  })

  it('今日も昨日も未投稿なら 0', () => {
    expect(buildStreak([day(-3)], NOW)).toBe(0)
  })

  it('同日の複数投稿は 1 日として数える', () => {
    expect(buildStreak([day(0), day(0, 'T23:00:00+09:00'), day(-1)], NOW)).toBe(2)
  })

  it('不正な日付は無視する', () => {
    expect(buildStreak(['invalid', day(0)], NOW)).toBe(1)
  })

  it('空配列は 0', () => {
    expect(buildStreak([], NOW)).toBe(0)
  })
})

describe('fmtDate', () => {
  it('YYYY.MM.DD（Asia/Tokyo）', () => {
    expect(fmtDate('2026-08-05T00:30:00+09:00')).toBe('2026.08.05')
    // UTC では前日でも JST の日付で表示する
    expect(fmtDate('2026-08-04T16:00:00Z')).toBe('2026.08.05')
  })

  it('未指定・不正値は空文字', () => {
    expect(fmtDate(undefined)).toBe('')
    expect(fmtDate('not-a-date')).toBe('')
  })
})

describe('fmtDateBadge', () => {
  it('MM.DD 形式', () => {
    expect(fmtDateBadge('2026-08-05T10:00:00+09:00')).toBe('08.05')
  })

  it('不正値は空文字', () => {
    expect(fmtDateBadge('not-a-date')).toBe('')
  })
})

describe('dayParts', () => {
  it('Asia/Tokyo の年月日・曜日（漢字）とキーを返す', () => {
    expect(dayParts('2026-07-05T07:39:57.365Z')).toEqual({
      key: '2026-07-05',
      year: 2026,
      month: 7,
      day: 5,
      weekday: '日',
    })
  })

  it('UTC では前日でも JST の日付と曜日になる', () => {
    // 2025-12-05 20:00 UTC = 2025-12-06 05:00 JST（土）
    expect(dayParts('2025-12-05T20:00:00Z')).toMatchObject({ key: '2025-12-06', weekday: '土' })
  })

  it('不正値は null', () => {
    expect(dayParts('not-a-date')).toBeNull()
  })
})

describe('fmtTime', () => {
  it('JST の HH:MM（24時間制）', () => {
    expect(fmtTime('2026-07-05T07:39:57.365Z')).toBe('16:39')
  })

  it('0 時台は 00 と表記する', () => {
    expect(fmtTime('2026-07-04T15:05:00Z')).toBe('00:05')
  })

  it('不正値は空文字', () => {
    expect(fmtTime('nope')).toBe('')
  })
})

describe('fmtDateJa', () => {
  it('`YYYY年M月D日（曜）` 形式', () => {
    expect(fmtDateJa('2025-10-12T05:14:50.340Z')).toBe('2025年10月12日（日）')
  })

  it('未指定・不正値は空文字', () => {
    expect(fmtDateJa(undefined)).toBe('')
    expect(fmtDateJa('not-a-date')).toBe('')
  })
})

describe('fmtMonthDay', () => {
  it('ゼロ埋めなしの `M.D`', () => {
    expect(fmtMonthDay('2026-07-05T07:39:57.365Z')).toBe('7.5')
  })
})
