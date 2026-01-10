import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode (available for future use)
  // const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],

    // Build configuration
    build: {
      // Output directory
      outDir: 'dist',

      // Generate sourcemaps for production debugging
      sourcemap: mode === 'production' ? 'hidden' : true,

      // Target modern browsers for smaller bundle
      target: 'es2020',

      // Minification
      minify: 'esbuild',

      // Chunk size warnings
      chunkSizeWarningLimit: 1000,

      // Rollup options
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // React and related libraries
            'react-vendor': ['react', 'react-dom'],

            // React Flow and workflow canvas
            'workflow-vendor': ['@xyflow/react'],

            // Utilities and smaller libraries
            'utils-vendor': ['zustand', 'decimal.js'],
          },

          // Asset file naming
          assetFileNames: (assetInfo) => {
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
              return `assets/images/[name]-[hash][extname]`;
            }

            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
              return `assets/fonts/[name]-[hash][extname]`;
            }

            return `assets/[name]-[hash][extname]`;
          },

          // Chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },

      // CSS code splitting
      cssCodeSplit: true,
    },

    // Development server configuration
    server: {
      port: 5173,
      strictPort: false,
      host: true,
      open: false,
    },

    // Preview server configuration
    preview: {
      port: 4173,
      strictPort: false,
      host: true,
      open: false,
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@xyflow/react',
        'zustand',
        'decimal.js',
      ],
    },
  };
})
