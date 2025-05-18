export async function fetchLatest({ timelineLimit = 5, mediaLimit = 1 } = {}) {
  const base =
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    (process.env.NODE_ENV === 'development' && `http://localhost:${process.env.PORT ?? 3000}`) ||
    ''

  const q = (c: string, limit = 1) =>
  `${base}/api/${c}?limit=${limit}&sort=-publishedAt,-createdAt`

  const [tRes, bRes, mRes] = await Promise.all([
    fetch(q('timeline', timelineLimit)),
    fetch(q('blogPosts', 1)),
    fetch(q('media', mediaLimit)),
  ])

  if (!tRes.ok || !bRes.ok || !mRes.ok) throw new Error('failed to fetch collections')

  const [
    { docs: timeline },
    {
      docs: [posts],
    },
    { docs: gallery },
  ] = await Promise.all([tRes.json(), bRes.json(), mRes.json()])

  /* 空データ時のフォールバック ------------------- */
  const safeTimeline = timeline.length
    ? timeline
    : [{ id: 'dummy', text: '🛠 サイト調整中です。', createdAt: new Date().toISOString() }]

  const safeGallery = gallery.length ? gallery : [{ id: 'dummy-img', url: '/default.jpg' }]

  return { timeline: safeTimeline, posts, gallery: safeGallery }
}
