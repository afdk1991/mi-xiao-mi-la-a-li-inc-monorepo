# 多平台支持说明

## 支持的平台

| 平台 | 支持状态 | 构建命令 | 开发命令 |
|------|----------|----------|----------|
| Web | ✅ 支持 | `npm run build:h5` | `npm run dev:h5` |
| 微信小程序 | ✅ 支持 | `npm run build:weapp` | `npm run dev:weapp` |
| 支付宝小程序 | ✅ 支持 | `npm run build:alipay` | `npm run dev:alipay` |
| 抖音小程序 | ✅ 支持 | `npm run build:tt` | `npm run dev:tt` |
| React Native | ✅ 支持 | `npm run build:rn` | `npm run dev:rn` |

## 平台特性

### Web 平台
- 使用 Vite 或 Taro 构建
- 支持响应式设计
- 支持 PWA
- 支持 Service Worker

### 微信小程序
- 支持微信支付
- 支持微信登录
- 支持微信分享
- 支持微信小程序云开发

### 支付宝小程序
- 支持支付宝支付
- 支持支付宝登录
- 支持支付宝分享

### 抖音小程序
- 支持抖音支付
- 支持抖音登录
- 支持抖音分享

### React Native
- 支持 iOS 和 Android 双平台
- 支持原生组件
- 支持热更新

## 开发注意事项

### 1. 平台检测

在代码中可以使用 `platform.ts` 工具检测当前运行平台：

```javascript
import { getCurrentPlatform, isMiniProgram, isH5, isRN } from './utils/platform';

// 获取当前平台
const platform = getCurrentPlatform();

// 检查是否为小程序平台
if (isMiniProgram()) {
  // 小程序特定代码
}

// 检查是否为H5平台
if (isH5()) {
  // H5特定代码
}

// 检查是否为React Native平台
if (isRN()) {
  // React Native特定代码
}
```

### 2. 平台特定样式

项目使用平台特定样式文件，会根据当前平台自动加载对应的样式：

- `styles/platform/h5.css` - Web 平台样式
- `styles/platform/weapp.css` - 微信小程序样式
- `styles/platform/alipay.css` - 支付宝小程序样式
- `styles/platform/tt.css` - 抖音小程序样式
- `styles/platform/rn.css` - React Native 样式

### 3. 平台特定组件

对于平台差异较大的功能，建议创建平台特定的组件：

```
components/
├── Button/          # 通用按钮组件
├── Button.h5.jsx    # Web平台特定按钮组件
├── Button.weapp.jsx # 微信小程序特定按钮组件
└── Button.rn.jsx    # React Native特定按钮组件
```

### 4. API 调用

使用 Taro 提供的统一 API，避免直接使用平台特定的 API：

```javascript
// 推荐：使用 Taro 统一 API
Taro.request({
  url: 'https://api.example.com',
  method: 'GET'
});

// 不推荐：直接使用平台特定 API
// 微信小程序
// wx.request({
//   url: 'https://api.example.com',
//   method: 'GET'
// });
```

### 5. 样式注意事项

- 使用 `px2rpx` 工具函数转换单位，确保在不同平台上显示一致
- 避免使用平台特定的 CSS 属性
- 使用 Flex 布局，确保在不同平台上显示一致

```javascript
import { px2rpx } from './utils/style';

// 在样式中使用
const style = {
  width: px2rpx(100),
  height: px2rpx(50)
};
```

## 构建配置

### 1. Taro 配置

Taro 配置文件 `taro.config.ts` 中配置了所有支持的平台：

```typescript
platforms: ['h5', 'weapp', 'alipay', 'tt', 'rn'],
```

### 2. Vite 配置

Vite 配置文件 `vite.config.mjs` 中配置了 React Native 别名，确保 Web 平台构建正确：

```javascript
alias: {
  'react-native': 'react-native-web',
  '@react-native-community/netinfo': 'react-native-web',
  'react-native-safe-area-context': 'react-native-web',
  'react-native-screens': 'react-native-web'
}
```

## 性能优化

### 1. 代码分割

项目使用了代码分割，将不同平台的代码分离，减小包体积：

```javascript
// 在 vite.config.mjs 中配置
rollupOptions: {
  manualChunks: {
    react: ['react', 'react-dom'],
    'react-router': ['react-router-dom', '@react-navigation/native'],
    taro: ['@tarojs/components', '@tarojs/react'],
    'react-native': ['react-native-web', 'react-native-safe-area-context']
  }
}
```

### 2. 懒加载

推荐使用 React.lazy 和 Suspense 进行组件懒加载：

```javascript
import React, { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

## 调试技巧

### 1. Web 平台

- 使用 Chrome DevTools 进行调试
- 使用 React DevTools 进行组件调试

### 2. 微信小程序

- 使用微信开发者工具进行调试
- 使用 VS Code 插件进行代码编辑

### 3. 支付宝小程序

- 使用支付宝开发者工具进行调试

### 4. 抖音小程序

- 使用抖音开发者工具进行调试

### 5. React Native

- 使用 React Native Debugger 进行调试
- 使用 Chrome DevTools 进行调试

## 部署说明

### 1. Web 平台

可以部署到任何静态网站托管服务：

- GitHub Pages
- Vercel
- Netlify
- 阿里云 OSS
- 腾讯云 COS

### 2. 微信小程序

部署到微信小程序平台：

1. 使用微信开发者工具上传代码
2. 在微信公众平台提交审核
3. 审核通过后发布

### 3. 支付宝小程序

部署到支付宝小程序平台：

1. 使用支付宝开发者工具上传代码
2. 在支付宝开放平台提交审核
3. 审核通过后发布

### 4. 抖音小程序

部署到抖音小程序平台：

1. 使用抖音开发者工具上传代码
2. 在抖音开放平台提交审核
3. 审核通过后发布

### 5. React Native

#### iOS

1. 生成 IPA 文件
2. 提交到 App Store

#### Android

1. 生成 APK 或 AAB 文件
2. 提交到 Google Play 或其他应用市场

## 常见问题

### 1. 依赖冲突

如果遇到依赖冲突，可以使用 `--legacy-peer-deps` 选项安装依赖：

```bash
npm install --legacy-peer-deps
```

### 2. 构建失败

如果构建失败，可以尝试以下方法：

1. 清理缓存：`npm run clean`
2. 重新安装依赖：`npm install`
3. 检查配置文件是否正确
4. 检查代码是否有语法错误

### 3. 平台特定功能

对于平台特定的功能，建议使用条件编译：

```javascript
// #ifdef H5
// H5特定代码
// #endif

// #ifdef MP-WEIXIN
// 微信小程序特定代码
// #endif

// #ifdef MP-ALIPAY
// 支付宝小程序特定代码
// #endif

// #ifdef MP-TOUTIAO
// 抖音小程序特定代码
// #endif

// #ifdef RN
// React Native特定代码
// #endif
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18+ | 前端框架 |
| TypeScript | 5+ | 类型系统 |
| Taro | 4+ | 多平台框架 |
| Vite | 5+ | 构建工具 |
| React Navigation | 7+ | 路由管理 |
| Taro UI | 3+ | UI组件库 |
| Axios | 1+ | HTTP客户端 |
| Redux | 8+ | 状态管理 |
| Jest | 29+ | 测试框架 |

## 总结

本项目使用 Taro 框架实现了多平台支持，覆盖了 Web、微信小程序、支付宝小程序、抖音小程序和 React Native 等多种平台。在开发过程中，需要注意平台差异，使用平台检测工具和平台特定样式，确保在不同平台上都能提供良好的用户体验。
