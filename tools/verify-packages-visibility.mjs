#!/usr/bin/env node
/**
 * GitHub Packages 可见性核验 / 一键置 Public 工具
 * ------------------------------------------------------------------
 * 用途：
 *   1. 核验 @afdk1991 下三个 npm 包的当前可见性（public / private）。
 *   2. 可选：带 write:packages 权限的令牌时，一键把包设为 public。
 *
 * 背景：
 *   GitHub 的 npm registry 对「所有」请求强制鉴权（匿名统一 403，
 *   无法据此判断公私）。要确定性地查看/修改可见性，必须用一个带
 *   read:packages（查看）和 write:packages（修改）scope 的令牌。
 *
 * 用法：
 *   # 仅查看（令牌只需 read:packages）
 *   GITHUB_TOKEN=ghp_xxx node tools/verify-packages-visibility.mjs
 *
 *   # 查看并一键置 Public（令牌需 write:packages）
 *   GITHUB_TOKEN=ghp_xxx node tools/verify-packages-visibility.mjs --set-public
 *
 * 取令牌：
 *   GitHub → Settings → Developer settings → Personal access tokens →
 *   Fine-grained 或 Classic，勾选 read:packages（查看）/ write:packages（修改）。
 *   包归属用户必须与令牌所有者一致（本脚本默认 afdk1991）。
 */

import https from 'node:https';

const USERNAME = process.env.GITHUB_USER || 'afdk1991';
const TOKEN = process.env.GITHUB_TOKEN;
const SET_PUBLIC = process.argv.includes('--set-public');

const PACKAGES = ['shared-map', 'shared-http', 'shared-config'];

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'api.github.com',
        path,
        method,
        headers: {
          'User-Agent': 'verify-packages-visibility',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
          ...(data ? { 'Content-Type': 'application/json' } : {}),
        },
      },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          let json = null;
          try {
            json = buf ? JSON.parse(buf) : null;
          } catch {
            /* 非 JSON（如 204） */
          }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getVisibility(pkg) {
  const { status, json } = await request(
    'GET',
    `/users/${USERNAME}/packages/npm/${pkg}`
  );
  if (status === 200 && json) return { status, visibility: json.visibility };
  if (status === 401)
    return { status, error: '401 鉴权失败：令牌无效或缺少 read:packages' };
  if (status === 404)
    return { status, error: '404：包不存在，或令牌无权查看（即使是 public 也需鉴权）' };
  return { status, error: json?.message || `HTTP ${status}` };
}

async function setPublic(pkg) {
  const { status, json } = await request(
    'PUT',
    `/users/${USERNAME}/packages/npm/${pkg}/visibility`,
    { visibility: 'public' }
  );
  if (status === 204) return { ok: true };
  if (status === 401)
    return { ok: false, error: '401：令牌缺少 write:packages' };
  return { ok: false, error: json?.message || `HTTP ${status}` };
}

async function main() {
  if (!TOKEN) {
    console.error('✗ 缺少 GITHUB_TOKEN 环境变量。');
    console.error('  用法：GITHUB_TOKEN=ghp_xxx node tools/verify-packages-visibility.mjs [--set-public]');
    process.exit(2);
  }

  console.log(`# GitHub Packages 可见性核验（用户：${USERNAME}）\n`);
  let allPublic = true;

  for (const pkg of PACKAGES) {
    const v = await getVisibility(pkg);
    if (v.error) {
      console.log(`- ${pkg.padEnd(14)} ⚠ ${v.error} (HTTP ${v.status})`);
      allPublic = false;
      continue;
    }
    const isPublic = v.visibility === 'public';
    if (!isPublic) allPublic = false;
    console.log(
      `- ${pkg.padEnd(14)} 当前可见性 = ${v.visibility}` +
        (isPublic ? '  ✅' : '  🔴 仍 private')
    );

    if (SET_PUBLIC && !isPublic) {
      const r = await setPublic(pkg);
      console.log(
        `    → 置 Public：${r.ok ? '✅ 成功 (HTTP 204)' : '✗ 失败 ' + r.error}`
      );
      if (!r.ok) allPublic = false;
    }
  }

  console.log('');
  if (allPublic) {
    console.log('✅ 三个包均为 public，无需进一步操作。');
  } else if (!SET_PUBLIC) {
    console.log('🔴 仍有包非 public。带 --set-public 重跑（需 write:packages 令牌）可一键修正，');
    console.log('   或在网页端手动操作：github.com/users/afdk1991/packages → 各包 → Package settings → Public。');
  } else {
    console.log('⚠ 部分包未能置 Public，见上方失败原因（多为令牌权限不足）。');
  }
}

main().catch((e) => {
  console.error('脚本异常：', e.message);
  process.exit(1);
});
