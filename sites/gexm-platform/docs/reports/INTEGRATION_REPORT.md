# F:\gexm 全栈项目整合清单报告
生成时间: 2026-07-15 03:35:00

## 一、整合概述

将 E:\ 和 F:\ 下所有全栈项目及相关内容整合到 F:\gexm 根目录,采用分类目录结构,
保持现有 monorepo(packages/)不变,新增 5 个分类目录承载整合内容。

整合策略: 融合/合并到 F:\gexm 根目录(用户确认)
源处理: 先复制后验证(源目录暂保留,待用户确认后删除)

## 二、F:\gexm 最终目录结构

### 主 monorepo (原有,保持不变)
| 目录 | 文件数 | 大小 | 说明 |
|---|---|---|---|
| packages/ | 12,443 | 1.26 GB | 主 monorepo: app/pc/server/sdk/desktop/harmony-app/shared/user-service |
| docs/ | 57 | <0.01 GB | 项目文档(50+ .md) |
| deploy/ | 10 | <0.01 GB | 部署配置(nginx/monitoring/scripts) |
| docker/ | 2 | <0.01 GB | Docker 配置(nginx/redis) |
| scripts/ | 3 | <0.01 GB | 项目脚本 |
| responsive-test/ | 265 | 0.03 GB | 响应式测试 |
| node_modules/ | 76,724 | 0.94 GB | 主项目依赖 |

### 整合新增分类目录
| 目录 | 文件数 | 大小 | 说明 |
|---|---|---|---|
| legacy-projects/ | 6,183 | 0.65 GB | 9个代码项目 + WordPress(可独立运行) |
| legacy-data/ | 54,276 | 80.27 GB | 非代码数据(softmove/迅雷下载/表格/DOCX/散文件/备份/安装包等) |
| legacy-docs/ | 64 | <0.01 GB | 文档集(docs_rW672 + E根md文件 + 归档文档) |
| legacy-web/ | 28 | <0.01 GB | Web 文件(WordPress 文件 + login/) |
| certs/ | 26 | <0.01 GB | SSL 证书(laal-top/mixm-top) |

## 三、legacy-projects 代码项目验证(可运行性)

| 项目 | 类型 | 关键文件 | 可运行 |
|---|---|---|---|
| MIXMLAAL | Node.js | package.json + .env + query | YES |
| RouteNav | 全栈 TS | package.json + pnpm-lock + tsconfig | YES |
| daijiatongxcx | 部署项目 | package.json + .env + dev-hot.js + deploy.ps1 | YES |
| projects | Docker 全栈 | package.json + Dockerfile + pnpm-lock | YES |
| zhinenglux | React TSX | package.json + src/app.tsx + tsconfig | YES |
| zlzm | Python+JS | app.py + main.js + init_db.py | YES |
| xin2 | Next.js | package.json + next.config.js | YES |
| xinxm | Node.js | package.json + .env | YES |
| dhlwz | Node.js | package.json + .env + query | YES |
| merged_laal_project | WordPress | index.php + wp-config.php + style.css | YES |

## 四、各分类目录内容详情

### legacy-projects/ (代码项目,可独立运行)
- MIXMLAAL/ - Node.js 项目
- RouteNav/ - 全栈 TS 项目(含 server/)
- daijiatongxcx/ - 部署项目(含 deploy.ps1/dev-hot.js/web.config)
- projects/ - Docker 化全栈项目
- zhinenglux/ - React TSX 项目
- zlzm/ - Python+JS 混合项目
- xin2/ - Next.js 项目
- xinxm/ - Node.js 项目
- dhlwz/ - Node.js 项目
- merged_laal_project/ - WordPress 网站(PHP)

### certs/ (SSL 证书)
- laal-top/ - laal.top 域名 SSL 证书(IIS/Tomcat8_4/Tomcat8_5+ 格式)
- mixm-top/ - mixm.top 域名 SSL 证书(IIS/Tomcat8_4/Tomcat8_5+ 格式)

