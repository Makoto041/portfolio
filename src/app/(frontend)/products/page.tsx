import PageHeader from '@/components/layout/PageHeader'
import type { Metadata } from 'next'
import { fetchProducts } from '@/lib/fetchProducts'
import ProductCard from '@/components/cards/ProductCard'

export const metadata: Metadata = {
  title: 'プロダクト | 岩渕誠（いわぶちまこと）',
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
    images: [
      {
        url: '/myicon.png',
        width: 1200,
        height: 630,
        alt: 'いわぶちまこと プロダクト',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'プロダクト | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠が開発・制作したプロダクトの一覧。Webアプリケーション、ツール、サービスなどを公開しています。',
    images: ['/myicon.png'],
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
    <main className="pb-16">
      <PageHeader title="Products" description="作ったもののログ" />
      {products.length === 0 && <p className="text-muted">まだ公開されていません。</p>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </main>
  )
}
