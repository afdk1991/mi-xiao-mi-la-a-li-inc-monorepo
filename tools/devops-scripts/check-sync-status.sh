#!/usr/bin/env bash
# =============================================================================
# 全仓库同步巡检：协议 / 脏工作区 / 未推送 / 四方 tree 哈希对比
#
# 用法:
#   bash check-sync-status.sh            # 全量巡检（含 Gitea 裸仓对比）
#   bash check-sync-status.sh --quick    # 跳过 Gitea 对比，只看协议与本地状态
#
# 判定标准：D == E == GitHub == Gitea，以 tree 哈希为准（HEAD^{tree}）
# =============================================================================
set -uo pipefail

D_ROOT="/d/网站全栈项目"
E_ROOT="/e/04_个人项目/github所有仓库项目"
GITEA_BARE="/d/网站全栈项目/gitea/data/gitea-repositories/root"
EMBEDDED="项目01/Mi-Xiao-Mi-La-A-Li-Inc"

QUICK=0
[ "${1:-}" = "--quick" ] && QUICK=1

total=0; dirty_n=0; ahead_n=0; http_n=0; ssh_n=0; mismatch_n=0

printf '%-26s %-10s %-5s %-5s %-7s %-7s %s\n' "仓库" "分支" "脏" "未推" "协议" "Gitea" "备注"
printf '%s\n' "---------------------------------------------------------------------------------------------"

check_repo() {
  local label="$1" path="$2" ester="$3"
  [ -d "$path/.git" ] || return 0
  total=$((total+1))

  local branch dirty ahead proto note gmark
  note=""; gmark="-"; proto="-"
  branch=$(git -C "$path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "-")
  dirty=$(git -C "$path" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  ahead=$(git -C "$path" rev-list --count @{u}..HEAD 2>/dev/null || echo "-")

  # 远程协议
  local remotes
  remotes=$(git -C "$path" remote -v 2>/dev/null | grep '(push)')
  if [ -z "$remotes" ]; then
    proto="无远程"; note="未接入任何远程"
  elif echo "$remotes" | grep -q 'https\?://'; then
    proto="HTTPS"; http_n=$((http_n+1)); note="❌ 存在 HTTPS remote"
  else
    proto="SSH"; ssh_n=$((ssh_n+1))
  fi

  # Gitea 裸仓 tree 对比
  gmark="-"
  if [ "$QUICK" -eq 0 ]; then
    local gname
    gname=$(echo "$remotes" | grep -oE 'root/[A-Za-z0-9._-]+\.git' | head -1 | sed 's|root/||; s|\.git$||')
    if [ -n "$gname" ] && [ -d "$GITEA_BARE/$gname.git" ]; then
      local ltree gtree
      ltree=$(git -C "$path" rev-parse HEAD^{tree} 2>/dev/null)
      gtree=$(git -C "$GITEA_BARE/$gname.git" rev-parse HEAD^{tree} 2>/dev/null)
      if [ -n "$ltree" ] && [ "$ltree" = "$gtree" ]; then
        gmark="✅"
      else
        gmark="❌"; mismatch_n=$((mismatch_n+1))
        note="${note:+$note; }Gitea 落后/不一致"
      fi
    else
      gmark="n/a"
    fi
  fi

  # E 盘对比（若传入）
  if [ -n "$ester" ] && [ -d "$ester/.git" ]; then
    local ltree etree
    ltree=$(git -C "$path" rev-parse HEAD^{tree} 2>/dev/null)
    etree=$(git -C "$ester" rev-parse HEAD^{tree} 2>/dev/null)
    [ -n "$ltree" ] && [ "$ltree" != "$etree" ] && { note="${note:+$note; }E盘不一致"; mismatch_n=$((mismatch_n+1)); }
  fi

  [ "$dirty" != "0" ] && dirty_n=$((dirty_n+1))
  [ "$ahead" != "0" ] && [ "$ahead" != "-" ] && ahead_n=$((ahead_n+1))

  printf '%-26s %-10s %-5s %-5s %-7s %-7s %s\n' \
    "$label" "$branch" "$dirty" "$ahead" "$proto" "$gmark" "$note"
}

# ---- D 目录名 → E/GitHub 仓库名 映射（不同名的必须在此登记） ----
declare -A MAP=(
  ["项目002"]="gale-engine"
  ["项目003"]="email-aggregator"
  ["项目004"]="proj-04"
  ["项目005机箱"]="proj-05"
  ["项目006"]="proj-06"
  ["项目007"]="manju"
  ["项目008采集"]="proj-08"
  ["项目009商品采集"]="proj-09"
  ["项目01"]="proj-01"
)
COVERED=" $(for k in "${!MAP[@]}"; do printf '%s ' "${MAP[$k]}"; done)"

# ---- D 盘一级仓库 ----
while IFS= read -r d; do
  name=$(basename "$d")
  [ "$name" = "gitea" ] && continue
  # 常见同名映射；不同名查 MAP
  ename="${MAP[$name]:-$name}"
  ester=""
  [ -d "$E_ROOT/$ename/.git" ] && ester="$E_ROOT/$ename"
  check_repo "$name" "$d" "$ester"
done < <(find "$D_ROOT" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | sort)

# ---- 内嵌仓 ----
check_repo "↳内嵌:Mi-Xiao-Mi" "$D_ROOT/$EMBEDDED" "$E_ROOT/Mi-Xiao-Mi-La-A-Li-Inc"

# ---- E 盘（D 盘已覆盖的跳过，其余单独列出） ----
while IFS= read -r e; do
  name=$(basename "$e")
  [ -d "$D_ROOT/$name/.git" ] && continue
  case "$COVERED" in *" $name "*) continue;; esac
  check_repo "E:$name" "$e" ""
done < <(find "$E_ROOT" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | sort)

printf '%s\n' "---------------------------------------------------------------------------------------------"
echo "仓库总数        : $total"
echo "存在未提交变更  : $dirty_n"
echo "存在未推送提交  : $ahead_n"
echo "SSH 仓库        : $ssh_n"
echo "HTTPS 仓库(应为0): $http_n"
echo "对比不一致      : $mismatch_n"
echo
if [ "$http_n" -eq 0 ] && [ "$mismatch_n" -eq 0 ]; then
  echo "结论：🟢 远程全 SSH，且已接入的镜像四方一致。"
else
  echo "结论：🟡 存在待处理项（见上表备注列）。"
fi
