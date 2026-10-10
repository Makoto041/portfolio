import { describe, expect, it } from 'vitest'
import { safeHref } from '../safeHref'

describe('safeHref', () => {
  it('http(s) と mailto はそのまま通す', () => {
    expect(safeHref('https://example.com/a?b=c')).toBe('https://example.com/a?b=c')
    expect(safeHref('http://example.com')).toBe('http://example.com')
    expect(safeHref('mailto:me@example.com')).toBe('mailto:me@example.com')
  })

  it('サイト内の相対パスは通す', () => {
    expect(safeHref('/posts/tech')).toBe('/posts/tech')
  })

  it('危険なスキーム・プロトコル相対・不正値は null', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref(' JavaScript:alert(1)')).toBeNull()
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(safeHref('//evil.example.com')).toBeNull()
    expect(safeHref('not a url')).toBeNull()
    expect(safeHref('')).toBeNull()
    expect(safeHref(undefined)).toBeNull()
  })
})
