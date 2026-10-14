import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// EdgeOne Makers 静态站点部署配置
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
    // 拆包：地图/UI 运行时几乎不变，单独成块后发新版只有业务代码缓存失效。
    // 单文件 410kB 时改一行代码就要让用户重下全部依赖。
    rollupOptions: {
      output: {
        // 用对象形式而非函数：函数形式容易把共享依赖切到不同块形成循环引用
        //（曾出现 Circular chunk: vendor -> react -> vendor）
        manualChunks: {
          leaflet: ['leaflet'],
          papaparse: ['papaparse'],
          vendor: ['react', 'react-dom', 'zustand', 'idb'],
        },
      },
    },
  },
})
