import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/panel/', '/admin/', '/profile/', '/reset-password/'],
    },
    sitemap: 'https://nicholmoviesug.com/sitemap.xml',
  }
}
