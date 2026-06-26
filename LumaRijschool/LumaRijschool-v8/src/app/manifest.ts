import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LumaRijschool — Leer slimmer. Slaag sneller.',
    short_name: 'LumaRijschool',
    description: 'Het slimste theorieplatform van Nederland.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563EB',
    lang: 'nl',
    icons: [{ src: '/logo.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
