import { fetchProducts } from '@/lib/fetchProducts'
import ProductCard from '@/components/ProductCard'
import Breadcrumb from '@/components/Breadcrumb'

export const metadata = { title: 'Products - いわぶちまこと' }
export const dynamic = 'force-dynamic'
export const revalidate = 0
const WRAP = 'mx-auto w-full max-w-[58rem] px-5 sm:px-8 section-pad'

export default async function ProductsPage() {
  const products = await fetchProducts()

  return (
    <main className="min-h-screen flex flex-col">
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>
      <section className={WRAP}>
        <h1 className="text-3xl font-semibold mb-8">Products</h1>
        {products.length === 0 && <p>まだ公開されていません。</p>}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    </main>
  )
}
