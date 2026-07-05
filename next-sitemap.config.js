// next-sitemap.config.js
export default {
  siteUrl: 'https://iwabuchi-makoto.com',
  generateRobotsTxt: true,
  exclude: ['/admin/*', '/api/*', '/og'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
  },
  // 動的レンダリングのページはビルド成果物から検出されないため明示的に登録する
  additionalPaths: async (config) => {
    const staticPaths = [
      '/timeline',
      '/posts',
      '/gallery',
      '/products',
      '/profile',
      '/events',
    ]
    const results = await Promise.all(
      staticPaths.map((path) => config.transform(config, path)),
    )

    // ブログ記事の個別ページ（DBからslugを取得。失敗してもビルドは止めない）
    try {
      const { Pool } = await import('pg')
      const pool = new Pool({ connectionString: process.env.POSTGRES_URL })
      const { rows } = await pool.query(
        'SELECT slug, updated_at FROM blog_posts WHERE slug IS NOT NULL',
      )
      await pool.end()
      for (const row of rows) {
        results.push({
          loc: `/posts/${row.slug}`,
          lastmod: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
          changefreq: 'weekly',
          priority: 0.8,
        })
      }
    } catch (error) {
      console.warn('[next-sitemap] ブログslugの取得に失敗:', error?.message)
    }

    return results.filter(Boolean)
  },
}
