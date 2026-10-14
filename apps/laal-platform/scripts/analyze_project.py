#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫描项目01 工作区，统计文件类型分布与技术栈信号（排除依赖/构建产物）。"""
import os
from collections import Counter

ROOT = r"F:/网站全栈项目/项目01"
EXCLUDE_DIRS = {
    "node_modules", "__pycache__", ".git", ".workbuddy", "dist",
    "daijia-dist", "daijia-dist_old_20261002_141312", "build", "out",
    ".next", ".nuxt", "coverage", ".idea", ".vscode",
}

EXT_LABEL = {
    ".js": "JavaScript", ".ts": "TypeScript", ".tsx": "TSX/React",
    ".jsx": "JSX/React", ".vue": "Vue", ".py": "Python",
    ".php": "PHP", ".java": "Java", ".go": "Go", ".cs": "C#",
    ".json": "JSON", ".md": "Markdown", ".html": "HTML", ".css": "CSS",
    ".scss": "SCSS", ".yml": "YAML", ".yaml": "YAML", ".sh": "Shell",
    ".ps1": "PowerShell", ".sql": "SQL", ".png": "PNG", ".jpg": "JPG",
    ".svg": "SVG", ".ico": "ICO", ".woff": "字体", ".woff2": "字体",
    ".ttf": "字体", ".map": "SourceMap", ".lock": "Lockfile",
}

ext_counter = Counter()
top_projects = Counter()
total = 0
skip = 0

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    rel = os.path.relpath(dirpath, ROOT)
    top = rel.split(os.sep)[0] if rel != "." else "(root)"
    for fn in filenames:
        total += 1
        _, ext = os.path.splitext(fn)
        ext = ext.lower()
        label = EXT_LABEL.get(ext, ext if ext else "(无扩展名)")
        ext_counter[label] += 1
        top_projects[top] += 1

lines = ["# 项目01 结构与技术栈统计", "",
         f"扫描根目录：`{ROOT}`",
         f"统计文件总数（排除 node_modules/dist/构建产物等）：**{total}**", ""]
lines += ["## 按技术栈/扩展名分布", "", "| 类型 | 文件数 | 占比 |",
          "|------|--------|------|"]
for label, cnt in ext_counter.most_common():
    pct = cnt / total * 100
    lines.append(f"| {label} | {cnt} | {pct:.1f}% |")
lines += ["", "## 按顶层项目分布", "", "| 顶层目录 | 文件数 |",
          "|----------|--------|"]
for name, cnt in top_projects.most_common(20):
    lines.append(f"| {name} | {cnt} |")
lines += ["", "> 注：已排除 node_modules、dist、daijia-dist、.git、.workbuddy 等依赖与产物目录，仅反映源码与配置的真实规模。", ""]

out = "\n".join(lines)
with open(os.path.join(ROOT, "项目结构与技术栈统计.md"), "w", encoding="utf-8", newline="") as f:
    f.write(out)
print(out)
print("\n已写出 项目结构与技术栈统计.md")
