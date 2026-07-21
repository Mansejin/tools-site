import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const base = process.env.MINDTREE_BASE || '/mindtree/';

function nojekyllPlugin(): Plugin {
  return {
    name: 'mindtree-nojekyll',
    closeBundle() {
      writeFileSync(resolve(__dirname, '../mindtree/.nojekyll'), '');
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), nojekyllPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5180,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4180,
    strictPort: true,
  },
  build: {
    outDir: '../mindtree',
    emptyOutDir: true,
  },
});
