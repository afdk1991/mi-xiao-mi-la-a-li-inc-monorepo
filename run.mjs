#!/usr/bin/env node
/**
 * 统一项目编排器（零依赖，Node >= 18）
 * 本文件是整个单体项目的唯一命令行入口。
 *
 * 用法：
 *   node run.mjs list                 列出全部模块
 *   node run.mjs dev <name>           启动模块开发服务
 *   node run.mjs build <name|all>     构建模块
 *   node run.mjs typecheck <name|all> 类型检查
 *   node run.mjs verify               全量验证（typecheck + build）
 *   node run.mjs clean <name|all>     清理构建产物（dist/build/out）
 *   node run.mjs setup                为缺依赖的 Node 模块执行 npm install（需网络）
 *
 * 等效 npm 入口：npm run list / dev / build / typecheck / verify / clean / setup
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const GROUPS = ['apps', 'services', 'sites', 'tools', 'shared']
const SKIP = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'release',
  '.edgeone', '.cache', '__pycache__', '.output', 'win-unpacked',
  'unpacked', '.venv', 'venv', 'android', 'ios',
])
const TYPE_LABEL = { node: 'Node', python: 'Python', php: 'PHP', go: 'Go', scripts: '脚本', aggregator: '聚合壳', none: '—' }

const log = (...a) => console.log(...a)
const isDir = (p) => { try { return statSync(p).isDirectory() } catch { return false } }
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null } }

/** 发现全部模块：各分组直属子项目 + 深度 1 的嵌套子包 */
function discover() {
  const mods = []
  const add = (dir, id) => {
    const pj = join(dir, 'package.json')
    mods.push({ dir, id, pkg: existsSync(pj) ? readJson(pj) : null })
  }
  for (const g of GROUPS) {
    const gd = join(ROOT, g)
    if (!isDir(gd)) continue
    for (const e of readdirSync(gd)) {
      const p = join(gd, e)
      if (!isDir(p) || e.startsWith('.')) continue
      add(p, `${g}/${e}`)
      for (const sub of readdirSync(p)) {
        const sp = join(p, sub)
        if (!isDir(sp) || sub.startsWith('.') || SKIP.has(sub)) continue
        if (existsSync(join(sp, 'package.json'))) add(sp, `${g}/${e}/${sub}`)
      }
    }
  }
  return mods
}

function typeOf(m) {
  if (m.pkg?.mxm?.type) return m.pkg.mxm.type
  if (existsSync(join(m.dir, 'go.mod'))) return 'go'
  if (m.pkg) return 'node'
  let php = false, py = false
  try {
    for (const f of readdirSync(m.dir)) {
      if (f.endsWith('.php')) php = true
      if (f.endsWith('.py')) py = true
    }
  } catch { /* ignore */ }
  if (php) return 'php'
  if (py) return 'python'
  return 'none'
}

const hasNm = (m) => existsSync(join(m.dir, 'node_modules'))
const hasDeps = (pkg) => {
  const d = pkg?.dependencies, dd = pkg?.devDependencies
  return Boolean((d && Object.keys(d).length) || (dd && Object.keys(dd).length))
}
/** 深度 1 嵌套子包是否声明了依赖（用于 workspaces 根模块的缺依赖判断） */
function nestedHasDeps(dir) {
  try {
    for (const sub of readdirSync(dir)) {
      const sp = join(dir, sub)
      if (!isDir(sp) || sub.startsWith('.') || SKIP.has(sub)) continue
      const pkg = readJson(join(sp, 'package.json'))
      if (pkg && hasDeps(pkg)) return true
    }
  } catch { /* ignore */ }
  return false
}

function cmdList() {
  const mods = discover()
  log(`\n统一项目模块清单（共 ${mods.length} 个模块）\n`)
  const fmtScripts = (s) => {
    if (!s) return '—'
    const keys = Object.keys(s)
    const shown = keys.slice(0, 6).join(',')
    return keys.length > 6 ? `${shown} …(+${keys.length - 6})` : shown
  }
  const head = ['模块', '包名', '类型', 'node_modules', '脚本']
  const rows = mods.map((m) => [
    m.id,
    m.pkg?.name || '(无 package.json)',
    TYPE_LABEL[typeOf(m)] || '?',
    hasNm(m) ? '✅' : typeOf(m) === 'node' && hasDeps(m.pkg) ? '❌ 缺' : '—',
    fmtScripts(m.pkg?.scripts),
  ])
  const w = head.map((_, i) => Math.max(...rows.map((r) => String(r[i]).length), head[i].length))
  const line = (cells) => '  ' + cells.map((c, i) => String(c).padEnd(w[i])).join('  ')
  log(line(head))
  log('  ' + w.map((x) => '─'.repeat(x)).join('  '))
  for (const r of rows) log(line(r))
  log('\n入口：npm run <list|dev|build|typecheck|verify|clean|setup>，或 node run.mjs <cmd> [name|all]\n')
}

function run(cmd, cwd) {
  const r = spawnSync(cmd, { cwd, shell: true, stdio: 'inherit' })
  return r.status === 0 ? 'ok' : 'fail'
}

/** 定位 tsc：先沿目录树向上，再扫描各分组已安装依赖的项目 */
function findTsc(startDir) {
  let d = startDir
  while (true) {
    const p = join(d, 'node_modules', 'typescript', 'bin', 'tsc')
    if (existsSync(p)) return p
    const parent = dirname(d)
    if (parent === d) break
    d = parent
  }
  for (const g of GROUPS) {
    const gd = join(ROOT, g)
    if (!isDir(gd)) continue
    for (const e of readdirSync(gd)) {
      const p = join(gd, e, 'node_modules', 'typescript', 'bin', 'tsc')
      if (existsSync(p)) return p
    }
  }
  return null
}

