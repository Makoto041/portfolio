import MistPageHead from '@/components/mist/MistPageHead'
import type { Metadata } from 'next'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
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
    // og:image は /api/og（1200×630 生成）を明示指定
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'プロダクト | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠が開発・制作したプロダクトの一覧。Webアプリケーション、ツール、サービスなどを公開しています。',
    images: [OG_IMAGE_URL],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/products',
  },
}

export const revalidate = 60 // ISR: 更新時は各コレクションの afterChange で on-demand 再検証
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
