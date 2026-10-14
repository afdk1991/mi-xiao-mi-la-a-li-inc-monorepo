$file = 'f:\gexm\wp-content\themes\mixm-laal\page-templates\page-gallery.php'

# Read as UTF-8 string
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# The corrupted pattern is U+FFFD followed by ?
$bad = [char]0xFFFD
$corruptPattern = "$bad" + "?"

# Simple replacements based on preceding character
# Each entry: @('preceding_chars' + $corruptPattern, 'replacement_full_string')
$fixes = @(
    @("样$corruptPattern */", '样式 */'),
    @("图标$corruptPattern    wp_enqueue", "图标库`r`n    wp_enqueue"),
    @("数$corruptPattern    wp_localiz", "数据`r`n    wp_localiz"),
    @("精$corruptPattern,',", "精选',"),
    @("最$corruptPattern,',", "最新',"),
    @("尺$corruptPattern        ", "尺寸`r`n        "),
    @("细节$corruptPattern,',", "细节。',"),
    @("摄影$corruptPattern . rand", "摄影师' . rand"),
    @("精选图$corruptPattern'", "精选图片'"),
    @("用户喜爱的作$corruptPattern,',", "用户喜爱的作品',"),
    @("最新相$corruptPattern */", '最新相册 */'),
    @("最新相$corruptPattern'", "最新相册'"),
    @("主内容区域开$corruptPattern?>", '主内容区域开始?>'),
    @("摄影$corruptPattern..", '摄影师..'),
    @("相册$corruptPattern</div>", '相册数</div>'),
    @("主内容区$corruptPattern-->", '主内容区域-->'),
    @("左侧内容$corruptPattern-->", '左侧内容区-->'),
    @("精选图片轮$corruptPattern-->", '精选图片轮播-->'),
    @("精选图$corruptPattern'", "精选图片'"),
    @("分类筛$corruptPattern-->", '分类筛选-->'),
    @("标签筛$corruptPattern-->", '标签筛选-->'),
    @("最新上$corruptPattern</option>", '最新上传</option>'),
    @("最受欢$corruptPattern</option>", '最受欢迎</option>'),
    @("最多浏$corruptPattern</option>", '最多浏览</option>'),
    @("最多下$corruptPattern</option>", '最多下载</option>'),
    @("下载$corruptPattern</div>", '下载量</div>'),
    @("点赞$corruptPattern</div>", '点赞数</div>'),
    @("张图$corruptPattern</div>", '张图片</div>'),
    @("最新相$corruptPattern-->", '最新相册-->'),
    @("更多曝$corruptPattern</p>", '更多曝光</p>'),
    @("开始上$corruptPattern</button>", '开始上传</button>'),
    @("作者头$corruptPattern class", '作者头像 class'),
    @("图片标$corruptPattern?>", '图片标题?>'),
    @("图片描$corruptPattern?></textarea>", '图片描述?></textarea>'),
    @("设为精$corruptPattern</label>", '设为精选</label>'),
    @("艺术价值$corruptPattern';", "艺术价值。';"),
    @("文件预$corruptPattern'", "文件预览'"),
    @("分类筛$corruptPattern        const", "分类筛选`r`n        const"),
    @("激活状$corruptPattern'", "激活状态'"),
    @("当前激活状$corruptPattern'", "当前激活状态'"),
    @("标签筛$corruptPattern        const", "标签筛选`r`n        const"),
    @("所有激活状$corruptPattern'", "所有激活状态'"),
    @("选项并激$corruptPattern'", "选项并激活'"),
    @("所有激活状$corruptPattern'", "所有激活状态'"),
    @("当前激活状$corruptPattern'", "当前激活状态'"),
    @("轮播图控$corruptPattern        const", "轮播图控制`r`n        const"),
    @("减少点赞$corruptPattern'", "减少点赞数'"),
    @("增加点赞$corruptPattern'", "增加点赞数'"),
    @("筛选后的图$corruptPattern        }", "筛选后的图片`r`n        }"),
    @("加载状$corruptPattern            lo", "加载状态`r`n            lo"),
    @("加载$corruptPattern...", '加载中...'),
    @("按钮状$corruptPattern'", "按钮状态'"),
    @("标签云样$corruptPattern*/", '标签云样式*/'),
    @("响应式设$corruptPattern*/", '响应式设计*/'),
    @("模块是否启$corruptPatternif", '模块是否启用if'),
    @("联系管理员$corruptPattern    </div>", "联系管理员。`r`n    </div>")
)

$count = 0
foreach ($pair in $fixes) {
    $search = $pair[0]
    $replace = $pair[1]
    if ($content.Contains($search)) {
        $content = $content.Replace($search, $replace)
        $count++
    }
}

# Check remaining corruption
$remaining = 0
$idx = 0
while (($idx = $content.IndexOf($corruptPattern, $idx)) -ge 0) {
    $remaining++
    $start = [Math]::Max(0, $idx - 30)
    $len = [Math]::Min(70, $content.Length - $start)
    Write-Host "Remaining at $idx : $($content.Substring($start, $len))"
    $idx++
}

Write-Host "Replacements applied: $count"
Write-Host "Remaining corrupted: $remaining"

# Write back as UTF-8 without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, $content, $utf8NoBom)
Write-Host "File saved."
