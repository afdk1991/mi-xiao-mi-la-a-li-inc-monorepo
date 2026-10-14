import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'path'

export default defineConfig({
  plugins: [
    dts({
      outputDir: './dist',
      insertTypesEntry: true,
      rollupTypes: true,
    })
  ],
  build: {
    target: 'ES2020',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'GexmSDK',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `index.${format}.js`
    },
    rollupOptions: {
      external: [
        '@dcloudio/uni-app',
        '@dcloudio/uni-h5',
        '@dcloudio/uni-mp-weixin',
        'electron',
        'vue',
        'fs',
        'path',
        'process'
      ],
      output: {
        globals: {
          '@dcloudio/uni-app': 'uni',
          '@dcloudio/uni-h5': 'uni',
          '@dcloudio/uni-mp-weixin': 'uni',
          'electron': 'electron',
          'vue': 'Vue'
        }
      }
    },
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})