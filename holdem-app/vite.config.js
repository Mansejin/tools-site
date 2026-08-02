import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const base = process.env.HOLDEM_BASE || '/toys/holdem/';

function nojekyllPlugin() {
  return {
    name: 'holdem-nojekyll',
    closeBundle() {
      writeFileSync(resolve(import.meta.dirname, '../toys/holdem/.nojekyll'), '');
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), nojekyllPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5200,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4200,
    strictPort: true,
  },
  build: {
    outDir: '../toys/holdem',
    emptyOutDir: true,
  },
});
