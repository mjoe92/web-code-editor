import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/artifacts',
    lib: {
      entry: {
        'web-code-editor':         resolve(__dirname, 'src/component/main.ts'),
        'web-code-editor-react':   resolve(__dirname, 'src/react/index.tsx'),
        'web-code-editor-vue':     resolve(__dirname, 'src/vue/index.ts'),
        'web-code-editor-angular': resolve(__dirname, 'src/angular/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'react',
        'react/jsx-runtime',
        'vue',
        '@angular/core',
        '@angular/forms',
      ],
    },
  },
  publicDir: false,
});
