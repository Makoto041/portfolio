// ───────────────────────────────────────────
// src/lib/spotify.ts
// Spotify 共有URL → 埋め込みURL 変換（playlist/album/track/artist）。
// MistRail / Profile ページで共用する。
// ───────────────────────────────────────────

/** Spotify 共有URL → 埋め込みURL。不正なら null */
export function spotifyEmbedUrl(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/(playlist|album|track|artist)[/:]([a-zA-Z0-9]+)/)
  if (!m) return null
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator`
}
