import { describe, expect, it } from 'vitest'
import { hasDevPush, migrateDecision, pendingMigrations } from '../deployMigrate'

describe('migrateDecision', () => {
  it('Vercel の Production のビルドだけで適用する', () => {
    expect(migrateDecision({ VERCEL: '1', VERCEL_ENV: 'production' })).toEqual({ run: true })
    expect(migrateDecision({ VERCEL_ENV: 'production' })).toEqual({ run: true })
  })

  it('Preview・development のビルドでは何もしない（失敗にもしない）', () => {
    for (const env of ['preview', 'development']) {
      expect(migrateDecision({ VERCEL: '1', VERCEL_ENV: env })).toMatchObject({ run: false, fail: false })
    }
  })

  it('VERCEL_ENV が無い・知らない値のときは止める（システム環境変数が出ていない設定でも黙って飛ばさない）', () => {
    expect(migrateDecision({})).toMatchObject({ run: false, fail: true })
    expect(migrateDecision({ VERCEL: '1' })).toMatchObject({ run: false, fail: true })
    expect(migrateDecision({ VERCEL: '1', VERCEL_ENV: 'staging' })).toMatchObject({ run: false, fail: true })
  })
})

describe('pendingMigrations', () => {
  const names = ['a', 'b', 'c']

  it('適用済みの記録が無いものを、並び順のまま返す', () => {
    expect(pendingMigrations(names, [{ name: 'a', batch: 1 }])).toEqual(['b', 'c'])
    expect(pendingMigrations(names, names.map((name) => ({ name, batch: 2 })))).toEqual([])
  })

  it('dev mode の記録（batch -1）は適用済みに数えない。batch の無い記録は Payload と同じく適用済み', () => {
    expect(
      pendingMigrations(names, [
        { name: 'a', batch: -1 },
        { name: 'b', batch: null },
        { name: 'c', batch: 3 },
      ]),
    ).toEqual(['a'])
  })
})

describe('hasDevPush', () => {
  it('batch -1 の記録があるかを見る', () => {
    expect(hasDevPush([{ batch: 1 }, { batch: -1 }])).toBe(true)
    expect(hasDevPush([{ batch: 1 }, { batch: null }])).toBe(false)
    expect(hasDevPush([])).toBe(false)
  })
})
