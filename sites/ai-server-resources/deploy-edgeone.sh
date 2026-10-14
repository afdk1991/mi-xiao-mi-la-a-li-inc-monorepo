#!/usr/bin/env bash
# ============================================================
#  部署「AI/服务器资源站」到 EdgeOne Makers
# ============================================================
#
#  ⚠️ 关键教训（2026-10-15）：不要用 .edgeone/ 目录作为部署源。
#     CLI 会把 .edgeone 当作"构建输出标记目录"，用它部署后线上根路径为空，
#     首页返回 404（Tencent Edgeone 通用错误页），子页面 302。
#     正确做法：用一个**普通目录名**（这里是 _deploy）承载静态文件，
#     并确保该目录内**没有 package.json**（否则 CLI 会跑 pnpm install，
#     本机无 pnpm 会直接让部署失败）。
#
#  用法：
#    ./deploy-edgeone.sh                 # 部署到生产环境
#    PAGES_SOURCE=skills ./deploy-edgeone.sh
# ============================================================
set -euo pipefail

cd "$(dirname "$0")"
export PAGES_SOURCE="${PAGES_SOURCE:-skills}"

echo "==> 构建部署目录 _deploy/"
rm -rf _deploy
mkdir -p _deploy
cp -r ./*.html _deploy/ 2>/dev/null || true
for d in assets articles fetched archive curated; do
  [ -d "$d" ] && cp -r "$d" _deploy/ 2>/dev/null || true
done
rm -f _deploy/package.json
echo "    文件数: $(find _deploy -type f | wc -l)，根 index.html: $([ -f _deploy/index.html ] && echo yes || echo no)"

echo "==> 部署到 EdgeOne Makers（项目 ai-server-resources）"
edgeone makers deploy _deploy -n ai-server-resources --json

echo "==> 完成。注意：默认域 *.edgeone.cool 需带 eo_token 访问（有效期较短），"
echo "    要长期公开访问请在控制台绑定自定义域名。"
