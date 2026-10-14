# 修复 page-gallery.php 中所有 U+FFFD + ? 损坏字符
# 使用按行替换方式，避免复杂的字符串匹配问题

$file = 'f:\gexm\wp-content\themes\mixm-laal\page-templates\page-gallery.php'

# 读取文件所有行（UTF-8 编码）
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

# U+FFFD 字符
$bad = [char]0xFFFD

# 定义行替换映射：行号(0-based) -> 正确的行内容
# 根据 Grep 输出的损坏行号，构建替换映射
# 注意：行号是 1-based 的，在数组中需要减 1

$replacements = @{}

# 读取文件内容作为单个字符串用于验证
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# 使用更简单的方法：直接在内容上做字符串替换
# 每个 FFFD + ? 替换为正确的字符

# 构建替换对：损坏的模式 -> 正确的文本
# 注意：FFFD 替换了一个3字节中文字符，? 替换了一个1字节字符（通常是换行或引号）

$pairs = @(
    # 注释区域 - FFFD? 替换为 字符+换行
    # 样式 + 换行
    ,@("相册模块功能脚本和样", "式`n */", "$($bad)? */")
    # 图标库 + 换行 (已修复，跳过)
    # 数据 + 换行
    ,@("本地化脚本数", "据`n    wp_localize_script", "$($bad)?    wp_localize_script")
    # 精选 (标签)
    ,@("'精", "选', 'slug' => 'featured'", "$($bad)?', 'slug' => 'featured'")
    # 最新 (标签)
    ,@("'最", "新', 'slug' => 'latest'", "$($bad)?', 'slug' => 'latest'")
    # 尺寸 + 换行
    ,@("根据方向设置不同的尺", "寸`n        " + '$width', "$($bad)?        " + '$width')
    # 细节。'
    ,@("的独特魅力和细节", "。',", "$($bad)?,")
    # 摄影师' (gallery_module_get_images) - 需要唯一上下文
    ,@("'摄影", "师' . rand(1, 30),`n            'author_avatar' => ", "$($bad)? . rand(1, 30),`n            'author_avatar' => ")
    # 获取精选图片 + 换行
    ,@("获取精选图", "片`n */", "$($bad)? */")
    # 精选图片'
    ,@("'精选图", "片' . ", "$($bad)?' . ")
    # 用户喜爱的作品'
    ,@("用户喜爱的作", "品',", "$($bad)?,")
    # 获取最新相册 + 换行
    ,@("获取最新相", "册`n */", "$($bad)? */")
    # 摄影师' (gallery_module_get_latest_albums) - 需要唯一上下文
    ,@("'摄影", "师' . rand(1, 30)`n        );", "$($bad)? . rand(1, 30)`n        );")
    # 主内容区域开始 + 换行
    ,@("主内容区域开", "始`n?>", "$($bad)?>")
    # 搜索摄影师...
    ,@("相册或摄影", "师...", "$($bad)?..")
    # 相册数</div>
    ,@("stat-label"">相册", "数</div>", "$($bad)?/div>")
    # 主内容区域 -->
    ,@("主内容区", "域 -->", "$($bad)?-->")
    # 左侧内容区 -->
    ,@("左侧内容", "区 -->", "$($bad)?-->")
    # 精选图片轮播 -->
    ,@("精选图片轮", "播 -->", "$($bad)?-->")
    # 精选图片 + 换行 (section title)
    ,@("</i> 精选图", "片`n                        <a", "$($bad)?                        <a")
    # 分类筛选 -->
    ,@("分类筛", "选 -->", "$($bad)?-->")
    # 标签筛选 -->
    ,@("标签筛", "选 -->", "$($bad)?-->")
    # 最新上传</option>
    ,@("最新上", "传</option>", "$($bad)?/option>")
    # 最受欢迎</option>
    ,@("最受欢", "迎</option>", "$($bad)?/option>")
    # 最多浏览</option>
    ,@("最多浏", "览</option>", "$($bad)?/option>")
    # 最多下载</option>
    ,@("最多下", "载</option>", "$($bad)?/option>")
    # 下载量</div>
    ,@("stat-label"">下载", "量</div>", "$($bad)?/div>")
    # 点赞数</div>
    ,@("stat-label"">点赞", "数</div>", "$($bad)?/div>")
    # 张图片</div>
    ,@("张图", "片</div>", "$($bad)?/div>")
    # 最新相册 -->
    ,@("最新相", "册 -->", "$($bad)?-->")
    # 最新相册 + 换行 (section title)
    ,@("</i> 最新相", "册`n                        </h3>", "$($bad)?                        </h3>")
    # 获取更多曝光</p>
    ,@("获取更多曝", "光</p>", "$($bad)?/p>")
    # 开始上传</button> (upload-btn)
    ,@("upload-btn"">开始上", "传</button>", "$($bad)?/button>")
    # 作者头像"
    ,@("alt=""作者头", "像"" class", "$($bad)? class")
    # 请输入图片标题">
    ,@("请输入图片标", "题"">", "$($bad)?>")
    # 请输入图片描述"></textarea>
    ,@("请输入图片描", "述""></textarea>", "$($bad)?></textarea>")
    # 设为精选</label>
    ,@("设为精", "选</label>", "$($bad)?/label>")
    # 开始上传</button> (submit-upload)
    ,@("submit-upload"">开始上", "传</button>", "$($bad)?/button>")
    # 艺术价值。';
    ,@("艺术价值", "。';", "$($bad)?;")
    # 处理文件预览 + 换行 (出现两次)
    ,@("处理文件预", "览`n                }", "$($bad)?                }")
    # 分类筛选 + 换行 (JS)
    ,@("// 分类筛", "选`n        const categoryFilters", "$($bad)?        const categoryFilters")
    # 移除所有激活状态 + 换行 (categoryFilters)
    ,@("// 移除所有激活状", "态`n                categoryFilters", "$($bad)?                categoryFilters")
    # 添加当前激活状态 + 换行 (第一次 - 后跟 标签筛)
    ,@("// 添加当前激活状", "态`n                this.classList.add('active');`n            });`n        }`n`n        // 标签筛", "$($bad)?                this.classList.add('active');`n            });`n        }`n`n        // 标签筛")
    # 标签筛选 + 换行 (JS)
    ,@("// 标签筛", "选`n        const tagFilters", "$($bad)?        const tagFilters")
    # 移除所有激活状态 + 换行 (document.querySelectorAll)
    ,@("// 移除所有激活状", "态`n                document.querySelectorAll", "$($bad)?                document.querySelectorAll")
    # 选项并激活 + 换行
    ,@("选项并激", "活`n                const tag", "$($bad)?                const tag")
    # 移除所有激活状态 + 换行 (viewButtons)
    ,@("// 移除所有激活状", "态`n                viewButtons", "$($bad)?                viewButtons")
    # 添加当前激活状态 + 换行 (第二次 - 后跟 轮播图控)
    ,@("// 添加当前激活状", "态`n                this.classList.add('active');`n            });`n        }`n`n        // 轮播图控", "$($bad)?                this.classList.add('active');`n            });`n        }`n`n        // 轮播图控")
    # 轮播图控制 + 换行
    ,@("// 轮播图控", "制`n        const sliderPrev", "$($bad)?        const sliderPrev")
    # 减少点赞数 + 换行
    ,@("// 减少点赞", "数`n                } else", "$($bad)?                } else")
    # 增加点赞数 + 换行
    ,@("// 增加点赞", "数`n                }", "$($bad)?                }")
    # 获取筛选后的图片 + 换行 (出现两次)
    ,@("获取筛选后的图", "片`n        }", "$($bad)?        }")
    # 显示加载状态 + 换行
    ,@("// 显示加载状", "态`n            loadMoreBtn", "$($bad)?            loadMoreBtn")
    # 加载中...'
    ,@("加载", "中...';", "$($bad)?..';")
    # 恢复按钮状态 + 换行
    ,@("// 恢复按钮状", "态`n                loadMoreBtn", "$($bad)?                loadMoreBtn")
    # 标签云样式 + 换行
    ,@("/* 标签云样", "式`n */", "$($bad)?*/")
    # 响应式设置 + 换行
    ,@("/* 响应式设", "置`n */", "$($bad)?*/")
    # 检查模块是否启用 + 换行
    ,@("// 检查模块是否启", "用`nif (!get_theme_mod", "$($bad)?if (!get_theme_mod")
    # 联系管理员。 + 换行
    ,@("联系管理员", "。`n    </div></div>", "$($bad)?    </div></div>")
)

# 执行替换
$successCount = 0
$failCount = 0

foreach ($pair in $pairs) {
    $prefix = $pair[0]
    $correctSuffix = $pair[1]
    $corruptSuffix = $pair[2]
    $fullCorrupt = $prefix + $corruptSuffix
    $fullCorrect = $prefix + $correctSuffix

    if ($content.Contains($fullCorrupt)) {
        $content = $content.Replace($fullCorrupt, $fullCorrect)
        $successCount++
        Write-Host "OK: $prefix..."
    } else {
        $failCount++
        Write-Host "FAIL: $prefix... (not found)"
    }
}

# 写回文件（UTF-8 无 BOM）
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($file, $content, $utf8NoBom)

Write-Host "`n========== 结果 =========="
Write-Host "成功替换: $successCount"
Write-Host "失败替换: $failCount"

# 验证：检查文件中是否还有 U+FFFD 字符
$remainingBad = ($content.ToCharArray() | Where-Object { $_ -eq [char]0xFFFD }).Count
Write-Host "剩余 U+FFFD 字符数: $remainingBad"
