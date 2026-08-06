// src/lib/cfUrl.ts
// Build an absolute CloudFront URL for any relative path that begins with `/`
// — no specific folder prefix assumption.

export const toCFUrl = (path?: string | null): string => {
  if (!path) return ''

  const CF = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN
  if (!CF) return path // ← ドメイン未設定ならそのまま返す

  // 1. すでに絶対 URL の場合
  if (path.startsWith('http')) {
    // すでに CloudFront ならそのまま
    if (path.includes(CF)) return path

    // 外部URLの場合はそのまま返す（メタデータ画像など）
    return path
  }

  // 2. 相対パスの場合（先頭を `/` に正規化）
  const normalized = path.startsWith('/') ? path : `/${path}`

  // `/api/<collection>/file/<name>` パターン → `/ <name>`
  const apiMatch = normalized.match(/^\/api\/[^/]+\/file\/(.+)$/)
  const key = apiMatch ? `/${apiMatch[1]}` : normalized

  // 3. CloudFront ドメインを前置
  return `https://${CF}${key}` // ← `/media` を付けない
}

/** next/image の最適化を通せる src か（相対URL or CloudFront ドメイン）。
    remotePatterns を CF_DOMAIN のみに絞ったため、外部ホストの絶対URLは
    `unoptimized` で直接参照する必要がある */
export const isOptimizableSrc = (src: string): boolean => {
  if (!src.startsWith('http')) return true
  const CF = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN
  return !!CF && src.includes(CF)
}