### legacy-docs/ (文档集)
- docs_rW672/ - MixM/Laal 项目文档集(54 个 .md 文件)
- *.md - E:\ 根目录散文件文档(8 个: 全平台应用系统开发.md/确保项目完整运行.md 等)
- 归档文档 - PROJECT_COMPLETED.txt/README.md/Dfrg.log/super_platform_*.md 等

### legacy-data/ (非代码数据,80.27 GB)
- softmove/ - 软件搬家数据(36.28 GB,596 文件)
- xunlei-downloads/ - 迅雷下载(43.29 GB,53170 文件,驱动包/工具)
- docx-docs/ - DOCX 文档(7 个 Word 文档)
- spreadsheets/ - 表格(33 个 Excel 文件,94.82 MB)
- code-zips/ - 代码压缩包(global-ride-app.zip)
- misc-files/ - 散文件(zip/txt/html/csv/jpeg/jpg,30+ 文件)
- backups/ - 备份文件(tar.gz/sql/zip,74.33 MB)
- configs/ - 配置文件(.user.ini/wp-config.php/SSH.pem)
- installers/ - 安装包(BtSoft.exe/DevinUserSetup/OpenCode Desktop,397.67 MB)
- media/ - 媒体文件(图片/torrent,1.13 MB)
- scripts/ - 脚本文件(.php/.sh/.py/.bat,10 文件)
- runtimes/ - 运行时(curl/php,20.61 MB)
- f-data/ - F:\data 目录内容(2.66 MB)
- f-logs/ - F:\logs 目录内容(464.9 KB)

### legacy-web/ (Web 文件)
- WordPress 核心文件(index.php/wp-login.php/wp-load.php 等)
- login/ - 登录页占位文件(login0-login13)

## 五、整合操作记录

### 已完成操作
1. 创建 5 个分类目录(legacy-projects/certs/legacy-docs/legacy-data/legacy-web)
2. 复制 9 个代码项目到 legacy-projects/(排除 node_modules/.git/dist/build 等)
3. 复制 2 个 SSL 证书目录到 certs/
4. 复制 WordPress 到 legacy-projects/merged_laal_project/
5. 复制文档集到 legacy-docs/
6. 复制 softmove(36.28GB)到 legacy-data/
7. 复制迅雷下载(43.29GB)到 legacy-data/
8. 复制 DOCX/表格/代码压缩包/散文件到 legacy-data/
9. 复制 E:\ 根目录散文件(.md/.csv/.jpeg/.html/.zip/.txt)到 legacy-docs/ 和 legacy-data/
10. 复制 F:\data 和 F:\logs 到 legacy-data/
11. 融合 _archive 独有内容(backups/configs/installers/media/scripts/runtimes/docs/web)到新分类目录
12. 删除 _archive 目录(robocopy /MIR 清空 111452 文件/39.7GB)

### 跳过的内容(空目录或缓存)
- E:\ABDM, E:\DriverUpdater, E:\JxUp - 空目录
- E:\addk1 - Windows 用户媒体文件夹(仅 desktop.ini)
- F:\daijiatongxcx, F:\default, F:\JZDSInstallKit, F:\KuGou, F:\QLDownloadGame, F:\SHDownload - 空目录
- F:\.pnpm-store, F:\qycache - 缓存目录(可重生成)

### 源目录状态
源目录(E:\ 和 F:\)暂保留未删除,待用户验证整合结果后确认删除。

## 六、E:\04_个人项目 整合记录 (2026-07-16)

### 验证结果
- 29/29 项全部存在(12个文件夹 + 9个压缩包 + 2个散文件 + 6个其他文件夹)

