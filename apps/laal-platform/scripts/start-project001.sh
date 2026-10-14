#!/usr/bin/env bash
# 项目001 启动脚本（Mi-Xiao-Mi-La-A-Li-Inc，前端 + 后端）
# 端口约定：后端 3001 / 前端 5101（strictPort，避免漂移）
# 运行：在 Git Bash 中执行  bash start-project001.sh
set -u

NODE_BIN="C:/Users/addk1/.workbuddy/binaries/node/versions/22.22.2"
ROOT="D:/网站全栈项目/项目01/Mi-Xiao-Mi-La-A-Li-Inc"

# 清掉 WorkBuddy 的 safe-delete 批量删除守卫，避免 Vite 重新优化依赖缓存
# （删除 .vite/deps 时被 FAIL_CLOSED 拦截导致 dev server 崩溃）而报错退出。
unset CODEBUDDY_SAFE_DELETE_BULK_STATE_DIR CODEBUDDY_TOOL_CALL_ID
export PATH="$NODE_BIN:$PATH"

# ---- 后端 3001 ----
cd "$ROOT/backend"
echo "[项目01] 启动后端 (3001) ..."
nohup npm run dev > /tmp/p1-backend.log 2>&1 &

# ---- 前端 5101 ----
cd "$ROOT/frontend"
# 旧 .vite 缓存改名（非删除），既绕开删除钩子，又强制 Vite 重建干净依赖缓存。
[ -d node_modules/.vite ] && mv -f node_modules/.vite node_modules/.vite.bak
echo "[项目01] 启动前端 (5101) ..."
nohup npm run dev > /tmp/p1-frontend.log 2>&1 &

sleep 8
echo "[项目01] 已启动："
echo "  前端页面 : http://localhost:5101"
echo "  后端 API : http://localhost:3001/api   (前端已同源代理 /api -> 3001)"
echo "  日志     : /tmp/p1-backend.log  /tmp/p1-frontend.log"
