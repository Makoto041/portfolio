import { describe, expect, it } from 'vitest'
import { spotifyEmbedUrl } from '../spotify'

describe('spotifyEmbedUrl', () => {
  it('プレイリスト共有URLを埋め込みURLへ変換する', () => {
    expect(spotifyEmbedUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBe(
      'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator',
    )
  })

  it('クエリ付きURL・track/album/artist にも対応する', () => {
    expect(spotifyEmbedUrl('https://open.spotify.com/track/abc123DEF?si=xyz')).toBe(
      'https://open.spotify.com/embed/track/abc123DEF?utm_source=generator',
    )
    expect(spotifyEmbedUrl('https://open.spotify.com/album/xyz789')).toContain('/embed/album/xyz789')
    expect(spotifyEmbedUrl('https://open.spotify.com/artist/a1b2c3')).toContain('/embed/artist/a1b2c3')
  })

  it('spotify: URI 形式にも対応する', () => {
    expect(spotifyEmbedUrl('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M')).toBe(
      'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator',
    )
  })

  it('不正・未指定は null', () => {
    expect(spotifyEmbedUrl('https://example.com/foo')).toBeNull()
    expect(spotifyEmbedUrl('')).toBeNull()
    expect(spotifyEmbedUrl(null)).toBeNull()
    expect(spotifyEmbedUrl(undefined)).toBeNull()
  })
})
