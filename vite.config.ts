import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },

  build: {
    // Aumenta o limite de aviso de chunk (padrão é 500kb)
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Divide o bundle em chunks por biblioteca
        manualChunks: {
          // React core — carregado primeiro, sempre em cache
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Supabase — isolado pois é grande
          'vendor-supabase': ['@supabase/supabase-js'],

          // Recharts — só usado na página de Relatórios
          'vendor-recharts': ['recharts'],

          // date-fns — utilitário de datas
          'vendor-datefns': ['date-fns'],

          // Lucide — ícones (grande, mas cacheável)
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
  },

  // Pré-carrega dependências em dev para acelerar HMR
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'date-fns',
      'lucide-react',
      'recharts',
    ],
  },
})
