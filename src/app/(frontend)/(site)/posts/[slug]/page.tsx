// src/app/(frontend)/posts/[slug]/page.tsx
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payloadClient'
import { toCFUrl } from '@/lib/cfUrl'
import type { BlogPost } from '@/lib/payloadTypes'
import { RenderRichTextWithModal } from '@/lib/renderRichTextWithModal'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const client = await getPayloadClient()
  const result = await client.find({
    collection: 'blogPosts',
    where: { slug: { equals: slug } },
    depth: 2,
  })
  const docs = result.docs as BlogPost[]
  const post = docs[0]

  if (!post) {
    return {
      title: 'ページが見つかりません | 岩渕誠（いわぶちまこと）',
      description: 'お探しのページは見つかりませんでした。',
    }
  }

  const title = `${post.title} | いわぶちまこと`
  const description = post.excerpt || `${post.title}についての記事です。岩渕誠のブログより。`
  const imageUrl = post.coverImage?.url ? toCFUrl(post.coverImage.url) : '/myicon.png'
  const url = `https://iwabuchi-makoto.com/posts/${slug}`

  return {
    title,
    description,
    keywords: ['ブログ', '岩渕誠', 'いわぶちまこと', post.title],
    authors: [{ name: 'いわぶちまこと' }],
    openGraph: {
      title,
      description,
      url,
      siteName: 'いわぶちまこと',
      locale: 'ja_JP',
      type: 'article',
      publishedTime: post.publishedAt || post.createdAt,
      authors: ['いわぶちまこと'],
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
  }
}


export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  // Next.js v15+: params は Promise になっているので await して展開
  const { slug } = await params

  const client = await getPayloadClient()
  const result = await client.find({
    collection: 'blogPosts',
    where: { slug: { equals: slug } },
    depth: 2,
  })
  const docs = result.docs as BlogPost[]
  const post = docs[0]
  if (!post) return notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt || `${post.title}についての記事です。`,
    "image": post.coverImage?.url ? toCFUrl(post.coverImage.url) : "https://iwabuchi-makoto.com/myicon.png",
    "author": {
      "@type": "Person",
      "name": "岩渕誠",
      "alternateName": "いわぶちまこと",
      "url": "https://iwabuchi-makoto.com"
    },
    "publisher": {
      "@type": "Person",
      "name": "岩渕誠",
      "alternateName": "いわぶちまこと"
    },
    "datePublished": post.publishedAt || post.createdAt,
    "dateModified": post.updatedAt || post.publishedAt || post.createdAt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://iwabuchi-makoto.com/posts/${slug}`
    },
    "url": `https://iwabuchi-makoto.com/posts/${slug}`,
    "inLanguage": "ja-JP"
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="content">
        <article className="article">
          <span className="cmd" style={{ fontSize: 12.5, color: 'oklch(0.5 0.06 268)' }}>
            ~/life $ cat ./posts/{slug}
          </span>
          {post.coverImage?.url && (
            <div className="cover" style={{ marginTop: 18 }}>
              <Image
                src={toCFUrl(post.coverImage.url)}
                alt={post.title}
                fill
                sizes="760px"
                className="object-cover"
              />
            </div>
          )}

          <h1 className="jp" style={{ marginTop: post.coverImage?.url ? 0 : 18 }}>
            {post.title}
          </h1>
          <time className="ameta" dateTime={post.publishedAt ?? post.createdAt}>
            {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('ja-JP')}
          </time>

          {/* renderRichText で Lexical の JSON を React 要素に変換 */}
          <div className="prose jp">
            <RenderRichTextWithModal nodes={(post.body as any)?.root?.children || []} />
          </div>

          <Link href="/posts" className="backlink">
            ← cd ./posts
          </Link>
        </article>
      </main>
    </>
  )
}
