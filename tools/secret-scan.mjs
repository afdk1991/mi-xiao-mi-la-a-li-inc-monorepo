#!/usr/bin/env node
/**
 * 敏感信息扫描器（Secret Scanner）
 * ------------------------------------------------------------------
 * 目的：确保 API 密钥 / 令牌 / 数据库凭据 / 私钥 / 环境变量等敏感信息
 *       不会出现在前端代码、页面内容、网络请求或构建产物中。
 *
 * 用法：
 *   node tools/secret-scan.mjs                       # 扫描默认源码范围
 *   node tools/secret-scan.mjs --include-build        # 额外扫描构建产物（dist/build/.next/out）
 *   node tools/secret-scan.mjs --path apps/foo        # 限定目录
 *   node tools/secret-scan.mjs --json                 # 输出 JSON（供 CI 消费）
 *   node tools/secret-scan.mjs --strict               # 命中 🟢 info 也视为失败（CI 门禁用）
 *
 * 退出码：
 *   0 = 未发现敏感信息；1 = 发现需要处理的命中（🔴/🟡，--strict 时含 🟢）；2 = 用法错误
 *
 * 设计要点：
 *   - 只做静态文本扫描，不联网、不上传；
 *   - 命中值一律脱敏输出（仅保留前 4 / 后 4 位），避免二次泄露；
 *   - 占位符（your_xxx / changeme / ${VAR} 等）自动豁免，降低误报；
 *   - 二进制与大文件自动跳过，保证大仓库扫描速度。
 */

import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------- 配置

const ROOT = process.cwd();
const IGNORE_FILE = '.secret-scan-ignore';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB 以上跳过（多为产物或数据）

const args = process.argv.slice(2);
const getArg = (name, def = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : def;
};
const OPT = {
  includeBuild: args.includes('--include-build'),
  json: args.includes('--json'),
  strict: args.includes('--strict'),
  onlyTracked: args.includes('--tracked'),
  target: getArg('--path', '.'),
};

// 默认排除的目录 / 文件
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'coverage', '.cache',
  '.workbuddy', '.idea', '.vscode', '.tmp_probe', '.gopath',
]);
const BUILD_DIRS = new Set(['dist', 'build', '.next', 'out', '.output', '.nuxt', '.svelte-kit']);
const EXCLUDE_FILES = new Set([
  'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb',
  'go.sum', 'Cargo.lock', 'composer.lock',
]);
// 二进制扩展名，直接跳过
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.avif', '.svgz',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp3', '.mp4', '.avi', '.mov', '.webm', '.mkv',
  '.zip', '.tar', '.gz', '.tgz', '.bz2', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.wasm', '.class', '.jar', '.apk', '.aab', '.dmg', '.iso',
  '.min.js', '.min.css', // 压缩产物：由 --include-build 单独处理时再考虑
]);

// ---------------------------------------------------------------- 规则库
// severity: critical(🔴) / high(🟡) / info(🟢)
// 每条规则：{ id, name, severity, pattern, hint }
// 说明：为降低误报，通用型规则只在「键名上下文」命中时才告警（见 KEY_CONTEXT 逻辑）。

