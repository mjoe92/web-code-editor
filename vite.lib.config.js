import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: 'dist/artifacts',
        lib: {
            entry: './src/main.ts',
            name: 'WebCodeEditor',
            fileName: 'web-code-editor'
        }
    },
    publicDir: false
});
