#!/usr/bin/env python3
"""合并 macOS 各架构的更新元数据（latest-mac.yml）为单一文件。

背景：
    release.yml 的六矩阵中，macOS x64 与 arm64 两个 job **都会**产出 latest-mac.yml；
    release job 扁平化（cp 到 dist/）时同名互相覆盖，按字典序最终 **x64 覆盖 arm64**，
    Release 里只剩一份 —— arm64 Mac 读不到 arm64 产物，只能静默回落 x64/Rosetta。

    electron-updater 的 MacUpdater（node_modules/electron-updater/out/MacUpdater.js
    的 filterFilesForArch）在 macOS 上**只请求单一 latest-mac.yml**，再按 URL 是否
    含 "arm64" 自行挑选架构。因此正确做法是**合并两份 yml 的 files 数组**。

    ⚠️ 绝不能改名成 latest-mac-arm64.yml（照 Windows 的 latest-arm64.yml 先例会踩坑）：
        Mac 只认 latest-mac.yml，改名后永不命中，arm64 更新会彻底断掉。

失败回退（本脚本的核心设计）：
    任何异常都**不写文件**并 exit 0 —— 最坏情况等价于"没合并"，即维持流水线既有行为
    （arm64 回落 x64）。绝不能因为元数据合并失败而让整个发版 job 挂掉。

用法：
    python scripts/merge-mac-update-yml.py --out dist/latest-mac.yml <yml1> <yml2> ...
"""

from __future__ import annotations

import argparse
import os
import sys


def warn(msg: str) -> None:
    print(f"[warn] {msg}", file=sys.stderr)


def ensure_yaml():
    """导入 PyYAML；缺失时尝试就地 pip 安装（CI runner 通常可用）。仍失败返回 None。"""
    try:
        import yaml  # noqa: PLC0415

        return yaml
    except Exception:
        pass
    try:
        import subprocess  # noqa: PLC0415

        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", "pyyaml"],
            check=False,
            timeout=180,
        )
        import yaml  # noqa: PLC0415

        return yaml
    except Exception:
        return None


def load(yaml, path: str):
    """读取一份 latest-mac.yml；任何问题都返回 None（走回退）。"""
    if not os.path.isfile(path):
        warn(f"缺少 {path}，跳过合并")
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            doc = yaml.safe_load(fh)
    except Exception as exc:  # noqa: BLE001
        warn(f"解析 {path} 失败：{exc}，跳过合并")
        return None
    if not isinstance(doc, dict):
        warn(f"{path} 不是 YAML 映射，跳过合并")
        return None
    files = doc.get("files")
    if not isinstance(files, list) or not files:
        warn(f"{path} 缺少有效的 files 列表，跳过合并")
        return None
    return doc


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, help="合并结果写入路径，如 dist/latest-mac.yml")
    parser.add_argument("inputs", nargs="*", help="各架构的 latest-mac.yml，第一个作为基准")
    args = parser.parse_args()

    # Windows runner 上 stdout 默认 locale 编码，输出中文会 UnicodeEncodeError。
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

    yaml = ensure_yaml()
    if yaml is None:
        warn("PyYAML 不可用，跳过 macOS 更新元数据合并（维持既有 latest-mac.yml）")
        return 0

    docs: list[dict] = []
    for path in args.inputs:
        doc = load(yaml, path)
        if doc is None:
            return 0
        docs.append(doc)

    if len(docs) < 2:
        warn("可用的 latest-mac.yml 不足两份，跳过合并")
        return 0

    versions = {str(d.get("version")) for d in docs}
    if len(versions) != 1:
        warn(f"各架构 version 不一致 {sorted(versions)}，跳过合并")
        return 0

    base = dict(docs[0])

    # 按 url 去重保序，合并全部架构的 files
    merged: list = []
    seen: set[str] = set()
    for doc in docs:
        for item in doc.get("files", []):
            key = item.get("url") if isinstance(item, dict) else repr(item)
            if key is None or key in seen:
                continue
            seen.add(key)
            merged.append(item)

    if len(merged) < 2:
        warn("合并后 files 少于 2 项，跳过写入")
        return 0

    base["files"] = merged
    # path / sha512 保留基准（第一个入参，传 x64）的值：MacUpdater 实际走 files 数组
    # 按架构挑选，这两个字段仅作兜底，取任一架构均可正常安装。

    try:
        text = yaml.safe_dump(base, allow_unicode=True, sort_keys=False, default_flow_style=False)
        # 写盘前自检：确保产物能被重新解析且带 files，避免写出损坏的元数据
        check = yaml.safe_load(text)
        if not isinstance(check, dict):
            warn("生成结果自检失败，跳过写入")
            return 0
        if not isinstance(check.get("files"), list) or not check["files"]:
            warn("生成结果自检失败，跳过写入")
            return 0

        out_dir = os.path.dirname(args.out)
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)
        with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
    except Exception as exc:  # noqa: BLE001
        warn(f"写入 {args.out} 失败：{exc}，跳过合并")
        return 0

    urls = [i.get("url") for i in merged if isinstance(i, dict)]
    print(f"[ok] 合并 {len(docs)} 份 latest-mac.yml -> {args.out}（{len(merged)} files）")
    for url in urls:
        print(f"     - {url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
