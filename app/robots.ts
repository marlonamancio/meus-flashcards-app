import type { MetadataRoute } from 'next'

// Indexação bloqueada de propósito enquanto o app está em teste restrito ao círculo de amigos —
// ver CLAUDE.md "SEO — indexação bloqueada temporariamente". Reverter (junto com o `robots` do
// metadata em app/layout.tsx) antes de divulgar publicamente.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  }
}
