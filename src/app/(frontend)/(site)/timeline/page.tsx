import type { Metadata } from 'next'
import MistPageHead from '@/components/mist/MistPageHead'
import MistLogTimeline from '@/components/mist/MistLogTimeline'
import AdminLinks from '@/components/admin/AdminLinks'
import { fetchLatest } from '@/lib/payload'
import { getPayloadClient } from '@/lib/payloadClient'
import type { TimelineDoc } from '@/lib/payloadTypes'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    // og:image は opengraph-image.tsx（生成1200×630）が付与
  },
  twitter: {
    card: 'summary_large_image',
    title: 'タイムライン | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠の日々の活動記録。リアルタイムで更新される思考の断片や日常の出来事を時系列で公開しています。',
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/timeline',
  },
}

export default async function TimelinePage() {
  const payload = await getPayloadClient()
  // 表示分（最大100件）と全件数を並列取得。total は実数を渡す（load --more の (all n) 表示・
  // 100件超の古い記録への導線が正しく出るように）
  const [{ timeline }, totalRes] = await Promise.all([
    fetchLatest({ timelineLimit: 100 }),
    payload.count({ collection: 'timeline' }),
  ])
  const posts = timeline as unknown as TimelineDoc[]

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
        <MistLogTimeline posts={posts} total={totalRes.totalDocs} showHead={false} />
      </div>
    </main>
  )
}