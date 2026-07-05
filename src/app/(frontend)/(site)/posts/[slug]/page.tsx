// src/app/(frontend)/posts/[slug]/page.tsx
export const revalidate = 60 // ISR: 更新時は各コレクションの afterChange で on-demand 再検証

import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payloadClient'
import { toCFUrl } from '@/lib/cfUrl'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
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
      // template がブランド接尾辞を付与するためページ名のみ
      title: 'ページが見つかりません',
      description: 'お探しのページは見つかりませんでした。',
    }
  }

  // <title> は記事名のみ（template がブランド接尾辞を付与）。og/twitter はブランド付きの完全表記
  const ogTitle = `${post.title} | 岩渕誠（いわぶちまこと）`
  const description = post.excerpt || `${post.title}についての記事です。岩渕誠のブログより。`
  // 記事のカバー画像があれば OG に使う（実寸不定のため width/height は宣言せず platform に委ねる）。
  // 無ければ /og の生成1200×630（OG_IMAGE）が使われる
  const imageUrl = post.coverImage?.url ? toCFUrl(post.coverImage.url) : null
  const url = `https://iwabuchi-makoto.com/posts/${slug}`

  return {
    title: post.title,
    description,
    keywords: ['ブログ', '岩渕誠', 'いわぶちまこと', post.title],
    authors: [{ name: 'いわぶちまこと' }],
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: 'いわぶちまこと',
      locale: 'ja_JP',
      type: 'article',
      publishedTime: post.publishedAt || post.createdAt,
      authors: ['いわぶちまこと'],
      images: imageUrl ? [{ url: imageUrl, alt: post.title }] : [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: imageUrl ? [imageUrl] : [OG_IMAGE_URL],
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
          <span className="cmd" style={{ fontSize: 'var(--fs-meta)', color: 'oklch(0.5 0.06 268)' }}>
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
