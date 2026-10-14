#!/usr/bin/env node
/**
 * 仓库内 tsc 定位器（零依赖）
 * 解决共享包无 node_modules 时 `tsc` 不在 PATH 的问题。
 * 用法：node tsc.mjs --noEmit -p tsconfig.json
 * 查找顺序：调用目录向上 → 仓库根 → 各分组已安装依赖的子项目。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const candidates = []

// 1) 沿调用目录向上查找
let d = process.cwd()
while (true) {
  candidates.push(join(d, 'node_modules', 'typescript', 'bin', 'tsc'))
  const parent = dirname(d)
  if (parent === d) break
  d = parent
}
// 2) 仓库根
candidates.push(join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'))
// 3) 各分组子项目已安装的 typescript
for (const g of ['apps', 'services', 'sites', 'shared', 'tools']) {
  const gd = join(ROOT, g)
  if (!existsSync(gd)) continue
  try {
    for (const e of readdirSync(gd)) {
      candidates.push(join(gd, e, 'node_modules', 'typescript', 'bin', 'tsc'))
    }
  } catch { /* ignore */ }
}

const tsc = candidates.find(existsSync)
if (!tsc) {
  console.error('[tsc.mjs] 未找到 typescript：请先在任一子项目执行 npm install，或在仓库根 npm i -D typescript')
  process.exit(1)
}
const r = spawnSync(process.execPath, [tsc, ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(r.status ?? 1)
