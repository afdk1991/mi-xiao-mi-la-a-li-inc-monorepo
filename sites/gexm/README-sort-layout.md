# MixM Laal 排序布局使用指南

本文档详细介绍如何在 MixM Laal 主题和网站的各个模块中使用新的排序布局 UI 排版。

## 布局样式概述

我们根据提供的参考图片 `/www/wwwroot/api.laal.top/2258c750-8e77-491d-8f56-908c3199f57e.jpg` 实现了两种主要布局样式：

1. **模块网格布局**：使用 `module-grid` 和 `module-item` 类
2. **排序布局**：使用 `sort-layout` 和 `sort-item` 类（重点推荐）

## 1. 排序布局使用方法

排序布局是一种特殊的布局形式，其中第一个项目（索引为1、4、7...）会显示为宽屏样式，其他项目显示为标准尺寸。

### HTML 结构

```html
<div class="sort-layout">
    <!-- 宽屏项目 (第1个) -->
    <div class="sort-item">
        <div class="sort-content">
            <div class="sort-image">
                <img src="图片URL" alt="图片描述">
            </div>
            <div class="sort-body">
                <h3 class="sort-title"><a href="链接URL">标题内容</a></h3>
                <p class="sort-description">描述内容</p>
                <div class="sort-meta">
                    <span>分类信息</span>
                    <span>时间信息</span>
                </div>
                <div class="sort-action">
                    <a href="链接URL" class="btn btn-primary">了解更多</a>
                </div>
            </div>
        </div>
    </div>
    
    <!-- 标准项目 (第2个) -->
    <div class="sort-item">
        <div class="sort-content">
            <div class="sort-image">
                <img src="图片URL" alt="图片描述">
            </div>
            <div class="sort-body">
                <h3 class="sort-title"><a href="链接URL">标题内容</a></h3>
                <p class="sort-description">描述内容</p>
                <div class="sort-meta">
                    <span>分类信息</span>
                    <span>时间信息</span>
                </div>
                <div class="sort-action">
                    <a href="链接URL" class="btn btn-secondary">查看</a>
                </div>
            </div>
        </div>
    </div>
    
    <!-- 标准项目 (第3个) -->
    <div class="sort-item">
        <div class="sort-content">
            <!-- 内容结构同上 -->
        </div>
    </div>
    
    <!-- 宽屏项目 (第4个) -->
    <div class="sort-item">
        <div class="sort-content">
            <!-- 内容结构同上 -->
        </div>
    </div>
    
    <!-- 以此类推 -->
</div>
```

### 样式特点

- 每3个项目为一组，第1个项目（3n+1）为宽屏样式
- 宽屏项目图片高度为300px，标准项目图片高度为200px
- 所有项目都有悬停动画效果
- 完全响应式设计，在不同设备上自动调整布局

## 2. 模块网格布局使用方法

模块网格布局适用于需要整齐排列的内容块，所有项目大小一致。

### HTML 结构

```html
<div class="module-grid">
    <div class="module-item">
        <div class="module-content">
            <div class="module-image">
                <img src="图片URL" alt="图片描述">
            </div>
            <div class="module-body">
                <h3 class="module-title">标题内容</h3>
                <p class="module-description">描述内容</p>
                <div class="module-meta">
                    <span>元数据1</span>
                    <span>元数据2</span>
                </div>
                <div class="module-action">
                    <a href="链接URL" class="btn btn-primary">操作按钮</a>
                </div>
            </div>
        </div>
    </div>
    
    <!-- 更多模块项 -->
</div>
```

## 3. 在 WordPress 中使用

### 首页已更新

首页（`index.php`）已经更新为使用排序布局显示内容，您可以参考其实现方式。

### 在其他页面模板中使用

在任何 WordPress 页面模板中，您可以使用以下代码显示排序布局：

