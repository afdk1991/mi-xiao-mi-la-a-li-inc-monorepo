import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'path'

export default defineConfig({
  plugins: [
    dts({
      outputDir: './dist/mp-weixin',
      insertTypesEntry: true,
      rollupTypes: true,
    })
  ],
  build: {
    target: 'ES2018',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'GexmSDK',
      formats: ['es', 'cjs'],
      fileName: (format) => `gexm-sdk.${format}.js`
    },
    outDir: './dist/mp-weixin',
    rollupOptions: {
      external: [
        '@dcloudio/uni-app',
        '@dcloudio/uni-mp-weixin',
        'vue'
      ],
      output: {
        globals: {
          '@dcloudio/uni-app': 'uni',
          '@dcloudio/uni-mp-weixin': 'uni',
          'vue': 'Vue'
        }
      }
    },
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  define: {
    'process.env.PLATFORM': '"mp-weixin"',
    'process.env.NODE_ENV': '"production"'
  }
})