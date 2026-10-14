// 根级 ESLint 基线（flat config）。
//
// 此前 README 声称存在 `.eslintrc.base.js`，但实际并未创建，导致各子项目
// 各自携带 ESLint 8 / 9、taro、vue 等互不统一的规则。
// 现在落地统一基线：子项目在自己的 eslint.config.* 中 `extends` 本文件即可。
//
// 用法（子项目 eslint.config.mjs）：
//   import base from '../eslint.config.base.mjs'
//   export default [...base, { /* 项目自有规则 */ }]
//
// 注意：本基线只启用「无插件依赖」的通用规则，避免强制子项目安装额外插件。

export default [
  {
    // 忽略构建产物与依赖
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.cache/**',
      '**/coverage/**',
      '**/*.min.js',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,mts,cts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // ── 可能的错误 ──
      'no-cond-assign': 'error',
      'no-constant-condition': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unsafe-negation': 'error',

      // ── 最佳实践 ──
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-optional-chain': 'warn',
      'object-shorthand': 'warn',

      // ── 代码风格（与根 .prettierrc.json 对齐：2 空格 / 单引号 / 分号）──
      indent: ['warn', 2, { SwitchCase: 1 }],
      quotes: ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      semi: ['warn', 'always'],
      'comma-dangle': ['warn', 'always-multiline'],

      // ── 变量 ──
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // 共享包启用更严格的规则（@shared/* 是整合后的权威实现，必须保持高质量）
    files: ['shared/**/*.{ts,tsx}'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'error',
    },
  },
]
