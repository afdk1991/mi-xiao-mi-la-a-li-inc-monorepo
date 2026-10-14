/**
 * @file 条件编译注释规范
 * @description uni-app 跨平台条件编译的使用规范和最佳实践
 *
 * ============================================================================
 * 一、基础语法
 * ============================================================================
 *
 * uni-app 使用条件编译来处理不同平台的代码差异。
 * 条件编译通过特殊的注视注释来实现，支持以下语法：
 *
 * | 语法          | 说明                                      |
 * |--------------|-------------------------------------------|
 * | #ifdef xxx   | 如果定义了 xxx 平台，则编译此处代码         |
 * | #ifndef xxx  | 如果未定义 xxx 平台，则编译此处代码         |
 * | #endif       | 结束条件编译                               |
 * | #else        | 否则（可与 #ifdef/#ifndef 配合使用）       |
 * | #elif xxx    | 否则如果（可与 #ifdef/#ifndef 配合使用）   |
 *
 * ============================================================================
 * 二、平台标识符
 * ============================================================================
 *
 * | 平台标识符     | 说明                      | 运行环境        |
 * |--------------|---------------------------|-----------------|
 * | H5           | H5 网页端                  | 浏览器          |
 * | MP-WEIXIN    | 微信小程序                  | 微信客户端      |
 * | MP-ALIPAY    | 支付宝小程序                | 支付宝客户端    |
 * | MP-BAIDU     | 百度小程序                  | 百度客户端      |
 * | MP-TOUTIAO   | 抖音小程序                  | 抖音客户端      |
 * | APP-PLUS     | uni-app 原生 App           | Android/iOS     |
 * | APP-ANDROID  | Android 原生 App（仅App）   | Android        |
 * | APP-IOS      | iOS 原生 App（仅App）      | iOS            |
 *
 * ============================================================================
 * 三、目录结构规范
 * ============================================================================
 *
 * 建议按照以下目录结构组织跨平台代码：
 *
 * src/
 * ├── platform/           # 平台适配层（推荐）
 * │   ├── index.js        # 统一导出
 * │   ├── storage.js      # 存储适配
 * │   ├── payment.js      # 支付适配
 * │   ├── share.js        # 分享适配
 * │   └── image.js        # 图片处理适配
 * ├── utils/
 * │   └── index.js        # 通用工具函数
 * └── pages/              # 页面组件
 *     └── components/     # 页面级组件
 *
 * ============================================================================
 * 四、使用规范
 * ============================================================================
 *
 * 4.1 优先使用平台适配层
 *
 * 跨平台功能应优先在 src/platform/ 目录下实现适配函数，
 * 页面代码通过导入这些函数来使用，而不是直接使用条件编译。
 *
 * ✅ 推荐写法：
 * // page.vue
 * import { storage } from '@/platform';
 * storage.set('key', value);
 *
 * ❌ 不推荐写法：
 * // page.vue
 * // #ifdef H5
 * localStorage.setItem('key', JSON.stringify(value));
 * // #endif
 *
 * 4.2 条件编译注释位置
 *
 * 条件编译注视应位于代码块的开头或结尾，不能跨文件。
 * 每个 #ifdef 必须有对应的 #endif。
 *
 * ✅ 正确：
 * // #ifdef H5
 * window.addEventListener('error', handler);
 * // #endif
 *
 * ❌ 错误（不应跨文件）：
 * // #ifdef H5
 * // some-file.js (另一个文件)
 * // #endif
 *
 * 4.3 嵌套规则
 *
 * 条件编译可以嵌套，但层数不宜过多（建议不超过3层）。
 *
 * ✅ 示例：
 * // #ifdef H5
 * if (isH5) {
 *   // #ifdef MP-WEIXIN
 *   // 不会执行到这里
 *   // #endif
 *   // H5 特定代码
 * }
 * // #endif
 *
 * ============================================================================
 * 五、常见使用场景
 * ============================================================================
 *
 * 5.1 存储差异
 *
 * // #ifdef H5
 * localStorage.setItem('key', value);
 * // #endif
 * // #ifdef MP-WEIXIN
 * wx.setStorageSync('key', value);
 * // #endif
 * // #ifdef APP-PLUS
 * plus.storage.setItem('key', value);
 * // #endif
 *
 * 5.2 分享功能
 *
 * // #ifdef MP-WEIXIN
 * wx.showShareMenu({ withShareTicket: true });
 * // #endif
 * // #ifdef H5
 * if (navigator.share) {
 *   navigator.share({ title, url });
 * }
 * // #endif
 *
 * 5.3 网络状态
 *
 * // #ifdef H5
 * window.addEventListener('online', handleOnline);
 * window.addEventListener('offline', handleOffline);
 * // #endif
 * // #ifdef APP-PLUS
 * uni.onNetworkStatusChange(handleChange);
 * // #endif
 *
 * 5.4 支付
 *
 * // #ifdef MP-WEIXIN
 * wx.requestPayment({ ... paymentData });
 * // #endif
 * // #ifdef MP-ALIPAY
 * my.tradePay({ tradeNO: paymentData.tradeNO });
 * // #endif
 * // #ifdef APP-PLUS
 * uni.requestPayment({ provider: 'wxpay', ... });
 * // #endif
 *
 * ============================================================================
 * 六、注意事项
 * ============================================================================
 *
 * 1. 条件编译是编译时行为，不是运行时判断
 *    - #ifdef 会在构建时被处理，不符合条件的代码不会被编译进最终产物
 *    - 无法使用变量或运行时表达式作为条件
 *
 * 2. 避免过度使用
 *    - 并非所有平台差异都需要条件编译
 *    - uni API 已经封装了大部分跨平台差异（如 uni.request, uni.showToast）
 *
 * 3. 保持代码整洁
 *    - 条件编译块不应过长，建议提取为独立函数
 *    - 考虑使用平台适配层封装复杂逻辑
 *
 * 4. 测试覆盖
 *    - 条件编译的代码难以被单元测试覆盖
 *    - 建议在目标平台进行手动测试验证
 *
 * 5. 注释清晰
 *    - 每个条件编译块应添加注释说明用途
 *    - 标注适用的平台和环境
 *
 * ============================================================================
 * 七、示例代码
 * ============================================================================
 *
 * // ========== 基础用法 ==========
 * // #ifdef H5
 * export function getPlatform() {
 *   return 'h5';
 * }
 * // #endif
 * // #ifdef MP-WEIXIN
 * export function getPlatform() {
 *   return 'mp-weixin';
 * }
 * // #endif
 * // #ifdef APP-PLUS
 * export function getPlatform() {
 *   return 'app-plus';
 * }
 * // #endif
 *
 * // ========== 结合 if-else ==========
 * // #ifdef H5
 * const adapter = h5Adapter;
 * // #elifdef MP-WEIXIN
 * const adapter = wxAdapter;
 * // #else
 * const adapter = defaultAdapter;
 * // #endif
 *
 * // ========== 工具函数封装 ==========
 * export function getStorageAdapter() {
 *   // #ifdef H5
 *   return localStorageAdapter;
 *   // #endif
 *   // #ifdef MP-WEIXIN
 *   return wxStorageAdapter;
 *   // #endif
 *   // #ifdef APP-PLUS
 *   return plusStorageAdapter;
 *   // #endif
 *   return uniStorageAdapter; // fallback
 * }
 *
 * ============================================================================
 */
