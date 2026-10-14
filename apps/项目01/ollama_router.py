#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ollama 多模型联动路由器
--------------------------------------------------
把本机已有的本地模型按「职责」编排起来，提供三种联动模式：

  1. route   自动路由：用 0.6b 小模型判断意图，派给专精模型
  2. pipe    流水线  ：快模型起草 -> 强模型审查/重构
  3. free    显存清理：批量卸载模型

用法：
  python ollama_router.py route "帮我把这段 Python 改成异步"
  python ollama_router.py pipe  "写一个 LRU 缓存类"
  python ollama_router.py free
  python ollama_router.py ps
"""

import json
import sys
import urllib.error
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows 控制台中文兜底
except Exception:
    pass

OLLAMA = "http://127.0.0.1:11434"

# ------------------------------------------------------------------
# 1. 角色分工表：每个角色绑定一个模型 + 显存驻留策略
#    keep_alive 说明：
#      -1 / "-1m"  常驻显存（只给高频小模型用）
#      "30m"       空闲 30 分钟后卸载（日常工作区间足够）
#      0           生成完立刻卸载（30b / 16b 这类大块头专用）
# ------------------------------------------------------------------
ROLES = {
    "classify": {"model": "qwen3:0.6b",             "keep_alive": -1,    "desc": "意图分类/格式校验，几乎零成本"},
    "chat":     {"model": "qwen3:4b",               "keep_alive": "30m", "desc": "通用对话、快速问答"},
    "write":    {"model": "writer",                 "keep_alive": "30m", "desc": "中文写作、文案"},
    "rag":      {"model": "rag-answer",             "keep_alive": "30m", "desc": "基于检索片段作答"},
    "logic":    {"model": "phi4-mini",              "keep_alive": "30m", "desc": "推理/数学/结构化判断"},
    "code":     {"model": "qwen2.5-coder:7b",       "keep_alive": "30m", "desc": "日常代码生成、补全"},
    "codehard": {"model": "qwen3-coder:30b",        "keep_alive": 0,     "desc": "复杂重构/架构设计，用完即卸"},
    "longctx":  {"model": "deepseek-coder-v2:16b-16k", "keep_alive": 0,  "desc": "长上下文代码理解（16k）"},
}

# 是否需要动用大模型：命中这些关键词就升级到 30b
HEAVY_HINT = ("重构", "架构", "设计", "优化性能", "跨文件", "review", "审查",
              "refactor", "architecture", "design", "migrate", "迁移")

CLASSIFY_PROMPT = """你是意图路由器。只输出 JSON，不要解释，不要 markdown 代码块。
可选角色：chat / write / rag / logic / code / longctx
规则：
- 用户想改代码、补全、调试、写函数 -> code
- 输入里带着大段代码或文档要理解 -> longctx
- 写文章、文案、润色、改写 -> write
- 基于给定资料/检索结果回答 -> rag
- 计算、推理、逻辑判断、结构化抽取 -> logic
- 其余闲聊与知识问答 -> chat
只输出：{{"role":"<角色>","reason":"<不超过10字>"}}

用户问题：{q}"""

DRAFT_SYS = ("你是资深 Python 工程师。只输出代码本体，"
             "不要解释、不要 markdown 代码块围栏、不要示例用法。")

# 关键点：强制"只读不改"，输出问题清单。
# 让模型输出完整代码会导致它原样复读草稿，审查等于没做。
CRITIQUE_SYS = """你是严格的代码审查专家，只做批判，不写代码。

针对给定代码，逐条列出问题，每条一行，格式固定：
[严重|一般|建议] 问题：具体说明

必须覆盖以下维度，没有问题就写"无"：
1. 正确性：有没有 bug、错误的边界条件、类型不一致
2. 数据一致性：同一容器里是否混存了不同格式的值
3. 继承设计：子类与父类的方法/数据格式是否冲突
4. 健壮性：异常输入、并发、资源泄漏
5. 性能：有无不必要的开销

禁止输出修改后的代码，禁止复述原代码。不要客套，不要夸奖。"""

REVISE_TMPL = """任务：{task}

下面是初稿代码：
{draft}

审查专家指出了以下问题：
{critique}

