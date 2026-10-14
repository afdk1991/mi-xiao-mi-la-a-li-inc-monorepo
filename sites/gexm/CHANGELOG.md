# Changelog

本文件记录 Gexm Platform 的所有版本变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本管理遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- 项目全面检查与基础库适配报告
- 多智能体协作检查机制

### Changed
- TypeScript 版本统一至 6.0.3
- Zod 降级至 3.23.8 以保持兼容性

### Fixed
- SDK PlatformFactory 平台检测缩进错误
- RedisClient 接口缺失 ping 方法
- 支付网关类型定义错误
- Server 错误处理类型断言
- SDK Electron 适配器 Node 类型缺失
- Vite 构建外部模块配置缺失

### Security
- 修复 SDK 伪加密风险（Base64 替换为 AES）
- 修复不安全随机数生成（Math.random 替换为 crypto.getRandomValues）
- 修复支付回调时序攻击风险
- 修复支付密钥默认值回退
- 修复 WebSocket Token URL 泄露
- 修复 CORS 非生产环境完全开放

## [1.0.0] - 2024-01-01

### Added
- 初始版本发布
- 基于 uni-app 的多端前端应用
- 基于 Express.js 的后端服务
- 跨平台适配 SDK
- 共享类型和工具库
