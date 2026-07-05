import MistPageHead from '@/components/mist/MistPageHead'
import type { Metadata } from 'next'
import { fetchProducts } from '@/lib/fetchProducts'
import ProductCard from '@/components/cards/ProductCard'

export const metadata: Metadata = {
  // template が「| 岩渕誠（いわぶちまこと）」を付与するためページ名のみ
  title: 'プロダクト',
  description: '岩渕誠が開発・制作したプロダクトの一覧。Webアプリケーション、ツール、サービスなどを公開しています。',
  keywords: ['プロダクト', '制作物', '岩渕誠', 'いわぶちまこと', 'Webアプリ', 'ツール', 'サービス'],
  authors: [{ name: 'いわぶちまこと' }],
  openGraph: {
    title: 'プロダクト | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠が開発・制作したプロダクトの一覧。Webアプリケーション、ツール、サービスなどを公開しています。',
    url: 'https://iwabuchi-makoto.com/products',
    siteName: 'いわぶちまこと',
    locale: 'ja_JP',
    type: 'website',
    // og:image は opengraph-image.tsx（生成1200×630）が付与
  },
  twitter: {
    card: 'summary_large_image',
    title: 'プロダクト | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠が開発・制作したプロダクトの一覧。Webアプリケーション、ツール、サービスなどを公開しています。',
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/products',
  },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export default async function ProductsPage() {
  const products = await fetchProducts()

  return (
    <main className="content">
      <MistPageHead cmd="ls ./products" title="Products" desc="作ったもののログ" />
      {products.length === 0 && <p className="empty">$ no products yet</p>}
      <div className="cardgrid">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </main>
  )
}
