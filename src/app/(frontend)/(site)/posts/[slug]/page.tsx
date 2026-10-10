// src/app/(frontend)/posts/[slug]/page.tsx
export const revalidate = 60 // ISR: 更新時は各コレクションの afterChange で on-demand 再検証

import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payloadClient'
import { toCFUrl } from '@/lib/cfUrl'
import { fmtDateJa } from '@/lib/date'
import { OG_IMAGE, OG_IMAGE_URL, toJsonLd } from '@/lib/seo'
import type { BlogPost } from '@/lib/payloadTypes'
import { RenderRichTextWithModal, type LexicalNode } from '@/lib/renderRichTextWithModal'
import SodaIcon from '@/components/soda/SodaIcon'
import Phrase from '@/components/soda/Phrase'

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

  const date = post.publishedAt ?? post.createdAt
  const nodes = ((post.body as { root?: { children?: LexicalNode[] } } | undefined)?.root?.children ?? [])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />
      <div className="s-wrap">
        <article className="s-article s-pbody">
          <header className="s-ahead">
            <div className="s-ameta">
              <span className="s-cat">ブログ</span>
              <time className="s-num" dateTime={date}>
                {fmtDateJa(date)}
              </time>
            </div>
            <h1>
              <Phrase text={post.title} />
            </h1>
          </header>

          {post.coverImage?.url && (
            <div className="s-cover">
              <Image
                src={toCFUrl(post.coverImage.url)}
                alt=""
                fill
                priority
                sizes="(max-width: 760px) 100vw, 700px"
                className="object-cover"
              />
            </div>
          )}

          {/* Lexical の JSON を React 要素に変換（画像はタップで拡大） */}
          <div className="s-prose">
            <RenderRichTextWithModal nodes={nodes} />
          </div>

          <div className="s-back">
            <Link href="/posts" className="s-pill">
              <SodaIcon name="arrow-left" />
              ブログ一覧へ
            </Link>
          </div>
        </article>
      </div>
    </>
  )
}
