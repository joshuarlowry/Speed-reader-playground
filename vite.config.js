import { defineConfig } from 'vite';
import { copyFileSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  base: process.env.GITHUB_REPOSITORY 
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdfjs': ['pdfjs-dist'],
          'epub': ['jszip']
        }
      }
    },
    copyPublicDir: true
  },
  worker: {
    format: 'es'
  },
  plugins: [
    {
      name: 'copy-sw',
      closeBundle() {
        copyFileSync(
          join(process.cwd(), 'sw.js'),
          join(process.cwd(), 'dist', 'sw.js')
        );
      }
    }
  ]
});
