#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复 page-gallery.php 中剩余的 3 个 U+FFFD + ? 损坏字符"""

file_path = r'f:\gexm\wp-content\themes\mixm-laal\page-templates\page-gallery.php'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

BAD = '\ufffd'

# 修复剩余的 3 个损坏
fixes = [
    # 1. 主内容区域开始\n?> (line 257)
    # 损坏: 主内容区域开 + FFFD + ? + ?>  (FFFD替换了"始", ?替换了换行)
    # 正确: 主内容区域开始\n?>
    ("主内容区域开" + BAD + "??>", "主内容区域开始\n?>"),

    # 2 & 3. 添加当前激活状态 (lines 795, 834) - 出现2次
    # 损坏: 添加当前激活状 + FFFD + ? + this.classList.add('active');
    # 正确: 添加当前激活状态\n                this.classList.add('active');
    ("// 添加当前激活状" + BAD + "?                this.classList.add('active');",
     "// 添加当前激活状态\n                this.classList.add('active');"),
]

success = 0
for corrupt, correct in fixes:
    count = content.count(corrupt)
    if count > 0:
        content = content.replace(corrupt, correct)
        success += 1
        print(f"OK ({count}x): {corrupt[:30]}...")
    else:
        print(f"FAIL: {corrupt[:30]}... (not found)")

with open(file_path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

remaining = content.count(BAD)
print(f"\n成功: {success}/{len(fixes)}")
print(f"剩余 U+FFFD 字符数: {remaining}")
