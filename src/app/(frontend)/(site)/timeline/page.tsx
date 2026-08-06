import type { Metadata } from 'next'
import MistPageHead from '@/components/mist/MistPageHead'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
import MistLogTimeline from '@/components/mist/MistLogTimeline'
import { TIMELINE_PAGE_SIZE } from '@/lib/timeline'
import AdminLinks from '@/components/admin/AdminLinks'
import { getPayloadClient } from '@/lib/payloadClient'
import type { TimelineDoc } from '@/lib/payloadTypes'

export const revalidate = 60 // ISR: 更新時は各コレクションの afterChange で on-demand 再検証

export const metadata: Metadata = {
  // template が「| 岩渕誠（いわぶちまこと）」を付与するためページ名のみ
  title: 'タイムライン',
  description: '岩渕誠の日々の活動記録。リアルタイムで更新される思考の断片や日常の出来事を時系列で公開しています。',
  keywords: ['タイムライン', '日記', '岩渕誠', 'いわぶちまこと', '日常', '活動記録'],
  authors: [{ name: 'いわぶちまこと' }],
  openGraph: {
    title: 'タイムライン | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠の日々の活動記録。リアルタイムで更新される思考の断片や日常の出来事を時系列で公開しています。',
    url: 'https://iwabuchi-makoto.com/timeline',
    siteName: 'いわぶちまこと',
    locale: 'ja_JP',
    type: 'website',
    // og:image は /og（1200×630 生成）を明示指定
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'タイムライン | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠の日々の活動記録。リアルタイムで更新される思考の断片や日常の出来事を時系列で公開しています。',
    images: [OG_IMAGE_URL],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/timeline',
  },
}

export default async function TimelinePage() {
  // 初期表示は最新1ページ分のみ。以降は MistLogTimeline が Payload REST
  // （GET /api/timeline）からページ単位で追加取得する（100件一括取得を廃止）。
  // limit は page 2 以降とずれないよう TIMELINE_PAGE_SIZE を共有する
  let posts: TimelineDoc[] = []
  let total = 0
  try {
    const payload = await getPayloadClient()
    const [postsRes, totalRes] = await Promise.all([
      payload.find({
        collection: 'timeline',
        limit: TIMELINE_PAGE_SIZE,
        sort: '-publishedAt',
        depth: 2,
      }),
      payload.count({ collection: 'timeline' }),
    ])
    posts = postsRes.docs as unknown as TimelineDoc[]
    total = totalRes.totalDocs
  } catch (error) {
    console.error('Timeline fetch failed (rendering empty):', error)
  }

  return (
    <main className="content">
      <MistPageHead
        cmd="git log --diary --photos"
        title="Timeline"
        desc="日々の記録"
        actions={<AdminLinks />}
      />

      {/* トップと同じ git log 風タイムライン（読み幅を確保） */}
      <div style={{ maxWidth: 840 }}>
        <MistLogTimeline posts={posts} total={total} showHead={false} />
      </div>
    </main>
  )
}