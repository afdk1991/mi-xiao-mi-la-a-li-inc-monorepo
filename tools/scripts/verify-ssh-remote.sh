#!/usr/bin/env bash
# ============================================================
# verify-ssh-remote.sh —— SSH 远程开发环境分层验证
# 用法: bash scripts/verify-ssh-remote.sh <ssh-host别名> [远程工作目录根]
#  例: bash scripts/verify-ssh-remote.sh laal /srv/dev
#  自检(仅验证本机与已知主机): bash scripts/verify-ssh-remote.sh --self
# 分层: DNS → TCP → 握手 → 认证/命令 → 发行版 → 工作目录 → 工具链 → Git → 端口
# ============================================================
set -uo pipefail

HOST="${1:-laal}"
RROOT="${2:-/srv/dev}"
CT=12   # ConnectTimeout(秒)

ok(){ printf "  ✅ %s\n" "$1"; }
no(){ printf "  ❌ %s\n" "$1"; FAIL=$((FAIL+1)); }
warn(){ printf "  🟡 %s\n" "$1"; }
PASS=0; FAIL=0

# ---------- 自检模式：验证本机 SSH 客户端与已知可用主机 ----------
if [ "$HOST" = "--self" ]; then
  echo "=== 自检：本机 SSH 客户端与已知主机 ==="
  command -v ssh >/dev/null && ok "ssh 客户端存在: $(command -v ssh)" || no "ssh 客户端缺失"
  command -v ssh-keygen >/dev/null && ok "ssh-keygen 存在" || no "ssh-keygen 缺失"
  command -v ssh-copy-id >/dev/null && ok "ssh-copy-id 存在" || warn "ssh-copy-id 缺失(Windows 常见, 可手动追加公钥)"
  [ -f ~/.ssh/config ] && ok "~/.ssh/config 存在" || warn "~/.ssh/config 不存在"
  # 注意：Windows 版 OpenSSH 不支持 ControlMaster，启用会直接导致连接失败
  if grep -qE '^[[:space:]]*ControlMaster[[:space:]]+auto' ~/.ssh/config 2>/dev/null; then
    warn "已启用 ControlMaster → Windows 版 OpenSSH 不支持(mux 报错)，请移除"
  else
    ok "未启用 ControlMaster（Windows 环境正确）"
  fi
  grep -q "ServerAliveInterval" ~/.ssh/config 2>/dev/null && ok "保活(ServerAliveInterval)已配置" || warn "未配置保活"
  echo "--- 已知主机连通性 ---"
  OUT=$(timeout 30 ssh -T -o BatchMode=yes -o ConnectTimeout=20 git@github.com 2>&1)
  if echo "$OUT" | grep -qi "successfully authenticated"; then
    ok "github.com(经 443) SSH 认证成功"
  else
    no "github.com SSH 认证失败 → $(echo "$OUT" | tail -1 | cut -c1-100)"
  fi
  echo ""
  echo "自检完成：失败项=$FAIL"
  exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
fi

# ---------- 正式分层验证 ----------
SSHOPT="-o BatchMode=yes -o ConnectTimeout=$CT -o StrictHostKeyChecking=accept-new"
RHOST=$(ssh -G "$HOST" 2>/dev/null | awk '/^hostname /{print $2}' | head -1)
RPORT=$(ssh -G "$HOST" 2>/dev/null | awk '/^port /{print $2}' | head -1)
RUSER=$(ssh -G "$HOST" 2>/dev/null | awk '/^user /{print $2}' | head -1)
[ -z "$RHOST" ] && RHOST="$HOST"
[ -z "$RPORT" ] && RPORT=22

echo "============================================================"
echo " SSH 远程开发环境分层验证"
echo " 主机别名: $HOST   实际: ${RUSER:-?}@${RHOST}:${RPORT}"
echo " 远程根  : $RROOT"
echo "============================================================"

# L1 DNS 解析
echo "[L1] DNS 解析"
if getent hosts "$RHOST" >/dev/null 2>&1; then
  ok "$RHOST 解析成功"
else
  # Windows 无 getent；nslookup 对不存在域名也可能返回 0，须校验是否解析出真实地址
  NS=$(nslookup "$RHOST" 2>/dev/null | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | grep -v '^0\.' | head -1)
  if [ -n "$NS" ]; then
    ok "$RHOST 解析成功 → $NS"
  else
    no "$RHOST 解析失败 → 检查域名/IP 是否变更、DNS 服务器（nslookup 无有效 A 记录）"
  fi
fi

# L2 TCP 端口
echo "[L2] TCP ${RPORT} 连通"
if timeout 8 bash -c "cat < /dev/null > /dev/tcp/${RHOST}/${RPORT}" 2>/dev/null; then
  ok "TCP ${RHOST}:${RPORT} 可达"
else
  no "TCP ${RHOST}:${RPORT} 不可达 → 云安全组/防火墙放行端口；确认公网 IP"
fi

# L3 SSH 握手 + L4 认证与远程命令
echo "[L3/L4] SSH 握手与认证"
UNAME=$(timeout $((CT+6)) ssh $SSHOPT "$HOST" 'uname -a' 2>&1)
if [ $? -eq 0 ] && [ -n "$UNAME" ]; then
  ok "SSH 认证成功，远程返回: $(echo "$UNAME" | cut -c1-60)"
