#!/usr/bin/env node
/**
 * APPsp 版本号单一事实源 + 语义化递增脚本（零依赖）
 *
 * 事实源：package.json 的 "version" 字段（标准 semver MAJOR.MINOR.PATCH）
 * 同步目标（四个位置必须保持一致）：
 *   1. package.json              -> "version"
 *   2. src/config/index.ts      -> APP_INFO.version
 *   3. src/manifest.json        -> versionName + versionCode   (HBuilderX 云打包通道)
 *   4. android-shell/app/build.gradle -> versionName + versionCode (本地 Gradle 壳通道)
 *
 * versionCode 规则（两套打包通道必须共用同一整数，否则互相视为降级无法升级）：
 *   versionCode = MAJOR * 10000 + MINOR * 100 + PATCH
 *   例：1.0.0 -> 10000，1.2.3 -> 10203，2.0.0 -> 20000
 *   支持 MINOR/PATCH 各 0~99。该值恒大于历史遗留的 gradle(6) 与 manifest(100)，旧包可平滑升级。
 *
 * 用法：
 *   node scripts/bump-version.js [major|minor|patch]   # 相对递增当前版本
 *   node scripts/bump-version.js 1.2.3                 # 直接指定目标版本
 *   node scripts/bump-version.js --dry-run [major|minor|patch|1.2.3]  # 只预览不改文件
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG = path.join(ROOT, 'package.json');
const CONFIG_TS = path.join(ROOT, 'src', 'config', 'index.ts');
const MANIFEST = path.join(ROOT, 'src', 'manifest.json');
const GRADLE = path.join(ROOT, 'android-shell', 'app', 'build.gradle');

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
function readText(p) {
  return fs.readFileSync(p, 'utf8');
}
function writeText(p, s) {
  fs.writeFileSync(p, s, 'utf8');
}

function toVersionCode(major, minor, patch) {
  return major * 10000 + minor * 100 + patch;
}

function parseTarget(arg, current) {
  if (SEMVER_RE.test(arg)) {
    const [, M, m, p] = arg.match(SEMVER_RE);
    return { major: +M, minor: +m, patch: +p };
  }
  const bump = arg.toLowerCase();
  if (!['major', 'minor', 'patch'].includes(bump)) {
    throw new Error(`无效参数 "${arg}"：请传 major|minor|patch 或显式版本 X.Y.Z`);
  }
  const cur = SEMVER_RE.exec(current);
  if (!cur) throw new Error(`当前版本 "${current}" 不是合法 semver`);
  let [major, minor, patch] = [+cur[1], +cur[2], +cur[3]];
  if (bump === 'major') { major += 1; minor = 0; patch = 0; }
  else if (bump === 'minor') { minor += 1; patch = 0; }
  else { patch += 1; }
  return { major, minor, patch };
}

/** 将 version / versionCode 写入单个文件，返回是否发生实际变更 */
function applyToPackage(version) {
  const pkg = readJson(PKG);
  if (pkg.version === version) return false;
  pkg.version = version;
  writeJson(PKG, pkg);
  return true;
}

function applyToConfigTs(version) {
  const s = readText(CONFIG_TS);
  const re = /(\bversion\s*:\s*')([^']*)(')/;
  if (!re.test(s)) throw new Error('未能在 src/config/index.ts 定位 version 字段');
  const next = s.replace(re, (_m, pre, _old, post) => `${pre}${version}${post}`);
  writeText(CONFIG_TS, next);
}

function applyToManifest(version, code) {
  const s = readText(MANIFEST);
  const reName = /("versionName"\s*:\s*")([^"]*)(")/;
  const reCode = /("versionCode"\s*:\s*")(\d+)(")/;
  if (!reName.test(s) || !reCode.test(s))
    throw new Error('未能在 src/manifest.json 定位 versionName/versionCode');
  const next = s
    .replace(reName, (_m, pre, _old, post) => `${pre}${version}${post}`)
    .replace(reCode, (_m, pre, _old, post) => `${pre}${code}${post}`);
  writeText(MANIFEST, next);
}

function applyToGradle(version, code) {
  const s = readText(GRADLE);
  const reName = /(versionName\s+")([^"]*)(")/;
  const reCode = /(versionCode\s+)(\d+)/;
  if (!reName.test(s) || !reCode.test(s))
    throw new Error('未能在 android-shell/app/build.gradle 定位 versionName/versionCode');
  const next = s
    .replace(reName, (_m, pre, _old, post) => `${pre}${version}${post}`)
    .replace(reCode, (_m, pre, _old) => `${pre}${code}`);
  writeText(GRADLE, next);
}

function verify(major, minor, patch, code) {
  const version = `${major}.${minor}.${patch}`;
  const errors = [];
  if (readJson(PKG).version !== version) errors.push('package.json version 不符');
  if (!new RegExp(`version\\s*:\\s*'${version}'`).test(readText(CONFIG_TS)))
    errors.push('src/config/index.ts APP_INFO.version 不符');
  const man = readText(MANIFEST);
  if (!new RegExp(`"versionName"\\s*:\\s*"${version}"`).test(man))
    errors.push('src/manifest.json versionName 不符');
  if (!new RegExp(`"versionCode"\\s*:\\s*"${code}"`).test(man))
    errors.push('src/manifest.json versionCode 不符');
  const gr = readText(GRADLE);
  if (!new RegExp(`versionName\\s+"${version}"`).test(gr))
    errors.push('android-shell/app/build.gradle versionName 不符');
  if (!new RegExp(`versionCode\\s+${code}`).test(gr))
    errors.push('android-shell/app/build.gradle versionCode 不符');
  return errors;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const targetArg = args.find((a) => a !== '--dry-run');
  if (!targetArg) {
    console.error('用法: node scripts/bump-version.js [major|minor|patch|X.Y.Z] [--dry-run]');
    process.exit(1);
  }

  const current = readJson(PKG).version;
  let next;
  try {
    next = parseTarget(targetArg, current);
  } catch (e) {
    console.error('✗ ' + e.message);
    process.exit(1);
  }
  const version = `${next.major}.${next.minor}.${next.patch}`;
  const code = toVersionCode(next.major, next.minor, next.patch);

  console.log(`当前版本: ${current}`);
  console.log(`目标版本: ${version}  (versionCode=${code} = ${next.major}*10000+${next.minor}*100+${next.patch})`);
  console.log(dryRun ? '模式: 预览（不写文件）' : '模式: 写入');

  if (!dryRun) {
    applyToPackage(version);
    applyToConfigTs(version);
    applyToManifest(version, code);
    applyToGradle(version, code);
  }

  const errors = verify(next.major, next.minor, next.patch, code);
  console.log('\n=== 四位置一致性校验 ===');
  const rows = [
    ['package.json', 'version', version],
    ['src/config/index.ts', 'APP_INFO.version', version],
    ['src/manifest.json', 'versionName', version],
    ['src/manifest.json', 'versionCode', String(code)],
    ['android-shell/app/build.gradle', 'versionName', version],
    ['android-shell/app/build.gradle', 'versionCode', String(code)],
  ];
  for (const [f, k, v] of rows) console.log(`  ${f.padEnd(34)} ${k.padEnd(16)} = ${v}`);

  if (errors.length) {
    console.error('\n✗ 校验失败:\n  - ' + errors.join('\n  - '));
    process.exit(1);
  }
  console.log('\n✓ 版本号与 versionCode 四位置全部一致');
  if (!dryRun) {
    console.log(`\n下个发布包命名建议: 优选-v${version}-android.apk`);
  }
}

main();