```php
<section class="module-section">
    <h2 class="section-title">标题</h2>
    <div class="sort-layout">
        <?php
        // 查询文章或其他内容
        $args = array(
            'post_type' => 'post',
            'posts_per_page' => 6,
            // 其他查询参数
        );
        $query = new WP_Query($args);
        $post_count = 0;
        
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_count++;
                
                // 获取文章信息
                $post_title = get_the_title();
                $post_excerpt = get_the_excerpt();
                $post_link = get_permalink();
                $post_date = get_the_date();
                
                // 获取分类信息
                $categories = array();
                foreach (get_the_category() as $category) {
                    $categories[] = $category->name;
                }
                $category_text = !empty($categories) ? '分类：' . implode(', ', $categories) : '分类：未分类';
                
                // 获取特色图片或使用默认图片
                $featured_image = '2258c750-8e77-491d-8f56-908c3199f57e.jpg';
                if (has_post_thumbnail()) {
                    $featured_image = get_the_post_thumbnail_url(get_the_ID(), 'large');
                }
                
                // 输出排序布局项
                echo '<div class="sort-item">';
                echo '<div class="sort-content">';
                echo '<div class="sort-image">';
                echo '<img src="' . esc_url($featured_image) . '" alt="' . esc_attr($post_title) . '" />';
                echo '</div>';
                echo '<div class="sort-body">';
                echo '<h3 class="sort-title"><a href="' . esc_url($post_link) . '" title="' . esc_attr($post_title) . '">' . esc_html($post_title) . '</a></h3>';
                echo '<p class="sort-description">' . esc_html($post_excerpt) . '</p>';
                echo '<div class="sort-meta">';
                echo '<span>' . esc_html($category_text) . '</span>';
                echo '<span>时间：' . esc_html($post_date) . '</span>';
                echo '</div>';
                echo '<div class="sort-action">';
                echo '<a href="' . esc_url($post_link) . '" class="btn ' . ($post_count % 3 == 1 ? 'btn-primary' : 'btn-secondary') . '">';
                echo ($post_count % 3 == 1 ? '了解更多' : '查看');
                echo '</a>';
                echo '</div>';
                echo '</div>';
                echo '</div>';
                echo '</div>';
            }
            wp_reset_postdata();
        }
        ?>
    </div>
</section>
```

## 4. 响应式设计

排序布局已完全适配各种屏幕尺寸：

- **大屏设备**（>992px）：每3个项目为一行，第1个项目为宽屏
- **平板设备**（577px-992px）：每2个项目为一行，第1个项目为宽屏
- **移动设备**（<577px）：单列布局，所有项目尺寸一致

## 5. 示例文件

- **sort-layout-example.html**：排序布局的静态演示页面
- **index.php**：已更新为使用排序布局的首页

## 6. CSS 变量自定义

您可以通过修改以下 CSS 变量来自定义布局样式：

```css
:root {
    --module-padding: 20px;       /* 模块内边距 */
    --module-margin: 24px 0;     /* 模块外边距 */
    --module-border: 1px solid rgba(0, 0, 0, 0.1); /* 模块边框 */
    
    /* 其他已有变量 */
    --primary-color: #3498db;
    --secondary-color: #8e44ad;
    --text-primary: #2c3e50;
    --text-secondary: #7f8c8d;
    --border-radius: 10px;
    --transition: all 0.3s ease;
}
```

## 7. 常见问题

### Q: 如何在特定模块中使用排序布局？
A: 只需将模块的内容容器替换为 `sort-layout` 结构，并按照上述 HTML 格式填充内容即可。

### Q: 如何修改宽屏项目和标准项目的比例？
A: 可以通过调整 CSS 中的 `.sort-item` 和 `.sort-item:nth-child(3n+1)` 的宽度百分比来修改。

### Q: 如何更改图片高度？
A: 可以修改 `.sort-item:nth-child(3n+1) .sort-image` 和 `.sort-item:not(:nth-child(3n+1)) .sort-image` 的 `height` 属性。

## 8. 应用范围

此排序布局适用于以下模块：

- 首页内容展示
- 文章列表页
- 产品展示页
- 社区内容页
- 论坛主题列表
- 商城商品展示
- 视频内容列表
- 网站分类内容
- 互联网采集内容
- 手机拉阿狸模块
- 漂流瓶模块

所有模块都可以使用相同的 HTML 结构和 CSS 类来实现一致的视觉效果。