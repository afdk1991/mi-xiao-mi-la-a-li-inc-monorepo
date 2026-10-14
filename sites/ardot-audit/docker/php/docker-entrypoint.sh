#!/bin/sh
# ---------------------------------------------------------------------------
# WP004 PHP 容器启动脚本
#
# 职责：
#   1. 首次启动时，把镜像内置的官方 WordPress 核心同步到共享卷 /var/www/html，
#      让 nginx 容器也能读到 wp-admin / wp-includes 下的静态资源；
#   2. 后续启动不覆盖已有核心，避免冲掉持久化数据；
#   3. 修正目录属主，保证 FPM 进程（www-data）可写 uploads。
#
# 环境变量：
#   WP_FORCE_SYNC_CORE=1  强制用官方核心覆盖卷内核心（升级核心后使用）
#
# 注意：本脚本只搬运官方核心，不修改、不生成任何核心文件。
# ---------------------------------------------------------------------------
set -eu

SRC=/usr/src/wordpress
DST=/var/www/html
MARKER="${DST}/wp-includes/version.php"

echo "[wp004-entrypoint] 启动中..."

if [ ! -f "${MARKER}" ]; then
	echo "[wp004-entrypoint] 首次启动：同步官方核心到共享卷 ${DST}"
	# 用 rsync 保留已有文件（wp-content 由宿主机挂载，不会被覆盖）
	rsync -a --exclude='wp-content' "${SRC}/" "${DST}/"
	echo "[wp004-entrypoint] 核心同步完成"
elif [ "${WP_FORCE_SYNC_CORE:-0}" = "1" ]; then
	echo "[wp004-entrypoint] 检测到 WP_FORCE_SYNC_CORE=1，强制同步官方核心"
	rsync -a --delete --exclude='wp-content' "${SRC}/" "${DST}/"
	echo "[wp004-entrypoint] 核心强制同步完成"
else
	echo "[wp004-entrypoint] 核心已存在，跳过同步（需强制同步请设 WP_FORCE_SYNC_CORE=1）"
fi

# wp-content 可能由宿主机挂载进来，这里补建标准子目录。
mkdir -p "${DST}/wp-content/uploads" \
         "${DST}/wp-content/upgrade" \
         "${DST}/wp-content/languages"

# 属主修正：核心与 wp-content 都归 www-data，保证 FPM 可写上传目录。
# 宿主机挂载的目录属主可能不同，这里只对容器内可写的部分做修正。
chown -R www-data:www-data "${DST}/wp-content/uploads" "${DST}/wp-content/upgrade" 2>/dev/null || true

echo "[wp004-entrypoint] 版本信息: $(grep -m1 "wp_version = " "${MARKER}" 2>/dev/null || echo '未知')"
echo "[wp004-entrypoint] 交回控制权给: $*"

exec "$@"
