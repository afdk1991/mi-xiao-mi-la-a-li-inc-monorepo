// 轻量链接检查（零依赖）：动态 import 所有 src 模块（入口 index.ts 由 isMain 守卫不会启动服务），
// 任一模块语法/链接错误都会在此暴露。type-level 检查请在装有 typescript 的环境跑 tsc。
// 用法：node scripts/lint.mjs

const modules = ['./index.ts', './db.ts', './auth.ts', './http.ts', './geo.ts', './optimize.ts', './extmap.ts', './attractions.ts', './store.ts', './types.ts']

let failed = 0
for (const m of modules) {
  try {
    await import(new URL(`../src/${m.slice(2)}`, import.meta.url).href)
    console.log(`ok  ${m}`)
  } catch (err) {
    failed++
    console.error(`ERR ${m}:`, err instanceof Error ? err.message : err)
  }
}
if (failed > 0) {
  console.error(`\n${failed} module(s) failed to link`)
  process.exit(1)
}
console.log(`\n${modules.length} modules linked ok`)
