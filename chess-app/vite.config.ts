import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const base = process.env.CHESS_BASE || '/toys/chess/';

function nojekyllPlugin(): Plugin {
  return {
    name: 'chess-nojekyll',
    closeBundle() {
      writeFileSync(resolve(__dirname, '../toys/chess/.nojekyll'), '');
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), nojekyllPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5190,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4190,
    strictPort: true,
  },
  build: {
    outDir: '../toys/chess',
    emptyOutDir: true,
  },
});
