import { describe, expect, it } from 'vitest'
import { platformLabel, socialLabel } from '../social'

describe('platformLabel', () => {
  it('正式表記を返す', () => {
    expect(platformLabel('twitter')).toBe('X')
    expect(platformLabel('github')).toBe('GitHub')
  })

  it('未知・未指定は null', () => {
    expect(platformLabel('mastodon')).toBeNull()
    expect(platformLabel(null)).toBeNull()
  })
})

describe('socialLabel', () => {
  it('displayName を優先する', () => {
    expect(socialLabel({ platform: 'github', displayName: 'makoto' })).toBe('makoto')
  })

  it('displayName が無ければプラットフォーム表記', () => {
    expect(socialLabel({ platform: 'twitter' })).toBe('X')
    expect(socialLabel({ platform: 'youtube', displayName: '' })).toBe('YouTube')
  })

  it('未知プラットフォームはスラッグ、何も無ければ fallback', () => {
    expect(socialLabel({ platform: 'mastodon' })).toBe('mastodon')
    expect(socialLabel({})).toBe('link')
    expect(socialLabel({}, '↗')).toBe('↗')
  })
})
