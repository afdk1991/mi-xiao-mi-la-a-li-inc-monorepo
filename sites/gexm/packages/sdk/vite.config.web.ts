import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'path'

export default defineConfig({
  plugins: [
    dts({
      outputDir: './dist/web',
      insertTypesEntry: true,
      rollupTypes: false,
      skipDiagnostics: true,
    })
  ],
  build: {
    target: 'ES2020',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'GexmSDK',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `gexm-sdk.${format}.js`
    },
    outDir: './dist/web',
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          'vue': 'Vue'
        }
      }
    },
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})