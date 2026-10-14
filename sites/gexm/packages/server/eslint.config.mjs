import js from '@eslint/js';
import pluginTs from '@typescript-eslint/eslint-plugin';
import pluginSecurity from 'eslint-plugin-security';
import parserTs from '@typescript-eslint/parser';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '**/*.test.ts'],
  },

  js.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      parser: parserTs,
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': pluginTs,
      security: pluginSecurity,
    },
    rules: {
      ...pluginTs.configs.recommended.rules,
      ...pluginSecurity.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-nocheck': 'allow-with-description' }],
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-unused-vars': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-var': 'warn',
      'prefer-const': 'warn',
      curly: ['warn', 'all'],
      eqeqeq: ['warn', 'always'],
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-irregular-whitespace': 'warn',
      'no-undef': 'warn',
    },
  },

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    plugins: {
      security: pluginSecurity,
    },
    rules: {
      ...pluginSecurity.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-var': 'warn',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'always'],
      curly: ['warn', 'all'],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
];