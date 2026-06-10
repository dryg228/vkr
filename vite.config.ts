import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        charset: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            if (id.includes('react-router')) return 'router-vendor';
            if (id.includes('firebase')) return 'firebase-vendor';
            if (id.includes('mobx')) return 'mobx-vendor';
            if (id.includes('swiper')) return 'swiper-vendor';
            if (id.includes('uuid')) return 'utils-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
})
