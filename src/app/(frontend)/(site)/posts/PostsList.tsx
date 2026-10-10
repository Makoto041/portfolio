// src/app/(frontend)/(site)/posts/PostsList.tsx
// ブログ一覧（日付・題・抜粋・正方サムネの行。1px の罫で区切る）。
import SodaBlogRow from '@/components/soda/SodaBlogRow'
import { blogRow } from '@/features/site/cardViews'
import type { BlogPost } from '@/payload-types'

export default function PostsList({ posts }: { posts: BlogPost[] }) {
  if (!posts?.length) {
    return <p className="s-empty">まだ記事がありません</p>
  }

  return (
    <div className="s-blist is-page">
      {posts.map((post) => {
        const row = blogRow(post)
        return <SodaBlogRow key={row.id} {...row} />
      })}
    </div>
  )
}
