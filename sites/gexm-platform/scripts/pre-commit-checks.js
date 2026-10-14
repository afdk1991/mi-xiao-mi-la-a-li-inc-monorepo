#!/usr/bin/env node
/**
 * gexm pre-commit 守卫（依赖无关，纯 Node 内置模块）
 *
 * 职责：
 *  1. 阻止任何非 .env.example 的 .env 文件被暂存（防止密钥再次泄露进仓库）
 *  2. 扫描暂存内容中新增行是否命中常见密钥/私钥特征，命中则阻断提交
 *
 * 原为 .husky/pre-commit 调用的 scripts/pre-commit-checks.js，
 * 此前该文件缺失导致 husky 提交被 MODULE_NOT_FOUND 阻断。本脚本无外部依赖，
 * 在未执行 npm install 的环境下也可正常运行。
 */
'use strict';

const { execSync } = require('child_process');

function git(args) {
  return execSync(`git ${args}`, { encoding: 'utf8' });
}

// 1) 取暂存文件（Added/Copied/Modified）
let staged = [];
try {
  staged = git('diff --cached --name-only --diff-filter=ACM')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
} catch (e) {
  // 非 git 仓库等异常，放行
  process.exit(0);
}

// 守卫脚本自身豁免（源码中包含密钥特征的正则字面量，避免自我误报）
const SELF = 'scripts/pre-commit-checks.js';

// 2) 阻断非 example 的 .env 文件
const envRe = /(^|[/\\])\.env(\.[A-Za-z0-9_-]+)?$/;
const blockedEnv = staged.filter(
  (f) => envRe.test(f) && !/\.env\.example$/.test(f)
);
if (blockedEnv.length) {
  console.error('\n❌ 预提交守卫：检测到 .env 文件被暂存（含密钥风险），已阻止提交：');
  blockedEnv.forEach((f) => console.error('   - ' + f));
  console.error('   请改用 .env.example 模板；真实密钥通过密钥管理 / CI 变量注入，不要入库。\n');
  process.exit(1);
}

// 3) 扫描新增行中的密钥特征
const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /github_pat_[0-9A-Za-z_]{20,}/,
  /gh[pousr]_[0-9A-Za-z]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /xox[baprs]-[0-9A-Za-z-]{10,}/,
  /aws_secret_access_key\s*=\s*\S+/i,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
  /(cf|CF)(r_|u_)?[A-Za-z0-9]{30,}/, // Cloudflare 类令牌
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT
];

// 二进制/非文本文件跳过
const BINARY_RE = /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|eot|otf|zip|gz|tgz|tar|7z|rar|pdf|bin|exe|dll|so|dylib|wasm|mp4|mov|avi)$/i;

let hit = false;
for (const f of staged) {
  if (f === SELF) continue;
  if (BINARY_RE.test(f)) continue;
  let diff;
  try {
    diff = git(`diff --cached -U0 -- "${f}"`);
  } catch {
    continue;
  }
  const added = diff
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  for (const line of added) {
    for (const p of SECRET_PATTERNS) {
      if (p.test(line)) {
        console.error(`\n❌ 预提交守卫：文件 "${f}" 新增内容命中密钥特征：`);
        console.error('   ' + line.trim().slice(0, 140));
        hit = true;
        break;
      }
    }
    if (hit) break;
  }
  if (hit) break;
}

if (hit) {
  console.error('\n   请移除硬编码密钥，改用环境变量 / 密钥管理服务。提交已阻止。\n');
  process.exit(1);
}

console.log('✅ pre-commit-checks: 无 .env 误提交、无密钥泄露特征');
process.exit(0);
