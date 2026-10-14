import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  preview: {
    allowedHosts: true, // quick tunnel (cloudflared) memakai hostname acak
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'maskable-512.png'],
      manifest: {
        name: 'DevDash',
        short_name: 'DevDash',
        description: 'Dashboard pribadi developer: proyek, checklist harian, tagihan, dan jadwal belajar.',
        lang: 'id',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#F6F7F9',
        background_color: '#F6F7F9',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages' },
          },
        ],
      },
    }),
  ],
})
