process.env.NODE_ENV = 'test'
process.env.DB_TYPE = 'postgres'
process.env.DB_HOST = 'localhost'
process.env.DB_PORT = '5433'
process.env.DB_NAME = 'gexm_test'
process.env.DB_USER = 'gexm'
process.env.DB_PASSWORD = 'gexm_test_password'

/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  maxWorkers: 1,
  testTimeout: 60000,
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    '^(\\.\\.?\\/.+)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/postgres/setup.ts'],
  testMatch: ['**/__tests__/postgres/*.e2e.test.ts'],
}

module.exports = config