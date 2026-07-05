'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { BlogPost } from '@/lib/payloadTypes'
import { toCFUrl } from '@/lib/cfUrl'

export default function PostsList({ posts }: { posts: BlogPost[] }) {
  if (!posts?.length) {
    return <p className="empty">$ no posts found</p>
  }

  return (
    <div className="cardgrid">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={post.slug ? `/posts/${post.slug}` : '/maintenance'}
          className="ccard"
        >
          {post.coverImage?.url && (
            <div className="thumb">
              <Image
                src={toCFUrl(post.coverImage.url)}
                alt={post.title}
                fill
                sizes="(max-width:720px) 100vw, 320px"
                className="object-cover"
              />
            </div>
          )}
          <div className="cbody">
            <span className="cmeta">
              <time dateTime={post.publishedAt ?? post.createdAt}>
                {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('ja-JP')}
              </time>
            </span>
            <span className="ctitle jp">{post.title}</span>
            {post.excerpt && <span className="cexcerpt jp line-clamp-3">{post.excerpt}</span>}
          </div>
        </Link>
      ))}
    </div>
  )
}
