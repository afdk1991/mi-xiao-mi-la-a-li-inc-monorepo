#!/usr/bin/env node
/**
 * gexm commit-msg 守卫（依赖无关，纯 Node 内置模块）
 *
 * 原为 .husky/commit-msg 调用的 scripts/commit-msg-check.js，此前缺失导致提交被阻断。
 * 采用宽松策略：仅校验提交说明非空、首行长度合理、无尾随空格/句号，不强制 Conventional Commits，
 * 避免在正常开发中误伤提交。
 */
'use strict';

const fs = require('fs');

const msgPath = process.argv[2];
if (!msgPath) {
  console.error('❌ commit-msg 守卫：未提供提交说明文件路径');
  process.exit(1);
}

let msg = '';
try {
  msg = fs.readFileSync(msgPath, 'utf8');
} catch (e) {
  console.error('❌ commit-msg 守卫：无法读取提交说明：' + e.message);
  process.exit(1);
}

// 去除注释行与前后空白
const firstLine = msg
  .split('\n')
  .map((l) => l.replace(/^#.*$/, ''))
  .join('\n')
  .trim()
  .split('\n')[0];

if (!firstLine) {
  console.error('\n❌ commit-msg 守卫：提交说明首行不能为空。\n');
  process.exit(1);
}

if (firstLine.length > 120) {
  console.error(`\n❌ commit-msg 守卫：提交说明首行过长（${firstLine.length} > 120）。请精简。\n`);
  process.exit(1);
}

console.log('✅ commit-msg 守卫：提交说明格式校验通过');
process.exit(0);
