import type { Metadata } from 'next'
import MistPageHead from '@/components/mist/MistPageHead'
import MistLogTimeline from '@/components/mist/MistLogTimeline'
import AdminLinks from '@/components/admin/AdminLinks'
import { fetchLatest } from '@/lib/payload'
import type { TimelineDoc } from '@/lib/payloadTypes'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'タイムライン | 岩渕誠（いわぶちまこと）',
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
    images: [
      {
        url: '/myicon.png',
        width: 1200,
        height: 630,
        alt: 'いわぶちまこと タイムライン',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'タイムライン | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠の日々の活動記録。リアルタイムで更新される思考の断片や日常の出来事を時系列で公開しています。',
    images: ['/myicon.png'],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/timeline',
  },
}

export default async function TimelinePage() {
  // サーバーコンポーネントで直接fetchLatest()を使用
  const { timeline } = await fetchLatest({
    timelineLimit: 100, // 全件取得
  })
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
        <MistLogTimeline posts={posts} total={posts.length} showHead={false} />
      </div>
    </main>
  )
}