function buildModule(m) {
  const t = typeOf(m)
  if (t === 'node' || t === 'aggregator') {
    if (m.pkg?.scripts?.build) {
      if (t === 'node') {
        if (hasDeps(m.pkg) && !hasNm(m)) return { status: 'skip', why: '缺 node_modules（需先 npm install）' }
        if (!hasDeps(m.pkg) && nestedHasDeps(m.dir) && !hasNm(m)) return { status: 'skip', why: '子包缺 node_modules（需先 npm install）' }
      }
      return { status: run('npm run build', m.dir) }
    }
    return { status: 'skip', why: '无 build 脚本' }
  }
  if (t === 'python') return { status: run('python -m compileall -q .', m.dir) }
  if (t === 'php') return { status: 'skip', why: 'PHP 模块（本机无 PHP 运行时，部署时由 WP 主机校验）' }
  if (t === 'go') return { status: run('go build ./...', m.dir) }
  return { status: 'skip', why: '无可构建产物' }
}

function typecheckModule(m) {
  const t = typeOf(m)
  if ((t !== 'node' && t !== 'aggregator') || !existsSync(join(m.dir, 'tsconfig.json'))) {
    return { status: 'skip', why: '非 TS 模块或无 tsconfig' }
  }
  if (hasDeps(m.pkg) && !hasNm(m)) return { status: 'skip', why: '缺 node_modules' }
  if (!hasDeps(m.pkg) && nestedHasDeps(m.dir) && !hasNm(m)) return { status: 'skip', why: '子包缺 node_modules' }
  const tsc = findTsc(m.dir)
  if (!tsc) return { status: 'skip', why: '未找到 typescript' }
  const cfg = readJson(join(m.dir, 'tsconfig.json'))
  const cmdTsc = cfg?.references ? `node "${tsc}" -b` : `node "${tsc}" --noEmit`
  return { status: run(cmdTsc, m.dir) }
}

function summary(title, results) {
  log(`\n${title}`)
  const icon = { ok: '✅', fail: '❌', skip: '⏭️ ' }
  let ok = 0, fail = 0, skip = 0
  for (const r of results) {
    log(`  ${icon[r.status] || '?'} ${String(r.id).padEnd(36)} ${r.status === 'skip' ? '跳过：' + (r.why || '') : ''}`)
    if (r.status === 'ok') ok++; else if (r.status === 'fail') fail++; else skip++
  }
  log(`\n  合计：✅ ${ok} 通过 ｜ ❌ ${fail} 失败 ｜ ⏭️  ${skip} 跳过\n`)
  return fail === 0
}

function resolveTargets(arg) {
  const mods = discover()
  if (!arg || arg === 'all') return mods
  const hit = mods.filter((m) => m.id === arg || m.pkg?.name === arg || m.id.endsWith(`/${arg}`))
  if (!hit.length) {
    log(`未找到模块：${arg}\n可用模块：`)
    for (const m of mods) log('  - ' + m.id)
    process.exit(1)
  }
  return hit
}

const [cmd, target] = process.argv.slice(2)

switch (cmd) {
  case 'list':
    cmdList()
    break
  case 'dev': {
    const m = resolveTargets(target)[0]
    if (typeOf(m) !== 'node' || !m.pkg?.scripts?.dev) { log(`模块 ${m.id} 无 dev 脚本`); process.exit(1) }
    if (hasDeps(m) && !hasNm(m)) { log(`模块 ${m.id} 缺 node_modules，请先 npm install`); process.exit(1) }
    log(`启动 ${m.id} 开发服务…（Ctrl+C 退出）`)
    run('npm run dev', m.dir)
    break
  }
  case 'build': {
    const mods = resolveTargets(target)
    log(`\n构建 ${mods.length} 个模块…`)
    if (!summary('构建结果', mods.map((m) => ({ id: m.id, ...buildModule(m) })))) process.exit(1)
    break
  }
  case 'typecheck': {
    const mods = resolveTargets(target)
    log(`\n类型检查 ${mods.length} 个模块…`)
    if (!summary('类型检查结果', mods.map((m) => ({ id: m.id, ...typecheckModule(m) })))) process.exit(1)
    break
  }
  case 'verify': {
    const mods = discover()
    log(`\n全量验证 ${mods.length} 个模块（typecheck + build）…`)
    const ok1 = summary('① 类型检查', mods.map((m) => ({ id: m.id, ...typecheckModule(m) })))
    const ok2 = summary('② 构建', mods.map((m) => ({ id: m.id, ...buildModule(m) })))
    if (!ok1 || !ok2) process.exit(1)
    break
  }
  case 'clean': {
    const mods = resolveTargets(target)
    for (const m of mods) {
      for (const d of ['dist', 'build', 'out']) {
        const p = join(m.dir, d)
        if (existsSync(p)) { rmSync(p, { recursive: true, force: true }); log(`  已删除 ${relative(ROOT, p)}`) }
      }
    }
    break
  }
  case 'setup': {
    const mods = discover().filter((m) => typeOf(m) === 'node' && m.pkg && !hasNm(m) && (hasDeps(m.pkg) || nestedHasDeps(m.dir)))
    log(`\n以下 ${mods.length} 个 Node 模块缺少依赖，将逐个 npm install（需要网络）：`)
    for (const m of mods) log('  - ' + m.id)
    for (const m of mods) { log(`\n=== npm install: ${m.id} ===`); run('npm install', m.dir) }
    break
  }
  default:
    log('用法：node run.mjs <list|dev|build|typecheck|verify|clean|setup> [name|all]')
    log('  npm run            查看全部入口命令')
    log('  npm run list       模块清单')
    log('  npm run verify     全量验证')
}
