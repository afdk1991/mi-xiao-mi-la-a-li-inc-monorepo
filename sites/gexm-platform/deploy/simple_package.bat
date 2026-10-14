@echo off
echo WordPress主题打包工具
echo ====================

echo 创建分发目录...
if not exist "dist" mkdir "dist"

echo 复制主题文件...
xcopy "..\wp-content\themes\mixm-laal" "dist\mixm-laal\" /E /I /H /Y

echo 复制插件文件...
xcopy "..\wp-content\plugins\mixm-commerce" "dist\mixm-commerce\" /E /I /H /Y
xcopy "..\wp-content\plugins\mixm-security" "dist\mixm-security\" /E /I /H /Y

echo 创建部署说明...
echo # 拉阿狸主题部署说明 > "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo. >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo ## 文件列表 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo 1. mixm-laal - 主题目录 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo 2. mixm-commerce - 商城插件目录 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo 3. mixm-security - 安全插件目录 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo. >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo ## 部署步骤 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo. >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo ### 1. 上传文件 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo - 将主题目录上传到WordPress的 /wp-content/themes/ 目录 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo - 将插件目录上传到WordPress的 /wp-content/plugins/ 目录 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo. >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo ### 2. 安装主题和插件 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo 1. 登录WordPress后台 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo 2. 外观 → 主题 → 添加新主题 → 上传主题 → 选择 mixm-laal目录 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo 3. 插件 → 安装插件 → 上传插件 → 选择 mixm-commerce 和 mixm-security目录 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo. >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo ### 3. 激活组件 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo 1. 激活主题：外观 → 主题 → 启用 MixM Laal >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo 2. 激活插件：插件 → 已安装插件 → 启用 MixM Commerce 和 MixM Security >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo. >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo ### 4. 系统初始化 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo 1. 访问网站首页触发数据库表自动创建 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo 2. 配置各模块基础设置 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo. >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo ## 系统要求 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo - PHP 7.4 或更高版本 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo - MySQL 5.6 或更高版本 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo - WordPress 5.0 或更高版本 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo. >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo ## 支持信息 >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"
echo 如需技术支持，请联系：support@yourwebsite.com >> "dist\DEPLOYMENT_INSTRUCTIONS.txt"

echo 打包完成！请查看 dist 目录
echo.
echo 生成的文件：
echo - dist\mixm-laal\ (主题目录)
echo - dist\mixm-commerce\ (商城插件目录)
echo - dist\mixm-security\ (安全插件目录)
echo - dist\DEPLOYMENT_INSTRUCTIONS.txt (部署说明)
pause