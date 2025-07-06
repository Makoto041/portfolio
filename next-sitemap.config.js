// next-sitemap.config.js
export default {
  siteUrl: 'https://iwabuchi-makoto.com',
  generateRobotsTxt: true,
  exclude: ['/admin/*', '/api/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
  },
}
