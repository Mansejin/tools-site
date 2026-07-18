import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages path on mansejin.com
const base = process.env.STAGECUE_BASE || '/toys/stagecue/';

function nojekyllPlugin(): Plugin {
  return {
    name: 'stagecue-nojekyll',
    closeBundle() {
      writeFileSync(resolve(__dirname, '../toys/stagecue/.nojekyll'), '');
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), nojekyllPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: '../toys/stagecue',
    emptyOutDir: true,
  },
});
