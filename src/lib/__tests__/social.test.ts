import { describe, expect, it } from 'vitest'
import { platformLabel, socialLabel } from '../social'

describe('platformLabel', () => {
  it('スタイル別の表記を返す', () => {
    expect(platformLabel('twitter', 'full')).toBe('X')
    expect(platformLabel('github', 'term')).toBe('github')
    expect(platformLabel('instagram', 'short')).toBe('ig')
  })

  it('未知・未指定は null', () => {
    expect(platformLabel('mastodon', 'full')).toBeNull()
    expect(platformLabel(null, 'term')).toBeNull()
  })
})

describe('socialLabel', () => {
  it('displayName を優先する（term/short は小文字化）', () => {
    expect(socialLabel({ platform: 'github', displayName: 'GitHub' }, 'full')).toBe('GitHub')
    expect(socialLabel({ platform: 'github', displayName: 'GitHub' }, 'term')).toBe('github')
  })

  it('displayName が無ければプラットフォーム表記', () => {
    expect(socialLabel({ platform: 'twitter' }, 'full')).toBe('X')
    expect(socialLabel({ platform: 'youtube' }, 'short')).toBe('yt')
  })

  it('未知プラットフォームは full はスラッグ・それ以外は fallback', () => {
    expect(socialLabel({ platform: 'mastodon' }, 'full')).toBe('mastodon')
    expect(socialLabel({ platform: 'mastodon' }, 'short')).toBe('link')
    expect(socialLabel({}, 'short', '↗')).toBe('↗')
  })
})
