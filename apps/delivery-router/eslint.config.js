// ESLint 9 扁平配置。
// 定位：不重复 TypeScript 已经保证的事（类型、未使用变量由 tsc strict 负责），
// 只补 tsc 管不到的部分：React Hooks 规则、易错模式、浏览器/Node 全局变量误用。

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default [
  {
    ignores: [
      'dist/**',
      'release/**',
      'build/**',
      'android/**',
      'node_modules/**',
      '.edgeone/**',
      'public/**', // sw.js 为浏览器脚本，不参与应用 lint
      'scripts/**', // Node 工具脚本（.cjs/.mjs），暂不纳入
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 边缘函数：运行在 EdgeOne 边缘运行时（类 Service Worker），
  // 自带 fetch / Response / URL 等 Web 标准全局，但没有 process 等 Node 全局。
  {
    files: ['edge-functions/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        crypto: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },

  // Node 侧脚本与配置：主进程、图标生成、业务自检、Vite 配置
  {
    files: ['electron/**/*.cjs', 'scripts/**/*.{cjs,mjs}', 'vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Electron 预加载暴露的桥接（仅类型声明，运行时由 preload 注入）
        electronAPI: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // 交由 tsc strict / noUnusedLocals 负责，避免重复报警
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      // 项目大量使用 any 解析第三方地图 SDK 返回值，暂不强制
      '@typescript-eslint/no-explicit-any': 'off',
      // 允许非空断言（地图 SDK 回调结果已做运行时校验）
      '@typescript-eslint/no-non-null-assertion': 'off',
      // 允许 require 风格 CJS 声明（amapLoader 动态加载场景）
      '@typescript-eslint/no-require-imports': 'off',
      // 逻辑运算符混用可读性差，但地图兜底链路上常见，降级为警告
      '@typescript-eslint/no-mixed-operators': 'off',
      // 空函数在回调兜底中常见
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      // 常见易错点保持开启
      eqeqeq: ['warn', 'smart'],
      'no-console': 'off',
    },
  },
  {
    // 测试文件：放宽部分规则
    files: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