请逐条修复上述所有问题，输出修复后的完整代码。
只输出代码本体，不要解释。若某条问题不成立，忽略即可。"""


# ------------------------------------------------------------------
# 2. 基础调用：统一走 /api/chat，显式带 keep_alive
# ------------------------------------------------------------------
def chat(model, messages, keep_alive="5m", options=None, timeout=600):
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "keep_alive": keep_alive,
    }
    if options:
        payload["options"] = options

    req = urllib.request.Request(
        OLLAMA + "/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "ignore")
        raise RuntimeError(f"Ollama 返回 {e.code}: {body[:300]}") from None
    except urllib.error.URLError as e:
        raise RuntimeError(f"连不上 Ollama（{OLLAMA}）: {e.reason}") from None

    return data["message"]["content"], data


# ------------------------------------------------------------------
# 3. 模式一：自动路由
# ------------------------------------------------------------------
def _speed(meta):
    """从响应元数据里算出真实吞吐，用来判断模型到底跑在 GPU 还是 CPU。"""
    n = meta.get("eval_count") or 0
    d = (meta.get("eval_duration") or 0) / 1e9
    load = (meta.get("load_duration") or 0) / 1e9
    total = (meta.get("total_duration") or 0) / 1e9
    if n and d:
        return f"总 {total:.1f}s（加载 {load:.1f}s）| {n} tokens | {n / d:.1f} tok/s"
    return f"总 {total:.1f}s（加载 {load:.1f}s）"


def classify(question):
    """用 0.6b 做意图分类；解析失败时降级到关键词匹配。"""
    cfg = ROLES["classify"]
    try:
        text, _ = chat(
            cfg["model"],
            [{"role": "user", "content": CLASSIFY_PROMPT.format(q=question[:500])}],
            keep_alive=cfg["keep_alive"],
            options={"temperature": 0, "num_predict": 64},
            timeout=60,
        )
        text = text.strip().replace("```json", "").replace("```", "").strip()
        m = text[text.find("{"):text.rfind("}") + 1]
        role = json.loads(m)["role"]
        if role in ROLES:
            return role
    except Exception:
        pass

    # 降级：关键词兜底，保证路由永不失败
    q = question.lower()
    if any(k in q for k in ("代码", "函数", "报错", "debug", "python", "def ", "bug")):
        return "code"
    if any(k in q for k in ("写", "文案", "润色", "改写", "文章")):
        return "write"
    if any(k in q for k in ("计算", "推理", "为什么", "分析")):
        return "logic"
    return "chat"


def route_and_answer(question):
    role = classify(question)

    # 命中"硬需求"就升级到 30b，并且用完立刻卸载
    hit_heavy = any(k in question for k in HEAVY_HINT)
    if hit_heavy and role in ("code", "longctx", "logic"):
        role = "codehard"

    cfg = ROLES[role]
    print(f"[路由] {role:9s} -> {cfg['model']:28s} ({cfg['desc']})")
    if hit_heavy:
        print("[路由] 检测到高难度需求，已升级到重型模型，本轮结束后自动卸载")

    answer, meta = chat(
        cfg["model"],
        [{"role": "user", "content": question}],
        keep_alive=cfg["keep_alive"],
    )
    print(f"[耗时] {_speed(meta)}\n")
    print(answer)
    return answer


# ------------------------------------------------------------------
# 4. 模式二：流水线（起草 -> 批判 -> 修订）
#    快模型起草 -> 卸载 -> 强模型只输出问题清单 -> 卸载 -> 快模型照单修订
#    关键在于"批判"和"修订"由不同模型分做，避免强模型原样复读草稿
# ------------------------------------------------------------------
def code_pipeline(task):
    draft_cfg = ROLES["code"]
    review_cfg = ROLES["codehard"]

    print(f"[1/4] 起草：{draft_cfg['model']}")
    draft, m1 = chat(
        draft_cfg["model"],
        [{"role": "system", "content": DRAFT_SYS},
         {"role": "user", "content": task}],
        keep_alive=draft_cfg["keep_alive"],
    )
    print(draft)
    print(f"\n       {_speed(m1)}")
    unload(draft_cfg["model"])  # 先腾显存，再加载 30b，避免 OOM

    # 2/4 批判：只输出问题清单，不给它复述代码的机会
    print(f"\n[2/4] 批判：{review_cfg['model']}")
    critique, m2 = chat(
        review_cfg["model"],
        [{"role": "system", "content": CRITIQUE_SYS},
         {"role": "user", "content": f"任务：{task}\n\n待审代码：\n{draft}"}],
        keep_alive=review_cfg["keep_alive"],
        options={"num_ctx": 8192, "temperature": 0.2},
    )
    print(critique)
    print(f"\n       {_speed(m2)}")
    unload(review_cfg["model"])

    # 3/4 修订：30b 已卸载，让快模型照着清单改
    print(f"\n[3/4] 修订：{draft_cfg['model']}")
    fixed, m3 = chat(
        draft_cfg["model"],
        [{"role": "system", "content": DRAFT_SYS},
         {"role": "user",
          "content": REVISE_TMPL.format(task=task, draft=draft, critique=critique)}],
        keep_alive=draft_cfg["keep_alive"],
    )
    print(fixed)
    print(f"\n       {_speed(m3)}")
    unload(draft_cfg["model"])

    print("\n[4/4] 完成")
    return fixed


# ------------------------------------------------------------------
# 5. 显存管理
# ------------------------------------------------------------------
def unload(model):
    """keep_alive=0 + 空 prompt = 立刻卸载该模型，不影响其他已加载模型。"""
    payload = {"model": model, "messages": [], "keep_alive": 0, "stream": False}
    req = urllib.request.Request(
        OLLAMA + "/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req, timeout=30)
        print(f"[显存] 已卸载 {model}")
    except Exception as e:
        print(f"[显存] 卸载 {model} 失败：{e}")


def _list_running():
    """查询当前已加载的模型；服务不可用时返回空列表而不是抛异常。"""
    req = urllib.request.Request(OLLAMA + "/api/ps")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8")).get("models", [])
    except Exception as e:
        print(f"[显存] 查询已加载模型失败：{e}")
        return []


def unload_all(keep=("qwen3:0.6b",)):
    running = _list_running()
    if not running:
        print("[显存] 当前没有已加载的模型")
        return
    for m in running:
        name = m.get("name")
        if name in keep:
            continue
        unload(name)


def show_ps():
    running = _list_running()
    if not running:
        print("[显存] 当前没有已加载的模型")
        return
    print(f"{'模型':<32}{'显存':>10}  {'到期':>10}")
    print("-" * 56)
    for m in running:
        size = (m.get("size_vram") or m.get("size") or 0) / 1024 ** 3
        print(f"{m.get('name', '?'):<32}{size:>8.1f}G  {str(m.get('expires_at', '-'))[:10]:>10}")


# ------------------------------------------------------------------
# 6. CLI
# ------------------------------------------------------------------
def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    cmd, arg = sys.argv[1], " ".join(sys.argv[2:])

    if cmd == "route" and arg:
        route_and_answer(arg)
    elif cmd == "pipe" and arg:
        code_pipeline(arg)
    elif cmd == "free":
        unload_all()
        show_ps()
    elif cmd == "ps":
        show_ps()
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
