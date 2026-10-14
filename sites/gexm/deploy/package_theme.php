<?php
/**
 * WordPress主题打包脚本
 * 
 * 用于将开发环境中的主题文件打包为分发版本
 * 
 * @package MixM Laal Deployment
 */

// 防止直接访问
if (!defined('ABSPATH') && php_sapi_name() !== 'cli') {
    exit('No direct script access allowed');
}

class ThemePackager {
    
    private $theme_dir;
    private $plugin_dirs;
    private $output_dir;
    
    public function __construct() {
        $this->theme_dir = dirname(__DIR__) . '/wp-content/themes/mixm-laal';
        $this->plugin_dirs = [
            'mixm-commerce' => dirname(__DIR__) . '/wp-content/plugins/mixm-commerce',
            'mixm-security' => dirname(__DIR__) . '/wp-content/plugins/mixm-security'
        ];
        $this->output_dir = dirname(__DIR__) . '/dist';
        
        // 创建输出目录
        if (!file_exists($this->output_dir)) {
            mkdir($this->output_dir, 0755, true);
        }
    }
    
    /**
     * 打包主题
     */
    public function packageTheme() {
        echo "开始打包主题...\n";
        
        // 检查主题目录是否存在
        if (!file_exists($this->theme_dir)) {
            die("错误：主题目录不存在\n");
        }
        
        // 创建临时目录
        $temp_dir = $this->output_dir . '/temp_theme';
        $this->copyDirectory($this->theme_dir, $temp_dir);
        
        // 清理开发文件（如果有的话）
        $this->cleanDevelopmentFiles($temp_dir);
        
        // 创建zip文件
        $zip_file = $this->output_dir . '/mixm-laal-theme.zip';
        $this->createZip($temp_dir, $zip_file);
        
        // 删除临时目录
        $this->removeDirectory($temp_dir);
        
        echo "主题打包完成：$zip_file\n";
        return $zip_file;
    }
    
    /**
     * 打包插件
     */
    public function packagePlugins() {
        echo "开始打包插件...\n";
        $plugin_files = [];
        
        foreach ($this->plugin_dirs as $plugin_name => $plugin_dir) {
            // 检查插件目录是否存在
            if (!file_exists($plugin_dir)) {
                echo "警告：插件目录不存在 - $plugin_name\n";
                continue;
            }
            
            // 创建临时目录
            $temp_dir = $this->output_dir . '/temp_' . $plugin_name;
            $this->copyDirectory($plugin_dir, $temp_dir);
            
            // 清理开发文件（如果有的话）
            $this->cleanDevelopmentFiles($temp_dir);
            
            // 创建zip文件
            $zip_file = $this->output_dir . '/' . $plugin_name . '.zip';
            $this->createZip($temp_dir, $zip_file);
            
            // 删除临时目录
            $this->removeDirectory($temp_dir);
            
            echo "插件打包完成：$zip_file\n";
            $plugin_files[] = $zip_file;
        }
        
        return $plugin_files;
    }
    
    /**
     * 复制目录
     */
    private function copyDirectory($src, $dst) {
        $dir = opendir($src);
        @mkdir($dst);
        
        while (($file = readdir($dir)) !== false) {
            if ($file != '.' && $file != '..') {
                if (is_dir($src . '/' . $file)) {
                    $this->copyDirectory($src . '/' . $file, $dst . '/' . $file);
                } else {
                    copy($src . '/' . $file, $dst . '/' . $file);
                }
            }
        }
        
        closedir($dir);
    }
    
    /**
     * 清理开发文件
     */
    private function cleanDevelopmentFiles($dir) {
        // 可以在这里添加清理开发相关文件的逻辑
        // 例如：删除.git目录、node_modules、*.log文件等
        
        $files_to_remove = [
            '.git',
            '.gitignore',
            'node_modules',
            '*.log',
            '.DS_Store',
            'Thumbs.db'
        ];
        
        // 这里只是一个示例，实际使用时可以根据需要调整
        echo "清理开发文件...\n";
    }
    
