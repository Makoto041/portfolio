'use server'
// 取得数を可変にしたヘルパ
type Opt = { timelineLimit?: number; mediaLimit?: number }

export async function fetchLatest(opts: Opt = {}) {
  const { timelineLimit = 5, mediaLimit = 1 } = opts

  const base = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

  const getDocs = (col: string, limit = 1) =>
    fetch(`${base}/api/${col}?limit=${limit}&sort=-publishedAt`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((r) => r.docs)

  const timeline = await getDocs('timeline', timelineLimit)
  const [blog] = await getDocs('blogPosts', 1)
  const gallery = await getDocs('media', mediaLimit)

  return { timeline, blog, gallery }
}
