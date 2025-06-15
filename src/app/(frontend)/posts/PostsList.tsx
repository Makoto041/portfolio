'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { BlogPost } from '@/lib/payloadTypes'
import { toCFUrl } from '@/lib/cfUrl'

export default function PostsList({ posts }: { posts: BlogPost[] }) {
  if (!posts?.length) {
    // 万一 posts が未定義なら
    return <div>投稿がありません</div>
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={post.slug ? `/posts/${post.slug}` : '/maintenance'}
          className="glass hover:shadow-[0_12px_32px_rgba(0,0,0,.18)] transition rounded-lg overflow-hidden p-6 flex flex-col"
        >
          {post.coverImage?.url && (
            <div className="relative w-full h-48 mb-4">
              <Image
                src={toCFUrl(post.coverImage.url)}
                alt={post.title}
                fill
                className="object-cover rounded-md"
              />
            </div>
          )}
          <h2 className="text-xl font-semibold mb-2 line-clamp-2">{post.title}</h2>
          <time className="text-xs opacity-60 mb-4">
            {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString()}
          </time>
          <p className="text-sm flex-1 line-clamp-3">{post.excerpt}</p>
        </Link>
      ))}
    </div>
  )
}