else
  no "SSH 认证/连接失败 → $(echo "$UNAME" | tail -1 | cut -c1-120)"
  echo ""
  echo "=== 中断：后续层级依赖 SSH 通道，先修复认证 ==="
  echo "排查: ssh -vvv $HOST  |  ssh-copy-id -p $RPORT ${RUSER}@${RHOST}"
  exit 1
fi

# L5 发行版（TRAE 远程主机硬性要求）
echo "[L5] 操作系统（TRAE 远程主机要求 Linux x64, Debian10+/Ubuntu20.04+）"
OS=$(timeout $((CT+3)) ssh $SSHOPT "$HOST" '. /etc/os-release 2>/dev/null && echo "$ID $VERSION_ID"' 2>/dev/null)
case "$OS" in
  ubuntu*|debian*)
    MAJ=$(echo "$OS" | grep -oE '[0-9]+' | head -1)
    if { [ "${OS%% *}" = "ubuntu" ] && [ "$MAJ" -ge 20 ]; } || { [ "${OS%% *}" = "debian" ] && [ "$MAJ" -ge 10 ]; }; then
      ok "发行版合规: $OS"
    else
      no "发行版过低: $OS → 需 Ubuntu 20.04+ / Debian 10+（过低会导致 AI 功能不可用）"
    fi ;;
  "") no "无法读取 /etc/os-release → 非 Linux？TRAE 远程主机仅支持 Linux" ;;
  *) warn "发行版为 $OS（官方建议 Ubuntu/Debian，其他发行版可能兼容性受限）" ;;
esac
arch=$(timeout $((CT+3)) ssh $SSHOPT "$HOST" 'uname -m' 2>/dev/null)
[ "$arch" = "x86_64" ] && ok "架构 x86_64 符合要求" || warn "架构为 ${arch:-未知}，官方要求 x64"

# L6 远程工作目录
echo "[L6] 远程工作目录 ${RROOT}"
DIRS=$(timeout $((CT+3)) ssh $SSHOPT "$HOST" "ls -1 ${RROOT} 2>/dev/null" 2>/dev/null)
if [ -n "$DIRS" ]; then
  ok "${RROOT} 存在，含 $(echo "$DIRS" | wc -l | tr -d ' ') 个条目"
  echo "$DIRS" | head -20 | sed 's/^/       - /'
else
  no "${RROOT} 不存在或为空 → ssh $HOST 'sudo mkdir -p ${RROOT} && sudo chown -R \$USER:\$USER ${RROOT}'"
fi

# L7 工具链
echo "[L7] 远程工具链"
for c in "node:-v" "npm:-v" "go:version" "python3:-V" "docker:--version" "git:--version"; do
  bin="${c%%:*}"; flag="${c##*:}"
  v=$(timeout $((CT+3)) ssh $SSHOPT "$HOST" "command -v $bin >/dev/null 2>&1 && $bin $flag 2>/dev/null | head -1" 2>/dev/null)
  if [ -n "$v" ]; then ok "$bin: $v"; else warn "$bin 未安装（按需安装）"; fi
done

# L8 Git 一致性（与本地比对树哈希）
echo "[L8] Git 一致性（远程 vs 本地树哈希）"
if [ -n "$DIRS" ]; then
  for p in proj-01 MIXMLAAL gale-engine email-aggregator manju; do
    rt=$(timeout $((CT+3)) ssh $SSHOPT "$HOST" "git -C ${RROOT}/${p} rev-parse HEAD^{tree} 2>/dev/null | cut -c1-8" 2>/dev/null)
    [ -z "$rt" ] && continue
    case "$p" in
      proj-01) lp="D:/网站全栈项目/项目01";;
      MIXMLAAL) lp="D:/网站全栈项目/MIXMLAAL";;
      gale-engine) lp="D:/网站全栈项目/项目002";;
      email-aggregator) lp="D:/网站全栈项目/项目003";;
      manju) lp="D:/网站全栈项目/项目007";;
    esac
    lt=$(git -C "$lp" rev-parse HEAD^{tree} 2>/dev/null | cut -c1-8)
    if [ -n "$lt" ] && [ "$rt" = "$lt" ]; then ok "$p 树哈希一致 ($rt)"; else
      no "$p 不一致 远程=${rt:-无} 本地=${lt:-无} → 需先同步再切换远程开发"; fi
  done
fi

# L9 端口转发能力
echo "[L9] 端口转发（远程开发调试依赖）"
PF=$(timeout $((CT+5)) ssh $SSHOPT -O forward -L 0:127.0.0.1:22 "$HOST" 2>&1 | head -1)
timeout $((CT+3)) ssh $SSHOPT "$HOST" 'command -v ss >/dev/null && ss -ltn 2>/dev/null | head -5 || netstat -ltn 2>/dev/null | head -5' 2>/dev/null | head -5 | sed 's/^/       /'
ok "端口转发命令可执行（TRAE 终端面板亦可配置）"

echo ""
echo "============================================================"
echo " 结果：失败项 = $FAIL"
[ $FAIL -eq 0 ] && echo " ✅ 全部通过：该主机可作为 TRAE SSH 远程开发环境" || echo " ⚠️ 见上方 ❌ 项，按提示修复后重跑"
echo "============================================================"
exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
