// 补丁脚本：修复 @dcloudio/uni-app 的 Vue 内部 API 导入问题
const fs = require('fs')
const path = require('path')

const files = [
  path.join(__dirname, '..', 'node_modules', '@dcloudio', 'uni-app', 'dist', 'uni-app.es.js'),
  path.join(__dirname, '..', 'node_modules', '@dcloudio', 'uni-app', 'dist-x', 'uni-app.es.js')
]

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}, skipping...`)
    return
  }

  let content = fs.readFileSync(filePath, 'utf-8')

  // 检查是否需要修补
  if (!content.includes("from 'vue'") || !content.includes('isInSSRComponentSetup')) {
    console.log(`File ${filePath} doesn't need patching or already patched`)
    return
  }

  // 替换导入语句
  // 原来: import { shallowRef, ref, getCurrentInstance, isInSSRComponentSetup, injectHook } from 'vue';
  // 修改为从 @vue/runtime-core 导入，但 @vue/runtime-core 不导出这些
  // 所以我们需要一个不同的方法：创建一个兼容模块

  // 最简单的解决方案：从 vue 移除这些导入，但在运行时提供它们
  // 由于 vue.runtime.esm-bundler.js 不包含这些，我们需要从内部获取

  // 实际上，最好的方法是创建一个自定义的 vue shim
  // 但这里我们采用另一种方法：修改 uni-app 代码，使用条件导入

  const originalImport = "import { shallowRef, ref, getCurrentInstance, isInSSRComponentSetup, injectHook } from 'vue';"
  const newImport = `import { shallowRef, ref, getCurrentInstance } from 'vue';
// injectHook and isInSSRComponentSetup are internal APIs - provide fallbacks
const isInSSRComponentSetup = false;
const injectHook = (type, hook, target) => {
  if (!target) return hook;
  const hooks = target[type] || (target[type] = []);
  hooks.push(hook);
  return hook;
};`

  if (content.includes(originalImport)) {
    content = content.replace(originalImport, newImport)
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`Patched: ${filePath}`)
  } else {
    console.log(`Import pattern not found in: ${filePath}`)
  }
})

console.log('Patch complete!')
