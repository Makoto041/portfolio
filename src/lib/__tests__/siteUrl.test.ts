import { describe, expect, it } from 'vitest'
import { adminResetUrl } from '../siteUrl'

describe('adminResetUrl', () => {
  it('自サイトの URL に管理画面の再設定パスとトークンをつなぐ', () => {
    expect(adminResetUrl('https://example.com', '/admin', '/reset', 'abc123')).toBe(
      'https://example.com/admin/reset/abc123',
    )
  })

  it('スラッシュの有無に左右されない', () => {
    expect(adminResetUrl('https://example.com/', 'admin/', 'reset', 'abc123')).toBe(
      'https://example.com/admin/reset/abc123',
    )
  })

  it('管理画面を "/" に置いても二重スラッシュにならない', () => {
    expect(adminResetUrl('https://example.com', '/', '/reset', 'abc123')).toBe('https://example.com/reset/abc123')
  })

  it('トークンはパスとして安全な形にする', () => {
    expect(adminResetUrl('https://example.com', '/admin', '/reset', 'a/b?c')).toBe(
      'https://example.com/admin/reset/a%2Fb%3Fc',
    )
  })
})
