import type { Metadata } from 'next'
import SodaPageHead from '@/components/soda/SodaPageHead'
import SodaCard from '@/components/soda/SodaCard'
import Phrase from '@/components/soda/Phrase'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
import { fetchProducts } from '@/lib/fetchProducts'
import { productCard } from '@/features/site/cardViews'

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
    // og:image は /og（1200×630 生成）を明示指定
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
    <div className="s-wrap">
      <SodaPageHead en="Products" title="つくったもの" desc="作ったもののログ" />
      <div className="s-pbody">
        {products.length === 0 ? (
          <p className="s-empty">まだ公開しているものはありません</p>
        ) : (
          <div className="s-cgrid">
            {products.map((p) => {
              const card = productCard(p)
              return (
                <div key={card.id}>
                  <SodaCard
                    {...card}
                    title={<Phrase text={card.label} />}
                    sizes="(max-width: 600px) 92vw, (max-width: 1080px) 46vw, 400px"
                  />
                  {p.description && <p className="s-cnote">{p.description}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
