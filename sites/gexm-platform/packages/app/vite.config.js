const { defineConfig } = require('vite')
const uni = require('@dcloudio/vite-plugin-uni').default
const path = require('path')
const fs = require('fs')

let viteCompression = null
try {
  const compressionModule = require('vite-plugin-compression')
  viteCompression = compressionModule.default || compressionModule
} catch (e) {
  console.warn('[vite.config] vite-plugin-compression not available, skipping')
}

// 平台定义
const PLATFORMS = {
  H5: 'h5',
  MP_WEIXIN: 'mp-weixin',
  MP_ALIPAY: 'mp-alipay',
  MP_BAIDU: 'mp-baidu',
  MP_TOUTIAO: 'mp-toutiao',
  APP_PLUS: 'app-plus',
  MP_HARMONY: 'mp-harmony',
  APP_HARMONY: 'app-harmony',
}

// 微信小程序 project.config.json 补丁插件
function wechatProjectConfigPatch() {
  return {
    name: 'wechat-project-config-patch',
    apply: 'build',
    closeBundle() {
      if (process.env.UNI_PLATFORM !== 'mp-weixin') return

      const manifestPath = path.resolve(__dirname, 'manifest.json')
      let manifestAppid = ''
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
        manifestAppid = manifest['mp-weixin']?.appid || ''
      } catch (e) {
        console.error(`\n[wechat-project-config-patch] Read manifest failed: ${e.message}`)
      }

      const outDirs = [
        path.resolve(__dirname, 'dist/build/mp-weixin'),
        path.resolve(__dirname, 'dist/dev/mp-weixin'),
      ]

      outDirs.forEach((outDir) => {
        const configPath = path.join(outDir, 'project.config.json')
        if (!fs.existsSync(configPath)) return

        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
          config.packNpmManually = false
          config.packNpmRelationList = []
          if (config.setting) {
            config.setting.nodeModules = false
          }
          if (manifestAppid && config.appid && config.appid.startsWith('wx')) {
            config.appid = manifestAppid
          }
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
          console.log(`\n[wechat-project-config-patch] Updated: ${configPath}`)
        } catch (e) {
          console.error(`\n[wechat-project-config-patch] Failed: ${e.message}`)
        }
      })
    },
  }
}

module.exports = defineConfig({
  plugins: [
    uni(),
    wechatProjectConfigPatch(),
    ...(viteCompression
      ? [
          viteCompression({
            verbose: true,
            disable: false,
            threshold: 10240,
            algorithm: 'gzip',
            ext: '.gz',
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      vue: '@dcloudio/uni-h5-vue',
    },
    dedupe: ['vue', '@vue/shared', '@vue/runtime-core', '@vue/runtime-dom'],
  },
  optimizeDeps: {
    exclude: ['vue', '@dcloudio/uni-h5-vue'],
  },
  ssr: {
    noExternal: ['pinia'],
  },
  define: {
    // 全局平台标识
    __PLATFORM__: JSON.stringify(process.env.UNI_PLATFORM || 'h5'),
    // 版本信息
    __APP_VERSION__: JSON.stringify(require('./package.json').version || '1.0.0'),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
    strictPort: false,
    cors: true,
    hmr: {
      overlay: true,
      host: 'localhost',
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
    fs: {
      strict: false,
      allow: [
        path.resolve(__dirname, 'src'),
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, '../shared'),
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: `@use "${path.resolve(__dirname, 'src/styles/variables.scss').replace(/\\/g, '/')}" as *;`
      },
    },
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.warn'],
        unused: true,
        dead_code: true,
        inline: true,
        collapse_vars: true,
      },
      mangle: {
        toplevel: true,
        keep_classnames: false,
        keep_fnames: false,
      },
    },
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia')) {
              return 'vendor-vue'
            }
            if (id.includes('@dcloudio')) {
              return 'vendor-uni'
            }
            if (id.includes('axios') || id.includes('qs')) {
              return 'vendor-network'
            }
            if (id.includes('crypto-js') || id.includes('jsencrypt')) {
              return 'vendor-crypto'
            }
            if (id.includes('dayjs') || id.includes('date-fns')) {
              return 'vendor-date'
            }
            if (id.includes('zod') || id.includes('yup')) {
              return 'vendor-validation'
            }
            return 'vendor-other'
          }
        },
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
