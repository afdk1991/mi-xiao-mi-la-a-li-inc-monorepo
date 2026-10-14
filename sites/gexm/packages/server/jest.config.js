// 测试环境配置：使用内存数据库确保套件隔离，设置 NODE_ENV 跳过速率限制
process.env.NODE_ENV = 'test'
process.env.DB_TYPE = 'sqlite'
process.env.DB_PATH = ':memory:'

/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  maxWorkers: 1,
  testTimeout: 30000,
  testPathIgnorePatterns: ['<rootDir>/dist/'],
}

module.exports = config