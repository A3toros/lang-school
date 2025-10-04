import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'pics/favicon/favicon.ico',
        'pics/favicon/apple-touch-icon.png',
        'pics/favicon/android-chrome-192x192.png',
        'pics/favicon/android-chrome-512x512.png',
        'pics/favicon/site.webmanifest'
      ],
      manifest: {
        name: 'Lang School',
        short_name: 'LangSchool',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0ea5e9',
        icons: [
          { src: '/pics/favicon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pics/favicon/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pics/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: '/pics/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
          { src: '/pics/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cloudinary-images',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/pics/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-images',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: ({ request, url }) => url.origin === self.location.origin && (/\.\w+$/.test(url.pathname) && /\.((css)|(js))$/.test(url.pathname)),
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5174, // Port for Netlify dev to proxy to
    host: true,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  define: {
    global: 'globalThis'
  }
})