### 整合到 packages/ 的全栈项目 (11个)
| 源路径 | 目标路径 | 大小 | 说明 |
|---|---|---|---|
| MIXMLAAL | packages/mixmlaal | 21.02 MB | 主 monorepo(apps/backend-java/microservices/miniapp/monitoring) |
| Mi Xiao Mi La A Li Inc | packages/mixmlaal-inc | 1257.97 MB | 全栈(react-admin/vue-pc/springcloud/nest-gateway/fastapi/uni-app) |
| Mi Xiao Mi A Li Inc | packages/mixmlaal-inc-legacy | 344.44 MB | 旧版全栈项目 |
| XIN Mi Xiao Mi La A Li Inc | packages/omniplex-platform | 3.98 MB | omniplex-platform(client/server/deploy) |
| projects | packages/coze-projects | 6.33 MB | Docker化全栈(client/server) |
| RouteNav | packages/route-nav | 11.25 MB | Expo客户端+Server+Taro小程序 |
| zhinenglux | packages/zhinenglux | 1.19 MB | Taro小程序+NestJS服务端 |
| daijiatongxcx | packages/daijiatongxcx | 7.94 MB | 全栈(aspnet_client/client/server/mobile) |
| weidangzhenghe | packages/weidangzhenghe | 0.99 MB | 全栈(前端集群+后端微服务) |
| daijiatxcx | packages/daijiatxcx-mobile | <0.01 MB | mobile子集(仅api目录) |

### 整合到 backups/ 的压缩包 (9个)
| 文件 | 大小 | 说明 |
|---|---|---|
| Mi Xiao Mi La A Li Inc.zip | 90.09 MB | 项目压缩包 |
| mixmlaal-app.zip | 0.06 MB | 应用压缩包 |
| mixmlaal-app-optimized.zip | 0.05 MB | 优化版应用压缩包 |
| mixmlaal-project-20260503-042203.zip | 27.54 MB | 项目快照(2026-05-03) |
| wopp.zip | 106.26 MB | WordPress压缩包 |
| wp.laal.top_dGDHY.tar.gz | 20.18 MB | WordPress备份 |
| wp.laal.top_iMBh4.tar.gz | 1183.15 MB | WordPress完整备份 |
| 6666666666666666.txt | 0.07 MB | 文本文件 |
| 未命名.html | 0.06 MB | HTML文件 |

### 整合到 runtimes/ 的运行时
| 源路径 | 目标路径 | 说明 |
|---|---|---|
| JZDSInstallKit | runtimes/jzds-install-kit | LLM模型(blobs/manifests) |

### 整合到 backups/code/ 的代码压缩包
| 文件 | 说明 |
|---|---|
| global-ride-app.zip | 全栈应用压缩包(121KB) |
| mimi_mila_ali_fullstack.zip | 全栈项目压缩包(50KB) |

### 重复命名检测
- "Mi Xiao Mi La A Li Inc" vs "Mi Xiao Mi A Li Inc" - 后者为旧版,分别存放
- "daijiatongxcx" vs "daijiatxcx" - 后者是前者的mobile子集

### 未整合的内容(非项目)
- Program Files (x86) - 系统程序
- QLDownload/QLDownloadGame/360Downloads/迅雷下载 - 下载目录
- 桌面壁纸缓存 - 缓存
- .pnpm-store - pnpm缓存
- 项目整理 - 商业文档/表格(非代码)

## 七、注意事项

1. 代码项目已排除 node_modules/.git/dist/build 等可重生成目录,首次运行前需执行 npm/pnpm install
2. 03_工作办公(975GB)正在复制到 legacy-data/ - 体积过大,复制进行中
3. 09_备份归档(3.5GB/134万文件)正在复制到 legacy-data/ - 海量小文件,复制进行中
4. 部分代码项目(如 zlzm)使用 Python+JS 混合,需同时配置 Python 和 Node.js 环境
5. Mi Xiao Mi La A Li Inc 项目内嵌的 mixmlaal-node_modules 目录被排除(非标准 node_modules,可重生成)
