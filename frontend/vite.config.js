import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api/* requests to the FastAPI backend during development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Chunk splitting for optimal caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunk splitting for optimal caching
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/mapbox-gl') || id.includes('node_modules/@mapbox')) {
            return 'vendor-mapbox';
          }
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios';
          }
        },
        // Cache-busting asset hashes
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Enable CSS minification
    cssMinify: true,
    // Enable source maps for production debugging
    sourcemap: false,
    // Target modern browsers
    target: 'es2020',
  },
})
