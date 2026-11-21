import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BLING’D Admin',
    short_name: 'Store Admin',
    description: 'BLING’D admin control center.',
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/blingd-icon.png',
        sizes: '223x223',
        type: 'image/png',
      },
    ],
  }
}
