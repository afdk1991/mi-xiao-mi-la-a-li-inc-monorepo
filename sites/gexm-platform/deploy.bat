@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
set "SERVER_DIR=%PROJECT_DIR%packages\server"
set "APP_DIR=%PROJECT_DIR%packages\app"
set "LOG_DIR=%SERVER_DIR%\logs"
set "DATA_DIR=%SERVER_DIR%\data"
set "UPLOADS_DIR=%SERVER_DIR%\uploads"
set "BACKUP_DIR=%SERVER_DIR%\data\backups"

echo ================================================
echo           Gexm 生产环境部署脚本
echo ================================================
echo.

if "%1"=="help" (
    echo 用法: deploy.bat [命令]
    echo.
    echo 命令列表:
    echo   init       - 初始化部署环境
    echo   backup     - 备份数据库
    echo   build      - 构建前端生产产物
    echo   start      - 启动生产环境服务
    echo   stop       - 停止生产环境服务
    echo   restart    - 重启生产环境服务
    echo   status     - 查看服务状态
    echo   reload     - 热重载服务（零停机）
    echo   restore    - 从备份恢复数据库
    echo   clean      - 清理构建产物和日志
    echo   help       - 显示帮助信息
    echo.
    goto :eof
)

if "%1"=="init" (
    echo [1/5] 创建必要目录...
    if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
    if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
    if not exist "%UPLOADS_DIR%" mkdir "%UPLOADS_DIR%"
    if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
    echo       目录创建完成
    echo.

    echo [2/5] 安装项目依赖...
    cd /d "%PROJECT_DIR%"
    npm.cmd install
    echo       依赖安装完成
    echo.

    echo [3/5] 构建前端生产产物...
    npm.cmd run build:app-h5
    if %errorlevel% neq 0 (
        echo       前端构建失败，部署终止
        goto :eof
    )
    echo       前端构建完成
    echo.

    echo [4/5] 验证生产环境配置...
    if not exist "%SERVER_DIR%\.env.production" (
        echo       警告: 未找到 .env.production 文件
        echo       请复制 .env.example 并配置生产环境变量
    ) else (
        echo       生产环境配置文件存在
    )
    echo.

    echo [5/5] 部署初始化完成
    echo.
    echo       下一步: deploy.bat start
    goto :eof
)

if "%1"=="backup" (
    echo 正在创建数据库备份...
    cd /d "%SERVER_DIR%"
    node -e "const fs=require('fs'); const path=require('path'); const backupDir='data/backups'; if(!fs.existsSync(backupDir)) fs.mkdirSync(backupDir,{recursive:true}); const dbPath='data/gexm.db'; if(fs.existsSync(dbPath)){ const backupPath=`${backupDir}/gexm-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.db`; fs.copyFileSync(dbPath,backupPath); console.log('备份完成:',backupPath); }else{ console.log('数据库文件不存在'); }"
    goto :eof
)

if "%1"=="build" (
    echo 正在构建前端生产产物...
    cd /d "%PROJECT_DIR%"
    npm.cmd run build:app-h5
    if %errorlevel% equ 0 (
        echo       前端构建完成
    ) else (
        echo       前端构建失败
    )
    goto :eof
)

if "%1"=="start" (
    echo 正在启动生产环境服务...
    cd /d "%SERVER_DIR%"
    
    echo   1. 备份数据库...
    node -e "const fs=require('fs'); const path=require('path'); const backupDir='data/backups'; if(!fs.existsSync(backupDir)) fs.mkdirSync(backupDir,{recursive:true}); const dbPath='data/gexm.db'; if(fs.existsSync(dbPath)){ const backupPath=`${backupDir}/gexm-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.db`; fs.copyFileSync(dbPath,backupPath); console.log('备份完成:',backupPath); }"
    
    echo   2. 启动 PM2 服务...
    pm2 kill
    set NODE_ENV=production
    pm2 start ecosystem.config.js --env production
    
    echo   3. 等待服务启动...
    timeout /t 10 /nobreak >nul
    
    echo   4. 查看服务状态...
    pm2 status
    
    echo.
    echo   服务启动完成
    goto :eof
)

if "%1"=="stop" (
    echo 正在停止生产环境服务...
    cd /d "%SERVER_DIR%"
    pm2 kill
    echo   服务已停止
    goto :eof
)

if "%1"=="restart" (
    echo 正在重启生产环境服务...
    cd /d "%SERVER_DIR%"
    
    echo   1. 备份数据库...
    node -e "const fs=require('fs'); const path=require('path'); const backupDir='data/backups'; if(!fs.existsSync(backupDir)) fs.mkdirSync(backupDir,{recursive:true}); const dbPath='data/gexm.db'; if(fs.existsSync(dbPath)){ const backupPath=`${backupDir}/gexm-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.db`; fs.copyFileSync(dbPath,backupPath); console.log('备份完成:',backupPath); }"
    
    echo   2. 重启 PM2 服务...
    set NODE_ENV=production
    pm2 restart ecosystem.config.js --env production
    
    echo   3. 等待服务启动...
    timeout /t 10 /nobreak >nul
    
    echo   4. 查看服务状态...
    pm2 status
    
    echo.
    echo   服务重启完成
    goto :eof
)

if "%1"=="status" (
    echo 服务状态:
    cd /d "%SERVER_DIR%"
    pm2 status
    echo.
    echo 健康检查:
    curl -s http://localhost:3000/api/health || echo 服务未运行或端口不可达
    goto :eof
)

if "%1"=="reload" (
    echo 正在热重载服务（零停机）...
    cd /d "%SERVER_DIR%"
    pm2 reload ecosystem.config.js --env production
    echo   热重载完成
    pm2 status
    goto :eof
)

if "%1"=="restore" (
    echo 从备份恢复数据库...
    echo   可用备份:
    dir "%BACKUP_DIR%" /b
    echo.
    set /p "backupFile=请输入要恢复的备份文件名: "
    if exist "%BACKUP_DIR%\%backupFile%" (
        echo   正在恢复...
        copy "%BACKUP_DIR%\%backupFile%" "%DATA_DIR%\gexm.db" /y
        echo   恢复完成
    ) else (
        echo   备份文件不存在
    )
    goto :eof
)

if "%1"=="clean" (
    echo 正在清理构建产物和日志...
    echo   1. 清理前端构建产物...
    if exist "%APP_DIR%\dist" rd /s /q "%APP_DIR%\dist"
    echo   2. 清理日志文件...
    del "%LOG_DIR%\*.log" /q 2>nul
    echo   3. 清理备份文件（保留最近7天）...
    forfiles /p "%BACKUP_DIR%" /s /m *.db /d -7 /c "cmd /c del @path" 2>nul
    echo   清理完成
    goto :eof
)

echo 未知命令: %1
echo 请使用 deploy.bat help 查看可用命令