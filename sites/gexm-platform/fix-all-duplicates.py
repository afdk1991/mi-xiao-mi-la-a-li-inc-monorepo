#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""批量移除 mixm-core 插件所有 PHP 文件中重复的函数/类声明行"""
import os
import re

plugin_dir = r'f:\gexm\wp-content\plugins\mixm-core'

total_removed = 0
files_fixed = 0

for root, dirs, files in os.walk(plugin_dir):
    for filename in files:
        if not filename.endswith('.php'):
            continue

        file_path = os.path.join(root, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        new_lines = []
        i = 0
        removed = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            # 检查是否是 function/class 声明行
            is_decl = re.match(r'^(function|class)\s+\w+', stripped)

            # 检查下一行是否完全相同
            if is_decl and i + 1 < len(lines) and lines[i + 1] == line:
                new_lines.append(line)
                i += 2  # 保留第一个，跳过第二个
                removed += 1
            else:
                new_lines.append(line)
                i += 1

        if removed > 0:
            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.writelines(new_lines)
            files_fixed += 1
            total_removed += removed
            print(f"  {filename}: 移除 {removed} 处重复")

print(f"\n总计: 修复 {files_fixed} 个文件, 移除 {total_removed} 处重复声明")
