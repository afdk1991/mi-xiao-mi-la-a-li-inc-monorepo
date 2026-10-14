#!/usr/bin/env bash
# =============================================================================
# 拉取 WordPress 官方核心校验和（作为「核心零改动」的黄金基线）
#
# 用途：
#   1. 首次部署时建立当前版本的基线；
#   2. WordPress 核心升级后，重新拉取新版本基线，再跑 verify-core.php 复校。
#
# 数据源：api.wordpress.org 官方 checksums API（与 wp-admin 的
#         「更新 → 重新安装」使用的同一份数据）。
#
# 用法：
#   bash scripts/fetch-baseline.sh                  # 用 .env 中的版本
#   bash scripts/fetch-baseline.sh 7.1 zh_CN        # 指定版本与语言
#
# 输出：_dist/checksums-<版本>-<语言>.json
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="${ROOT}/_dist"

VERSION="${1:-}"
LOCALE="${2:-}"

# 未传参时从 .env 读取
if [ -z "${VERSION}" ] && [ -f "${ROOT}/.env" ]; then
	VERSION="$(grep -E '^WP_VERSION=' "${ROOT}/.env" | head -1 | cut -d= -f2- | tr -d '"'"'"'\r')"
fi
VERSION="${VERSION:-7.0.4}"
LOCALE="${LOCALE:-zh_CN}"

mkdir -p "${DIST}"

OUT="${DIST}/checksums-${VERSION}-${LOCALE}.json"
URL="https://api.wordpress.org/core/checksums/1.0/?version=${VERSION}&locale=${LOCALE}"

echo "正在拉取官方校验和..."
echo "  版本   : ${VERSION}"
echo "  语言   : ${LOCALE}"
echo "  接口   : ${URL}"

TMP="$(mktemp)"
if ! curl -fsSL --max-time 60 "${URL}" -o "${TMP}"; then
	rm -f "${TMP}"
	echo "❌ 拉取失败。请确认版本号真实存在、网络可访问 api.wordpress.org。" >&2
	echo "   可用版本列表：https://api.wordpress.org/core/version-check/1.7/" >&2
	exit 1
fi

# 官方返回结构：{ "checksums": { "wp-admin/xxx.php": "md5", ... } }
# 已内置 checksums 字段时直接提取；否则整份保存，由 verify-core.php 兼容解析。
COUNT="$(php -r '
	$d = json_decode(file_get_contents($argv[1]), true);
	$c = isset($d["checksums"]) && is_array($d["checksums"]) ? $d["checksums"] : (is_array($d) ? $d : array());
	echo count($c);
' "${TMP}" 2>/dev/null || echo 0)"

if [ "${COUNT}" -lt 100 ]; then
	rm -f "${TMP}"
	echo "❌ 返回数据异常（条目数 ${COUNT}），已放弃写入。响应片段：" >&2
	curl -fsSL --max-time 30 "${URL}" 2>/dev/null | head -c 300 >&2 || true
	echo "" >&2
	exit 1
fi

mv "${TMP}" "${OUT}"
echo "✅ 基线已写入：${OUT}"
echo "   校验和条目：${COUNT}"
echo ""
echo "下一步：执行 scripts/verify-core.php 校验核心完整性。"