const RULES = [
  // ---- 🔴 critical：可直接造成资产损失或数据泄露 ----
  {
    id: 'private-key',
    name: '私钥（RSA/EC/OpenSSH/PGP）',
    severity: 'critical',
    pattern: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH|PGP)?\s*PRIVATE KEY(?: BLOCK)?-----/g,
    hint: '私钥绝不可入库。改为环境变量或密钥管理服务注入，历史提交需重写并从控制台吊销。',
  },
  {
    id: 'db-url-with-cred',
    name: '含凭据的数据库连接串',
    severity: 'critical',
    pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss|amqp|sqlserver):\/\/[^\s:'"/]+:[^\s'@/]{3,}@[^\s'"]+/g,
    hint: '连接串含明文口令。拆分为环境变量（主机/库名/账号/口令分别注入），且仅服务端可读。',
  },
  {
    id: 'wechat-pay-key',
    name: '微信支付 API 密钥 / 商户密钥',
    severity: 'critical',
    pattern: /\b(?:wechat|wx|mch)[_-]?(?:pay|mch|api)?[_-]?(?:key|secret)\b\s*[:=]\s*['"]?([A-Za-z0-9]{32})['"]?/gi,
    hint: '支付密钥泄露可导致资金损失。仅存于服务端安全环境变量，前端不得接触。',
  },
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    severity: 'critical',
    pattern: /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g,
    hint: '云厂商凭据。立即在 IAM 控制台停用并轮换，改用角色（IRSA / Instance Profile）授权。',
  },
  {
    id: 'github-token',
    name: 'GitHub 令牌',
    severity: 'critical',
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,255}\b|\bgithub_pat_[A-Za-z0-9_]{22,255}\b/g,
    hint: '令牌需吊销并重新签发，CI 场景改用 GITHUB_TOKEN 或最小权限 PAT。',
  },
  {
    id: 'openai-key',
    name: 'OpenAI / 通用 AI 服务密钥',
    severity: 'critical',
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
    hint: 'AI 服务密钥按量计费，泄露即被盗刷。改由服务端代理转发，前端只调自家接口。',
  },
  {
    id: 'google-api-key',
    name: 'Google API Key',
    severity: 'critical',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    hint: '在 Google Cloud 控制台限制来源并轮换。',
  },
  {
    id: 'slack-token',
    name: 'Slack Token',
    severity: 'critical',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,72}\b/g,
    hint: '立即吊销并重建 Slack App 凭据。',
  },

  // ---- 🟡 high：第三方 API Key，泄露可被盗用/产生费用 ----
  {
    id: 'amap-key',
    name: '高德地图 Key / 安全密钥',
    severity: 'high',
    // 32 位十六进制，且键名含 amap/gaode/map.*key/security
    pattern: /\b(?:amap|gaode|gao_de|map)?[_-]?(?:web|js|service|server|android|ios)?[_-]?(?:key|ak|security|security_code|sig)\s*[:=]\s*['"]?([0-9a-f]{32})['"]?/gi,
    hint: '服务端类型 Key 严禁下发前端；前端 JS Key 必须配置域名白名单（Referer 限制）。',
  },
  {
    id: 'tencent-map-key',
    name: '腾讯位置服务 Key',
    severity: 'high',
    // 形如 XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
    pattern: /\b(?:tencent|tx|qq)[_-]?(?:map|lbs|location)?[_-]?(?:key|ak)\s*[:=]\s*['"]?([A-Z0-9]{5}(?:-[A-Z0-9]{5}){4,})['"]?/gi,
    hint: '在腾讯位置服务控制台配置域名白名单与配额，避免被盗刷。',
  },
  {
    id: 'baidu-map-ak',
    name: '百度地图 AK',
    severity: 'high',
    pattern: /\b(?:baidu|bd)[_-]?(?:map)?[_-]?(?:ak|key)\s*[:=]\s*['"]?([A-Za-z0-9]{24})['"]?/gi,
    hint: '在百度地图控制台启用 Referer 白名单。',
  },
  {
    id: 'jwt-secret',
    name: 'JWT 签名密钥',
    severity: 'high',
    pattern: /\b(?:jwt|jws)[_-]?(?:secret|refresh[_-]?secret|signing[_-]?key)\s*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi,
    hint: 'JWT 密钥泄露可伪造任意身份。轮换密钥并使已签发令牌失效。',
  },
  {
    id: 'encryption-key',
    name: '对称加密密钥 / PII 加密密钥',
    severity: 'high',
    pattern: /\b(?:encryption|aes|pii|crypto|master|data)[_-]?(?:key|secret)\s*[:=]\s*['"]?([^\s'"]{16,})['"]?/gi,
    hint: '加密密钥须由密钥管理服务（KMS）托管，不得以明文常量或环境变量文件入库。',
  },
  {
    id: 'wechat-app-secret',
    name: '微信 AppSecret',
    severity: 'high',
    pattern: /\b(?:wechat|wx)[_-]?(?:mp|oa|open|mini)?[_-]?(?:app)?[_-]?secret\s*[:=]\s*['"]?([A-Za-z0-9]{32})['"]?/gi,
    hint: 'AppSecret 仅服务端使用，用于换取 access_token；前端绝不可见。',
  },
  {
    id: 'oidc-client-secret',
    name: 'OIDC / OAuth Client Secret',
    severity: 'high',
    pattern: /\b(?:oidc|oauth2?|keycloak|kc)?[_-]?client[_-]?secret\s*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi,
    hint: '客户端密钥仅服务端持有，前端改用 PKCE 授权码流。',
  },
  {
    id: 'minio-credentials',
    name: '对象存储（MinIO/S3）凭据',
    severity: 'high',
    pattern: /\b(?:minio|s3|oss|cos)[_-]?(?:root|access|secret)?[_-]?(?:user|key|password|token)\s*[:=]\s*['"]?([^\s'"]{6,})['"]?/gi,
    hint: '对象存储凭据应通过运行时注入，并限制最小权限策略。',
  },

  // ---- 🟢 info：疑似凭据，需人工确认 ----
  {
    id: 'generic-secret',
    name: '疑似通用密钥/口令赋值',
    severity: 'info',
    pattern: /\b(?:api[_-]?key|apikey|secret|password|passwd|pwd|token|access[_-]?token|credential|auth[_-]?key)\s*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi,
    hint: '人工确认是否为真实凭据；若是，改为环境变量并加入 .gitignore。',
  },
  {
    id: 'bearer-literal',
    name: '硬编码 Bearer / Authorization 头',
    severity: 'info',
    pattern: /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}/g,
    hint: '凭据不应硬编码在代码中，改为运行时从安全配置读取。',
  },
];

// 占位符：命中这些模式的值视为示例/模板，不告警
const PLACEHOLDER = /^(?:your[_-]?|<+|\[|\$\{|\{\{|%|xxx+|changeme|change[_-]?me|placeholder|example|sample|demo|test(?:ing)?|dummy|fake|todo|tbd|n\/?a|none|null|undefined|empty|redacted|masked|secret|password|passwd|token|key|value|string|input|here|待填|示例|占位|请填写|同上)/i;
const PLACEHOLDER_CONTAINS = /(?:your[_-]|<[^>]+>|\$\{|\{\{|xxx+|changeme|placeholder|example\.com|sample|demo|dummy|fake|redacted)/i;

// ---------------------------------------------------------------- 工具函数

function isPlaceholder(value) {
  const v = String(value || '').trim();
  if (!v) return true;
  if (PLACEHOLDER.test(v)) return true;
  if (PLACEHOLDER_CONTAINS.test(v)) return true;
  // 纯重复字符，如 aaaa / 0000 / ......
  if (/^(.)\1{5,}$/.test(v)) return true;
  return false;
}

function mask(value) {
  const v = String(value || '');
  if (v.length <= 8) return '****';
  return `${v.slice(0, 4)}****${v.slice(-4)}`;
}

/**
 * 对任意一段文本做脱敏：把其中所有「看起来像密钥」的片段替换为掩码。
 *
 * 为什么要这么做：本工具的报告（尤其是 --json 输出）本身也是一份文件，
 * 若 snippet 原样保留命中行，就等于把密钥原封不动复制进了报告里——
 * 安全工具反而会成为泄露放大器。因此所有输出的文本一律先过这道脱敏。
 */
function redact(text) {
  return String(text || '').replace(
    /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|\bsk-[A-Za-z0-9_-]{16,}|\bAIza[0-9A-Za-z_-]{30,}|\b(?:AKIA|ASIA)[0-9A-Z]{12,}|\b(?:xox[baprs]-[A-Za-z0-9-]{10,})|\b[0-9a-f]{32}\b|\b[A-Za-z0-9_-]{40,}\b/g,
    (m) => mask(m)
  );
}

// 载入忽略清单（.secret-scan-ignore，一行一条，支持前缀与 * 通配）
// 用途：把「已知非本项目凭据」的目录排除，例如第三方离线文档副本——
// 它们包含大量文档示例代码中的密钥，会造成持续误报，掩盖真实问题。
let IGNORE_RULES = [];
function loadIgnore() {
  const p = path.join(ROOT, IGNORE_FILE);
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}
function isIgnored(relPath) {
  const rp = relPath.replace(/\\/g, '/');
  return IGNORE_RULES.some((r) => {
    if (r.endsWith('/')) return rp === r.slice(0, -1) || rp.startsWith(r);
    if (r.includes('*')) {
      const re = new RegExp('^' + r.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
      return re.test(rp);
    }
    return rp === r || rp.startsWith(r + '/') || rp.startsWith(r);
  });
}

function shouldSkipDir(name, isBuild) {
  if (EXCLUDE_DIRS.has(name)) return true;
  if (!isBuild && BUILD_DIRS.has(name)) return true;
  return false;
}

function walk(dir, files, isBuild) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (shouldSkipDir(e.name, isBuild)) continue;
      walk(full, files, isBuild);
    } else if (e.isFile()) {
      files.push(full);
    }
  }
}

function scanFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (isIgnored(rel)) return [];
  const ext = path.extname(file).toLowerCase();
  if (BINARY_EXT.has(ext)) return [];
  const base = path.basename(file).toLowerCase();
  if (EXCLUDE_FILES.has(base)) return [];

  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return [];
  }
  if (stat.size > MAX_FILE_SIZE) return [];

  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  // 跳过明显的二进制内容
  if (content.includes('\u0000')) return [];

  const hits = [];
  const lines = content.split('\n');

  for (const rule of RULES) {
    // 逐行扫描以便给出行号
    lines.forEach((line, idx) => {
      // 跳过注释行里的示例说明（但仍检查 .env 文件）
      const isEnvFile = /^\.env/.test(base);
      const trimmed = line.trim();
      if (!isEnvFile && (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*'))) {
        // 注释中也可能是被注释掉的密钥，仍扫描但降级为 info
      }
      rule.pattern.lastIndex = 0;
      let m;
      while ((m = rule.pattern.exec(line)) !== null) {
        const captured = m[1] !== undefined ? m[1] : m[0];
        // 通用规则：值像占位符则跳过
        if (isPlaceholder(captured)) continue;
        // 排除纯数字（端口、ID 等）
        if (/^\d+$/.test(captured)) continue;
        // 排除「变量引用」而非真实值：$ClientSecret（PS/PHP）、clientSecret,（结构体字段）
        // 不这样的话，代码里正常的变量传递会被大量误报，门禁长期红 = 等于没有门禁。
        const bare = String(captured).replace(/[,;)]+$/, '');
        // 变量引用：$var / $env:VAR / $obj.prop / ${VAR} / process.env.X / os.Getenv("X")
        const isVarRef =
          /^\$/.test(bare) ||
          /^\$\{/.test(bare) ||
          /^(?:process\.env|os\.Getenv|getenv|env)\b/i.test(bare);
        // 属性访问链同样算引用：OAUTH_CONFIG.qq.appSecret、config.wechat.key
        const isPropChain = /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)+[,;)]*$/.test(bare);
        if (
          (isVarRef || isPropChain || /^[A-Za-z_][A-Za-z0-9_]*$/.test(bare)) &&
          !/^(?:password|passwd|secret|token|changeme|admin|apikey|api_key)$/i.test(bare)
        ) {
          continue;
        }
        // 中文占位描述：「生产环境随机字符串」「请填写」等说明文字不是凭据
        if (/随机字符串|请填写|待填|占位|示例|生成|同上|替换为/i.test(bare)) continue;
        // 文档示例私钥：`-----BEGIN RSA PRIVATE KEY-----...` 带省略号，属说明性占位
        if (rule.id === 'private-key' && /\.\.\.|…/.test(line)) continue;
        // 排除相对路径/URL 片段
        if (/^[\w./-]+\.(?:js|ts|json|css|html|md|yml|yaml)$/.test(captured)) continue;

        // 分级细化：连接串若指向本地/docker 内部服务且口令为弱口令，
        // 属于「开发默认值」而非真实凭据，降级为 info 以免淹没真实告警。
        // （告警疲劳是安全门禁失效的主因：全红 = 无人看。）
        let severity = rule.severity;
        let ruleName = rule.name;

        // 对象存储 / JWT / 加密密钥：开发默认值（agg-secret、your-secret-key 等）
        // 不构成泄露，降级为 info，避免真实告警被淹没
        const devDefault =
          /^(?:agg|agg-secret|minioadmin|minio-secret|changeme|your[-_].*|test|dev|local)/i.test(bare) ||
          /^(?:your|xxx|change|placeholder|example|demo)/i.test(bare);
        if (devDefault && /^(?:minio-credentials|jwt-secret|encryption-key|oidc-client-secret)$/.test(rule.id)) {
          severity = 'info';
          ruleName = `${rule.name}（开发默认值）`;
        }

        if (rule.id === 'db-url-with-cred') {
          const dm = line.match(
            /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss|amqp|sqlserver):\/\/[^\s:'"/]+:([^\s'@/]{3,})@([^\s'"/]+)/
          );
          if (dm) {
            const pwd = dm[1];
            const host = dm[2];
            // 占位主机名（host / your_host / <host>）与 docker 服务名同样视为非真实目标
            const isLocalHost =
              /localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal|^(?:postgres|mysql|redis|mongo|db|database|host|localhost|your[_-]?host|<host>)(?::(?:\d+|port))?$/i.test(
                host
              );
            // 弱口令判定覆盖两类常见开发默认值：
            //   ① 直接是通用弱口令（password/root/postgres...）
            //   ②「短服务名 + -secret/-pass/-pwd/-key」组合（如 agg-secret、mailagg-secret）
            const isWeakPwd =
              // pass/user 一并纳入：代码中常以 postgres://user:pass@host 作为「格式示例」注释
              // 后缀含 password（gexm_password、test_password 这类开发默认口令很常见）
              /^(?:password|passwd|pwd|pass|user|username|postgres|admin|root|123456|secret|changeme|test|aggregator|agg|gexm|local|dev|mailagg|mail)(?:[-_]?(?:secret|pass|passwd|password|pwd|key|dev|local|test|123|user|name))?$/i.test(
                pwd
              );
            const isEnvRef = /\$\{|process\.env|os\.Getenv|getenv|PGPASSWORD|env\(/i.test(pwd);
            // 占位语义口令：CHANGE_THIS_TO_A_STRONG_PASSWORD 之类
            const isPlaceholderPwd =
              /change|your|placeholder|example|todo|xxx+|dummy|fake|strong|CHANGEME/i.test(pwd);
            // 随机特征判据：真实生成的密钥几乎必然「大小写字母 + 数字」混合；
            // 全小写/全大写 + 下划线的组合（gexm_test_password）属人工编写的开发默认值。
            const hasRandomness = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd);
            if (isLocalHost && (isWeakPwd || isEnvRef || isPlaceholderPwd || !hasRandomness)) {
              severity = 'info';
              ruleName = `${rule.name}（本地开发默认值，非真实凭据）`;
            }
          }
        }

        hits.push({
          file: path.relative(ROOT, file).replace(/\\/g, '/'),
          line: idx + 1,
          ruleId: rule.id,
          ruleName,
          severity,
          masked: mask(captured),
          // snippet 必须脱敏：报告文件本身也会被归档/提交，不能成为二次泄露源
          snippet: redact(trimmed.slice(0, 120)),
          hint: rule.hint,
        });
        if (m[0] === '') rule.pattern.lastIndex++; // 防空匹配死循环
      }
    });
  }
  return hits;
}

// ---------------------------------------------------------------- 主流程

function main() {
  IGNORE_RULES = loadIgnore();
  const target = path.resolve(ROOT, String(OPT.target));
  if (!fs.existsSync(target)) {
    console.error(`✗ 目标路径不存在：${target}`);
    process.exit(2);
  }

  let files = [];
  if (fs.statSync(target).isFile()) {
    files = [target];
  } else {
    walk(target, files, OPT.includeBuild);
  }

  const allHits = [];
  for (const f of files) {
    try {
      allHits.push(...scanFile(f));
    } catch {
      /* 单文件失败不影响整体 */
    }
  }

  // 排序：严重度优先
  const order = { critical: 0, high: 1, info: 2 };
  allHits.sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file));

  const counts = {
    critical: allHits.filter((h) => h.severity === 'critical').length,
    high: allHits.filter((h) => h.severity === 'high').length,
    info: allHits.filter((h) => h.severity === 'info').length,
  };

  if (OPT.json) {
    console.log(JSON.stringify({ scannedFiles: files.length, counts, hits: allHits }, null, 2));
  } else {
    console.log('# 敏感信息扫描报告\n');
    console.log(`- 扫描范围：\`${path.relative(ROOT, target) || '.'}\`（含构建产物：${OPT.includeBuild ? '是' : '否'}）`);
    console.log(`- 扫描文件数：${files.length}`);
    console.log(`- 命中统计：🔴 critical ${counts.critical} · 🟡 high ${counts.high} · 🟢 info ${counts.info}\n`);

    if (allHits.length === 0) {
      console.log('✅ 未发现敏感信息。\n');
    } else {
      console.log('| 严重度 | 文件 | 行 | 类型 | 脱敏值 |');
      console.log('|---|---|---|---|---|');
      for (const h of allHits) {
        const icon = h.severity === 'critical' ? '🔴' : h.severity === 'high' ? '🟡' : '🟢';
        console.log(`| ${icon} ${h.severity} | \`${h.file}\` | ${h.line} | ${h.ruleName} | \`${h.masked}\` |`);
      }
      console.log('\n## 处置建议\n');
      const seen = new Set();
      for (const h of allHits) {
        if (seen.has(h.ruleId)) continue;
        seen.add(h.ruleId);
        console.log(`- **${h.ruleName}**：${h.hint}`);
      }
      console.log('');
    }
  }

  const fail = OPT.strict ? allHits.length > 0 : counts.critical + counts.high > 0;
  process.exit(fail ? 1 : 0);
}

main();