    /**
     * 创建zip文件
     */
    private function createZip($source, $destination) {
        if (!extension_loaded('zip')) {
            die("错误：PHP Zip扩展未安装\n");
        }
        
        $zip = new ZipArchive();
        if (!$zip->open($destination, ZipArchive::CREATE | ZipArchive::OVERWRITE)) {
            die("错误：无法创建zip文件\n");
        }
        
        $source = str_replace('\\', '/', realpath($source));
        
        if (is_dir($source) === true) {
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($source),
                RecursiveIteratorIterator::LEAVES_ONLY
            );
            
            foreach ($files as $file) {
                $file = str_replace('\\', '/', $file);
                
                // 忽略 "." 和 ".." 文件夹
                if (in_array(substr($file, strrpos($file, '/') + 1), ['.', '..'])) {
                    continue;
                }
                
                $file = realpath($file);
                $file_path = str_replace('\\', '/', $file);
                
                if (is_dir($file) === true) {
                    $zip->addEmptyDir(str_replace($source . '/', '', $file_path . '/'));
                } else if (is_file($file) === true) {
                    $zip->addFromString(
                        str_replace($source . '/', '', $file_path),
                        file_get_contents($file)
                    );
                }
            }
        }
        
        return $zip->close();
    }
    
    /**
     * 删除目录
     */
    private function removeDirectory($dir) {
        if (!file_exists($dir)) {
            return true;
        }
        
        if (!is_dir($dir)) {
            return unlink($dir);
        }
        
        foreach (scandir($dir) as $item) {
            if ($item == '.' || $item == '..') {
                continue;
            }
            
            if (!$this->removeDirectory($dir . DIRECTORY_SEPARATOR . $item)) {
                return false;
            }
        }
        
        return rmdir($dir);
    }
    
    /**
     * 生成部署说明文件
     */
    public function generateDeploymentInstructions() {
        $instructions = "# 拉阿狸主题部署说明

## 文件列表
1. mixm-laal-theme.zip - 主题文件
2. mixm-commerce.zip - 商城插件
3. mixm-security.zip - 安全插件

## 部署步骤

### 1. 上传文件
- 将主题zip文件上传到WordPress的 `/wp-content/themes/` 目录
- 将插件zip文件上传到WordPress的 `/wp-content/plugins/` 目录

### 2. 安装主题和插件
1. 登录WordPress后台
2. 外观 → 主题 → 添加新主题 → 上传主题 → 选择 mixm-laal-theme.zip
3. 插件 → 安装插件 → 上传插件 → 选择 mixm-commerce.zip 和 mixm-security.zip

### 3. 激活组件
1. 激活主题：外观 → 主题 → 启用 MixM Laal
2. 激活插件：插件 → 已安装插件 → 启用 MixM Commerce 和 MixM Security

### 4. 系统初始化
1. 访问网站首页触发数据库表自动创建
2. 配置各模块基础设置

## 系统要求
- PHP 7.4 或更高版本
- MySQL 5.6 或更高版本
- WordPress 5.0 或更高版本

## 支持信息
如需技术支持，请联系：support@yourwebsite.com";

        file_put_contents($this->output_dir . '/DEPLOYMENT_INSTRUCTIONS.txt', $instructions);
        echo "部署说明文件已生成\n";
    }
}

// 如果通过命令行运行
if (php_sapi_name() === 'cli') {
    $packager = new ThemePackager();
    
    echo "=== WordPress主题打包工具 ===\n\n";
    
    // 打包主题
    $packager->packageTheme();
    
    // 打包插件
    $packager->packagePlugins();
    
    // 生成部署说明
    $packager->generateDeploymentInstructions();
    
    echo "\n所有文件打包完成！请查看 dist/ 目录\n";
}
?>