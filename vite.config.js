import { defineConfig } from 'vite'

export default defineConfig({
  // Environment variables prefixed with VITE_ are exposed to the client
  envPrefix: 'VITE_',

  build: {
    outDir: 'dist',
    // Generate source maps for debugging
    sourcemap: false,
  },

  server: {
    port: 3000,
    open: true,
  },
})
