#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复 page-gallery.php 中所有 U+FFFD + ? 损坏字符"""

import os

file_path = r'f:\gexm\wp-content\themes\mixm-laal\page-templates\page-gallery.php'

# 读取文件（UTF-8）
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# U+FFFD 字符
BAD = '\ufffd'

# 定义替换对：(前缀, 正确后缀, 损坏后缀)
# 损坏模式: U+FFFD + ? 替换了 原中文最后字节+换行/引号
pairs = [
    # 1. 样式 + 换行
    ("相册模块功能脚本和样", "式\n */", BAD + "? */"),
    # 2. 数据 + 换行
    ("本地化脚本数", "据\n    wp_localize_script", BAD + "?    wp_localize_script"),
    # 3. 精选 (标签)
    ("'精", "选', 'slug' => 'featured'", BAD + "?', 'slug' => 'featured'"),
    # 4. 最新 (标签)
    ("'最", "新', 'slug' => 'latest'", BAD + "?', 'slug' => 'latest'"),
    # 5. 尺寸 + 换行
    ("根据方向设置不同的尺", "寸\n        $width", BAD + "?        $width"),
    # 6. 细节。'
    ("的独特魅力和细节", "。',", BAD + "?,"),
    # 7. 摄影师' (gallery_module_get_images)
    ("'摄影", "师' . rand(1, 30),\n            'author_avatar' => ", BAD + "? . rand(1, 30),\n            'author_avatar' => "),
    # 8. 获取精选图片 + 换行
    ("获取精选图", "片\n */", BAD + "? */"),
    # 9. 精选图片'
    ("'精选图", "片' . ", BAD + "?' . "),
    # 10. 用户喜爱的作品'
    ("用户喜爱的作", "品',", BAD + "?,"),
    # 11. 获取最新相册 + 换行
    ("获取最新相", "册\n */", BAD + "? */"),
    # 12. 摄影师' (gallery_module_get_latest_albums)
    ("'摄影", "师' . rand(1, 30)\n        );", BAD + "? . rand(1, 30)\n        );"),
    # 13. 主内容区域开始 + 换行
    ("主内容区域开", "始\n?>", BAD + "?>"),
    # 14. 搜索摄影师...
    ("相册或摄影", "师...", BAD + "?.."),
    # 15. 相册数</div>
    ('stat-label">相册', "数</div>", BAD + "?/div>"),
    # 16. 主内容区域 -->
    ("主内容区", "域 -->", BAD + "?-->"),
    # 17. 左侧内容区 -->
    ("左侧内容", "区 -->", BAD + "?-->"),
    # 18. 精选图片轮播 -->
    ("精选图片轮", "播 -->", BAD + "?-->"),
    # 19. 精选图片 + 换行 (section title)
    ("</i> 精选图", "片\n                        <a", BAD + "?                        <a"),
    # 20. 分类筛选 -->
    ("分类筛", "选 -->", BAD + "?-->"),
    # 21. 标签筛选 -->
    ("标签筛", "选 -->", BAD + "?-->"),
    # 22. 最新上传</option>
    ("最新上", "传</option>", BAD + "?/option>"),
    # 23. 最受欢迎</option>
    ("最受欢", "迎</option>", BAD + "?/option>"),
    # 24. 最多浏览</option>
    ("最多浏", "览</option>", BAD + "?/option>"),
    # 25. 最多下载</option>
    ("最多下", "载</option>", BAD + "?/option>"),
    # 26. 下载量</div>
    ('stat-label">下载', "量</div>", BAD + "?/div>"),
    # 27. 点赞数</div>
    ('stat-label">点赞', "数</div>", BAD + "?/div>"),
    # 28. 张图片</div>
    ("张图", "片</div>", BAD + "?/div>"),
    # 29. 最新相册 -->
    ("最新相", "册 -->", BAD + "?-->"),
    # 30. 最新相册 + 换行 (section title)
    ("</i> 最新相", "册\n                        </h3>", BAD + "?                        </h3>"),
    # 31. 获取更多曝光</p>
    ("获取更多曝", "光</p>", BAD + "?/p>"),
    # 32. 开始上传</button> (upload-btn)
    ('upload-btn">开始上', "传</button>", BAD + "?/button>"),
    # 33. 作者头像"
    ('alt="作者头', '像" class', BAD + '? class'),
    # 34. 请输入图片标题">
    ("请输入图片标", '题">', BAD + "?>"),
    # 35. 请输入图片描述"></textarea>
    ("请输入图片描", '述"></textarea>', BAD + "?></textarea>"),
    # 36. 设为精选</label>
    ("设为精", "选</label>", BAD + "?/label>"),
    # 37. 开始上传</button> (submit-upload)
    ('submit-upload">开始上', "传</button>", BAD + "?/button>"),
    # 38. 艺术价值。';
    ("艺术价值", "。';", BAD + "?;"),
    # 39. 处理文件预览 + 换行 (出现两次)
    ("处理文件预", "览\n                }", BAD + "?                }"),
    # 40. 分类筛选 + 换行 (JS)
    ("// 分类筛", "选\n        const categoryFilters", BAD + "?        const categoryFilters"),
    # 41. 移除所有激活状态 + 换行 (categoryFilters)
    ("// 移除所有激活状", "态\n                categoryFilters", BAD + "?                categoryFilters"),
    # 42. 添加当前激活状态 + 换行 (第一次 - 后跟 标签筛)
    ("// 添加当前激活状", "态\n                this.classList.add('active');\n            });\n        }\n\n        // 标签筛", BAD + "?                this.classList.add('active');\n            });\n        }\n\n        // 标签筛"),
    # 43. 标签筛选 + 换行 (JS)
    ("// 标签筛", "选\n        const tagFilters", BAD + "?        const tagFilters"),
    # 44. 移除所有激活状态 + 换行 (document.querySelectorAll)
    ("// 移除所有激活状", "态\n                document.querySelectorAll", BAD + "?                document.querySelectorAll"),
    # 45. 选项并激活 + 换行
    ("选项并激", "活\n                const tag", BAD + "?                const tag"),
    # 46. 移除所有激活状态 + 换行 (viewButtons)
    ("// 移除所有激活状", "态\n                viewButtons", BAD + "?                viewButtons"),
    # 47. 添加当前激活状态 + 换行 (第二次 - 后跟 轮播图控)
    ("// 添加当前激活状", "态\n                this.classList.add('active');\n            });\n        }\n\n        // 轮播图控", BAD + "?                this.classList.add('active');\n            });\n        }\n\n        // 轮播图控"),
    # 48. 轮播图控制 + 换行
    ("// 轮播图控", "制\n        const sliderPrev", BAD + "?        const sliderPrev"),
    # 49. 减少点赞数 + 换行
    ("// 减少点赞", "数\n                } else", BAD + "?                } else"),
    # 50. 增加点赞数 + 换行
    ("// 增加点赞", "数\n                }", BAD + "?                }"),
    # 51. 获取筛选后的图片 + 换行 (出现两次)
    ("获取筛选后的图", "片\n        }", BAD + "?        }"),
    # 52. 显示加载状态 + 换行
    ("// 显示加载状", "态\n            loadMoreBtn", BAD + "?            loadMoreBtn"),
    # 53. 加载中...'
    ("加载", "中...';", BAD + "?..';"),
    # 54. 恢复按钮状态 + 换行
    ("// 恢复按钮状", "态\n                loadMoreBtn", BAD + "?                loadMoreBtn"),
    # 55. 标签云样式 + 换行
    ("/* 标签云样", "式\n */", BAD + "?*/"),
    # 56. 响应式设置 + 换行
    ("/* 响应式设", "置\n */", BAD + "?*/"),
    # 57. 检查模块是否启用 + 换行
    ("// 检查模块是否启", "用\nif (!get_theme_mod", BAD + "?if (!get_theme_mod"),
    # 58. 联系管理员。 + 换行
    ("联系管理员", "。\n    </div></div>", BAD + "?    </div></div>"),
]

# 执行替换
success_count = 0
fail_count = 0

for prefix, correct_suffix, corrupt_suffix in pairs:
    full_corrupt = prefix + corrupt_suffix
    full_correct = prefix + correct_suffix

    if full_corrupt in content:
        # 替换所有匹配项
        count = content.count(full_corrupt)
        content = content.replace(full_corrupt, full_correct)
        success_count += 1
        print(f"OK ({count}x): {prefix[:20]}...")
    else:
        fail_count += 1
        print(f"FAIL: {prefix[:20]}... (not found)")

# 写回文件（UTF-8 无 BOM）
with open(file_path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\n========== 结果 ==========")
print(f"成功替换: {success_count}")
print(f"失败替换: {fail_count}")

# 验证：检查文件中是否还有 U+FFFD 字符
remaining_bad = content.count(BAD)
print(f"剩余 U+FFFD 字符数: {remaining_bad}")
