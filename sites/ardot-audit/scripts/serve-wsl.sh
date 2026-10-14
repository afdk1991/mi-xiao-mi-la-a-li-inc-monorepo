#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# 本地开发服务器（WSL 内运行）
#
# 为什么要在 WSL 内跑：
#   MySQL 跑在 WSL 的 Docker 里。如果 PHP 在 Windows 侧运行，每一次数据库
#   连接都要穿过 Windows <-> WSL 的 localhostRelay 端口转发，该通道在高频率
#   短连接下会成簇丢包，表现为「数据库连接失败」时好时坏（mysqli errno 2002）。
#   把 PHP 放进 WSL 后，PHP 与数据库同处一个网络命名空间，直连 127.0.0.1 即可，
#   彻底消除跨系统的数据库访问。
#
# 用法（在 Windows 的 Git Bash / PowerShell 里执行）：
#   wsl -d Ubuntu -u root -- bash /mnt/d/网站全栈项目/项目004/scripts/serve-wsl.sh start
#   wsl -d Ubuntu -u root -- bash /mnt/d/网站全栈项目/项目004/scripts/serve-wsl.sh stop
#   wsl -d Ubuntu -u root -- bash /mnt/d/网站全栈项目/项目004/scripts/serve-wsl.sh status
#
# 访问地址：
#   WSL 内部   http://127.0.0.1:8090
#   Windows    http://localhost:8090  （WSL2 localhostRelay 自动转发）
#              若 relay 不通，用 http://<WSL-IP>:8090，IP 见 status 输出
# ---------------------------------------------------------------------------
set -uo pipefail

PROJECT_WIN="/mnt/d/网站全栈项目/项目004"
PORT="${WP004_PORT:-8090}"
PID_FILE="/tmp/wp004-php-server.pid"
LOG_FILE="/tmp/wp004-php-server.log"

# 自动探测项目路径：优先 D 盘约定位置，找不到再按挂载点搜索。
if [ ! -d "$PROJECT_WIN" ]; then
	for d in /mnt/*/网站全栈项目/项目004; do
		[ -d "$d" ] && PROJECT_WIN="$d" && break
	done
fi

cmd_start() {
	if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
		echo "already running (pid=$(cat "$PID_FILE"))"
		return 0
	fi
	cd "$PROJECT_WIN" || { echo "项目目录不存在: $PROJECT_WIN"; exit 1; }
	# 0.0.0.0 让 Windows 侧也能访问；PHP 内置服务器为单进程，仅用于开发。
	nohup php -S 0.0.0.0:"$PORT" -t public router.php >"$LOG_FILE" 2>&1 &
	echo $! >"$PID_FILE"
	sleep 1
	echo "started pid=$(cat "$PID_FILE") port=$PORT"
	echo "log: $LOG_FILE"
}

cmd_stop() {
	if [ -f "$PID_FILE" ]; then
		kill "$(cat "$PID_FILE")" 2>/dev/null && echo "stopped pid=$(cat "$PID_FILE")"
		rm -f "$PID_FILE"
	else
		pkill -f "php -S 0.0.0.0:$PORT" 2>/dev/null && echo "stopped (by pattern)" || echo "not running"
	fi
}

cmd_status() {
	echo "=== 进程 ==="
	if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
		echo "running pid=$(cat "$PID_FILE")"
	else
		echo "not running"
	fi
	echo "=== 监听 ==="
	ss -ltn 2>/dev/null | grep ":$PORT" || echo "端口 $PORT 未监听"
	echo "=== 本机 IP ==="
	hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.' | head -3
	echo "=== 自检 ==="
	curl -s -o /dev/null -w "http=%{http_code}\n" --max-time 10 "http://127.0.0.1:${PORT}/" || true
}

cmd_log() {
	tail -n "${2:-40}" "$LOG_FILE" 2>/dev/null || echo "无日志"
}

case "${1:-start}" in
	start)  cmd_start ;;
	stop)   cmd_stop ;;
	restart) cmd_stop; sleep 1; cmd_start ;;
	status) cmd_status ;;
	log)    cmd_log "$@" ;;
	*)      echo "用法: $0 {start|stop|restart|status|log}" ; exit 1 ;;
esac
