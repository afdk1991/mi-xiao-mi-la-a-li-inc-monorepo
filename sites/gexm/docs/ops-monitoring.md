# 运维监控方案

## 1. 概述

本文档描述 Gexm 电商项目的运维监控体系，包括系统监控、应用监控、日志管理、告警机制、备份策略、应急预案和性能优化建议。

### 1.1 监控体系架构

```
                    +--------------------------+
                    |      告警通知渠道         |
                    |  邮件 / 短信 / 钉钉/微信   |
                    +-------------+------------+
                                  │
                                  │ 告警
                                  ▼
                    +-------------+------------+
                    |       告警管理器          |
                    |   (Alertmanager / 自研)   |
                    +-----+-------------+------+
                          │             │
                指标数据  │             │ 日志数据
                          ▼             ▼
+-----------------+     +-+-------------+-+     +-----------------+
|   系统指标      |────►│   监控系统     │◄────|   日志系统      |
|  (Node Exporter)|     │(Prometheus+Grafana) |  (ELK / Loki)   |
+-----------------+     +-+-------------+-+     +-----------------+
                          │             │
                          ▼             ▼
                    +-----+------+ +----+-------+
                    | 应用指标    | | 业务指标    |
                    | (/metrics)  | | (订单/用户) |
                    +-------------+ +------------+
```

---

## 2. 系统监控指标

### 2.1 CPU 监控

| 指标 | 说明 | 正常范围 | 告警阈值 |
|------|------|----------|----------|
| `cpu_usage_percent` | CPU 总使用率 | < 70% | > 85% 持续 5 分钟 |
| `cpu_iowait_percent` | IO 等待占比 | < 10% | > 20% 持续 5 分钟 |
| `cpu_load_1m` | 1 分钟负载 | < 核数 * 0.7 | > 核数 * 1.5 |
| `cpu_load_5m` | 5 分钟负载 | < 核数 * 0.5 | > 核数 |
| `cpu_load_15m` | 15 分钟负载 | < 核数 * 0.3 | > 核数 * 0.8 |

### 2.2 内存监控

| 指标 | 说明 | 正常范围 | 告警阈值 |
|------|------|----------|----------|
| `memory_usage_percent` | 内存使用率 | < 70% | > 85% 持续 5 分钟 |
| `memory_available_bytes` | 可用内存 | > 20% 总内存 | < 10% 总内存 |
| `memory_swap_used_percent` | Swap 使用率 | < 30% | > 70% |
| `memory_cache_bytes` | 缓存内存 | - | 持续下降需关注 |

### 2.3 磁盘监控

| 指标 | 说明 | 正常范围 | 告警阈值 |
|------|------|----------|----------|
| `disk_usage_percent` | 磁盘使用率 | < 70% | > 85% |
| `disk_inode_usage_percent` | inode 使用率 | < 70% | > 85% |
| `disk_read_iops` | 读 IOPS | - | 突增 2 倍以上 |
| `disk_write_iops` | 写 IOPS | - | 突增 2 倍以上 |
| `disk_read_bps` | 读吞吐量 | - | 突增 2 倍以上 |
| `disk_write_bps` | 写吞吐量 | - | 突增 2 倍以上 |

### 2.4 网络监控

| 指标 | 说明 | 正常范围 | 告警阈值 |
|------|------|----------|----------|
| `network_rx_bytes` | 入站流量 | - | 超过带宽 80% |
| `network_tx_bytes` | 出站流量 | - | 超过带宽 80% |
| `network_errors` | 网络错误数 | 0 | > 0 持续 1 分钟 |
| `network_dropped` | 丢包数 | 0 | > 0 持续 1 分钟 |
| `tcp_connections` | TCP 连接数 | - | > 10000 |
| `tcp_time_wait` | TIME_WAIT 连接 | - | > 5000 |

### 2.5 使用 Node Exporter + Prometheus 监控（推荐）

安装 Node Exporter：

```bash
# 下载安装 (Linux)
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
cd node_exporter-1.7.0.linux-amd64
sudo cp node_exporter /usr/local/bin/

# 创建 systemd 服务
sudo tee /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo useradd -rs /bin/false node_exporter
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

### 2.6 轻量级系统监控脚本

如果不想部署完整的监控系统，可使用简单的脚本进行基础监控：

创建 `/opt/gexm/scripts/system-monitor.sh`：

```bash
#!/bin/bash
# 系统监控脚本 - 每分钟执行一次

THRESHOLD_CPU=85
THRESHOLD_MEM=85
THRESHOLD_DISK=85
LOG_FILE="/opt/gexm/logs/system-monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# CPU 使用率
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
cpu_usage_int=${cpu_usage%.*}
if [ $cpu_usage_int -gt $THRESHOLD_CPU ]; then
    log "WARN: CPU 使用率过高: ${cpu_usage}%"
fi

# 内存使用率
mem_usage=$(free | grep Mem | awk '{print $3/$2 * 100.0}')
mem_usage_int=${mem_usage%.*}
if [ $mem_usage_int -gt $THRESHOLD_MEM ]; then
    log "WARN: 内存使用率过高: ${mem_usage}%"
fi

# 磁盘使用率
disk_usage=$(df / | grep / | awk '{print $5}' | cut -d'%' -f1)
if [ $disk_usage -gt $THRESHOLD_DISK ]; then
    log "WARN: 磁盘使用率过高: ${disk_usage}%"
fi

log "INFO: CPU=${cpu_usage}% MEM=${mem_usage}% DISK=${disk_usage}%"
```

添加定时任务：

```bash
chmod +x /opt/gexm/scripts/system-monitor.sh
(crontab -l 2>/dev/null; echo "* * * * * /opt/gexm/scripts/system-monitor.sh") | crontab -
```

---

## 3. 应用监控

### 3.1 接口响应时间监控

| 指标 | 说明 | 正常范围 | 告警阈值 |
|------|------|----------|----------|
| `avg_response_time` | 平均响应时间 | < 200ms | > 500ms 持续 5 分钟 |
| `p95_response_time` | P95 响应时间 | < 500ms | > 1000ms 持续 5 分钟 |
| `p99_response_time` | P99 响应时间 | < 1000ms | > 2000ms 持续 5 分钟 |
| `max_response_time` | 最大响应时间 | < 5000ms | > 10000ms |

### 3.2 错误率监控

| 指标 | 说明 | 正常范围 | 告警阈值 |
|------|------|----------|----------|
| `error_rate` | 整体错误率 | < 0.1% | > 1% 持续 5 分钟 |
| `4xx_rate` | 客户端错误率 | < 1% | > 5% 持续 5 分钟 |
| `5xx_rate` | 服务端错误率 | < 0.1% | > 1% 持续 5 分钟 |

### 3.3 QPS 监控

| 指标 | 说明 | 正常范围 | 告警阈值 |
|------|------|----------|----------|
| `total_qps` | 总 QPS | - | 超过容量 80% |
| `api_qps` | 各接口 QPS | - | 突增/突降 50% 以上 |
| `success_qps` | 成功 QPS | - | - |
| `fail_qps` | 失败 QPS | - | 持续上升需关注 |

### 3.4 业务指标监控

| 指标 | 说明 | 计算方式 |
|------|------|----------|
| `daily_active_users` | 日活用户数 | 每日唯一用户数 |
| `order_count` | 订单数 | 每日创建订单数 |
| `payment_success_rate` | 支付成功率 | 支付成功数 / 创建订单数 |
| `user_registrations` | 新增用户数 | 每日新注册用户数 |

### 3.5 应用指标接口实现

在后端添加 Prometheus 指标接口 `packages/server/src/routes/metrics.js`：

```javascript
const express = require('express');
const router = express.Router();

const metrics = {
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0,
  responseTimes: [],
  activeConnections: 0,
  totalUsers: 0,
  totalOrders: 0,
};

const collectMetrics = (req, res, next) => {
  const start = Date.now();
  metrics.requestCount++;
  metrics.activeConnections++;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.responseTimes.push(duration);
    metrics.activeConnections--;
    
    if (res.statusCode >= 500) {
      metrics.errorCount++;
    }
    
    if (metrics.responseTimes.length > 10000) {
      metrics.responseTimes = metrics.responseTimes.slice(-5000);
    }
  });
  
  next();
};

router.get('/metrics', (req, res) => {
  const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedTimes.length * 0.95);
  const p99Index = Math.floor(sortedTimes.length * 0.99);
  
  const avgResponseTime = sortedTimes.length 
    ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length 
    : 0;
  
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
  
  res.json({
    uptime_seconds: uptimeSeconds,
    request_count: metrics.requestCount,
    error_count: metrics.errorCount,
    error_rate: metrics.requestCount ? (metrics.errorCount / metrics.requestCount * 100).toFixed(2) + '%' : '0%',
    active_connections: metrics.activeConnections,
    avg_response_time_ms: avgResponseTime.toFixed(2),
    p95_response_time_ms: sortedTimes[p95Index] || 0,
    p99_response_time_ms: sortedTimes[p99Index] || 0,
    max_response_time_ms: sortedTimes[sortedTimes.length - 1] || 0,
  });
});

module.exports = { router, collectMetrics };
```

### 3.6 健康检查接口

项目已内置健康检查接口，可用于监控：

```bash
curl http://localhost:3000/api/health
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "status": "running",
    "timestamp": 1704067200000,
    "version": "1.0.0"
  }
}
```

---

## 4. 日志管理

### 4.1 日志分级

| 级别 | 数值 | 说明 | 使用场景 |
|------|------|------|----------|
| `error` | 0 | 错误 | 系统错误、异常、功能故障 |
| `warn` | 1 | 警告 | 潜在问题、非预期情况 |
| `info` | 2 | 信息 | 正常运行信息、关键事件 |
| `http` | 3 | HTTP | HTTP 请求日志 |
| `verbose` | 4 | 详细 | 详细调试信息 |
| `debug` | 5 | 调试 | 调试信息（开发环境） |
| `silly` | 6 | 最详细 | 最详细的调试信息 |

### 4.2 日志格式

项目使用 Winston 日志库，JSON 格式输出：

```json
{
  "timestamp": "2024-01-01 12:00:00",
  "level": "info",
  "message": "Server is running on port 3000",
  "service": "gexm-server"
}
```

### 4.3 日志文件配置

当前配置：

| 日志文件 | 级别 | 单文件大小 | 保留文件数 |
|----------|------|------------|------------|
| `app.log` | info+ | 5 MB | 5 个 |
| `app-error.log` | error+ | - | - |

### 4.4 日志轮转配置

配置 logrotate (Linux)：

创建 `/etc/logrotate.d/gexm`：

```
/opt/gexm/packages/server/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    sharedscripts
    dateext
    dateformat -%Y%m%d
    
    postrotate
        # 重新加载 PM2 应用以重新打开日志文件
        pm2 reload gexm-server > /dev/null 2>&1 || true
    endscript
}
```

手动测试轮转：

```bash
logrotate -f /etc/logrotate.d/gexm
```

### 4.5 Nginx 日志轮转

创建 `/etc/logrotate.d/nginx-gexm`：

```
/var/log/nginx/gexm-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 nginx adm
    sharedscripts
    dateext
    
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 $(cat /var/run/nginx.pid)
        fi
    endscript
}
```

### 4.6 日志分析常用命令

```bash
# 查看实时日志
tail -f /opt/gexm/packages/server/logs/app.log

# 查看错误日志
tail -f /opt/gexm/packages/server/logs/app-error.log

# 统计错误数量
grep -c '"level":"error"' /opt/gexm/packages/server/logs/app.log

# 查看特定时间范围的日志
grep '"timestamp":"2024-01-01 1[2-5]' /opt/gexm/packages/server/logs/app.log

# 统计接口调用次数
grep 'GET /api/' /opt/gexm/packages/server/logs/app.log | wc -l

# 查找慢请求（响应时间 > 1s）
grep 'responseTime' /opt/gexm/packages/server/logs/app.log | jq 'select(.responseTime > 1000)'

# 分析 Nginx 访问日志 - 统计 IP
awk '{print $1}' /var/log/nginx/gexm-access.log | sort | uniq -c | sort -rn | head -10

# 分析 Nginx 访问日志 - 统计状态码
awk '{print $9}' /var/log/nginx/gexm-access.log | sort | uniq -c | sort -rn

# 分析 Nginx 访问日志 - 统计 URL
awk '{print $7}' /var/log/nginx/gexm-access.log | sort | uniq -c | sort -rn | head -20
```

### 4.7 集中式日志管理（可选）

**方案一：ELK Stack (Elasticsearch + Logstash + Kibana)**

适用于中大型项目，支持全文检索、可视化分析。

**方案二：Loki + Grafana**

轻量级日志方案，与 Prometheus + Grafana 生态集成更好。

---

## 5. 告警机制

### 5.1 告警级别

| 级别 | 名称 | 颜色 | 响应时间 | 通知方式 |
|------|------|------|----------|----------|
| P0 | 紧急 | 红色 | 立即（15分钟内） | 电话 + 短信 + 即时通讯 |
| P1 | 严重 | 橙色 | 1 小时内 | 短信 + 即时通讯 |
| P2 | 警告 | 黄色 | 4 小时内 | 即时通讯 + 邮件 |
| P3 | 提示 | 蓝色 | 工作日内 | 邮件 |

### 5.2 告警规则

#### P0 - 紧急告警

| 告警项 | 触发条件 | 持续时间 |
|--------|----------|----------|
| 服务不可用 | 健康检查失败 | 1 分钟 |
| 5xx 错误率 | > 5% | 5 分钟 |
| CPU 使用率 | > 95% | 10 分钟 |
| 内存使用率 | > 95% | 10 分钟 |
| 磁盘空间不足 | > 95% | 立即 |

#### P1 - 严重告警

| 告警项 | 触发条件 | 持续时间 |
|--------|----------|----------|
| 5xx 错误率 | > 1% | 5 分钟 |
| 平均响应时间 | > 1000ms | 5 分钟 |
| CPU 使用率 | > 85% | 10 分钟 |
| 内存使用率 | > 85% | 10 分钟 |
| 磁盘空间不足 | > 85% | 立即 |
| 数据库连接失败 | 连续 3 次 | - |

#### P2 - 警告告警

| 告警项 | 触发条件 | 持续时间 |
|--------|----------|----------|
| 4xx 错误率 | > 5% | 10 分钟 |
| P95 响应时间 | > 500ms | 10 分钟 |
| CPU 使用率 | > 70% | 30 分钟 |
| 内存使用率 | > 70% | 30 分钟 |
| 磁盘空间 | > 70% | 立即 |
| QPS 突降 | 下降 > 50% | 5 分钟 |

#### P3 - 提示告警

| 告警项 | 触发条件 |
|--------|----------|
| 磁盘空间 | > 60% |
| 证书过期 | 剩余 < 30 天 |
| 备份失败 | 备份任务失败 |
| 定时任务失败 | 定时任务执行失败 |

### 5.3 告警通知方式

#### 5.3.1 邮件告警

使用 Node.js 发送告警邮件的示例脚本：

```javascript
const nodemailer = require('nodemailer');

async function sendAlert(level, title, content) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: '"Gexm Monitor" <monitor@yourdomain.com>',
    to: 'oncall@yourdomain.com',
    subject: `[${level}] ${title}`,
    text: content,
  });
}
```

#### 5.3.2 钉钉/企业微信/飞书告警

通过 Webhook 发送告警消息到群聊。

钉钉示例：

```bash
curl 'https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "msgtype": "text",
    "text": {
      "content": "[P1] 生产环境 CPU 使用率过高: 89.5%\n时间: 2024-01-01 12:00:00\n服务器: gexm-prod-01"
    }
  }'
```

### 5.4 告警抑制与收敛

1. **告警抑制**: 相同告警在一定时间内只发送一次
2. **告警聚合**: 将多个相关告警聚合成一条
3. **告警升级**: P2 告警持续未处理自动升级为 P1
4. **静默期**: 维护期间可设置告警静默

---

## 6. 备份策略

### 6.1 备份内容

| 备份内容 | 备份方式 | 备份频率 | 保留时间 |
|----------|----------|----------|----------|
| SQLite 数据库 | 文件备份 | 每小时 | 7 天 |
| SQLite 数据库 | 文件备份 | 每日 | 30 天 |
| SQLite 数据库 | 文件备份 | 每周 | 3 个月 |
| 上传文件 | 增量备份 | 每日 | 30 天 |
| 日志文件 | 自动轮转 | 每日 | 30 天 |
| 配置文件 | Git 管理 | 实时 | 永久 |
| 代码 | Git 仓库 | 实时 | 永久 |

### 6.2 数据库备份脚本

创建 `/opt/gexm/scripts/backup-db.sh`：

```bash
#!/bin/bash
# SQLite 数据库备份脚本

DB_FILE="/opt/gexm/packages/server/data/gexm.db"
BACKUP_DIR="/opt/gexm/backups/db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y%m%d)
HOUR=$(date +%H)

mkdir -p $BACKUP_DIR/hourly
mkdir -p $BACKUP_DIR/daily
mkdir -p $BACKUP_DIR/weekly

# 每小时备份
if [ -f $DB_FILE ]; then
    sqlite3 $DB_FILE ".backup $BACKUP_DIR/hourly/gexm-$TIMESTAMP.db"
    gzip $BACKUP_DIR/hourly/gexm-$TIMESTAMP.db
    
    # 保留 7 天的小时备份
    find $BACKUP_DIR/hourly -name "*.db.gz" -mtime +7 -delete
fi

# 每日备份（凌晨 2 点）
if [ "$HOUR" = "02" ]; then
    cp $BACKUP_DIR/hourly/gexm-${DATE}_0200*.db.gz $BACKUP_DIR/daily/
    
    # 保留 30 天的日备份
    find $BACKUP_DIR/daily -name "*.db.gz" -mtime +30 -delete
fi

# 每周备份（周日）
if [ "$(date +%u)" = "7" ] && [ "$HOUR" = "03" ]; then
    cp $BACKUP_DIR/daily/gexm-${DATE}*.db.gz $BACKUP_DIR/weekly/
    
    # 保留 12 周的周备份
    find $BACKUP_DIR/weekly -name "*.db.gz" -mtime +84 -delete
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 数据库备份完成" >> /opt/gexm/logs/backup.log
```

### 6.3 文件备份脚本

创建 `/opt/gexm/scripts/backup-files.sh`：

```bash
#!/bin/bash
# 上传文件备份脚本

UPLOAD_DIR="/opt/gexm/packages/server/uploads"
BACKUP_DIR="/opt/gexm/backups/files"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 使用 rsync 增量备份
rsync -av --delete \
  $UPLOAD_DIR/ \
  $BACKUP_DIR/latest/

# 创建快照
cp -al $BACKUP_DIR/latest/ $BACKUP_DIR/$TIMESTAMP/

# 保留 30 天
find $BACKUP_DIR -maxdepth 1 -type d -name "20*" -mtime +30 -exec rm -rf {} \;

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 文件备份完成" >> /opt/gexm/logs/backup.log
```

### 6.4 定时任务配置

```bash
# 编辑 crontab
crontab -e
```

添加以下内容：

```bash
# 每小时整 - 数据库备份
0 * * * * /opt/gexm/scripts/backup-db.sh

# 每天凌晨 3 点 - 文件备份
0 3 * * * /opt/gexm/scripts/backup-files.sh

# 每天凌晨 4 点 - 日志轮转（由 logrotate 自动处理）
# logrotate 通过 /etc/cron.daily/logrotate 执行

# 每周日凌晨 5 点 - 备份完整性校验
0 5 * * 0 /opt/gexm/scripts/verify-backup.sh
```

### 6.5 备份校验脚本

创建 `/opt/gexm/scripts/verify-backup.sh`：

```bash
#!/bin/bash
# 备份完整性校验

BACKUP_DIR="/opt/gexm/backups"
LOG_FILE="/opt/gexm/logs/backup-verify.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

log "开始备份校验..."

# 检查最新的数据库备份
LATEST_DB=$(ls -t $BACKUP_DIR/db/hourly/*.db.gz | head -1)
if [ -f "$LATEST_DB" ]; then
    # 解压并验证
    TMP_FILE=$(mktemp)
    gunzip -c "$LATEST_DB" > "$TMP_FILE"
    
    # 使用 sqlite3 检查完整性
    if sqlite3 "$TMP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
        log "数据库备份校验通过: $LATEST_DB"
    else
        log "ERROR: 数据库备份损坏: $LATEST_DB"
    fi
    
    rm -f "$TMP_FILE"
else
    log "ERROR: 未找到数据库备份文件"
fi

# 检查备份大小
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
log "备份总大小: $TOTAL_SIZE"

log "备份校验完成"
```

### 6.6 异地备份（推荐）

使用 rclone 同步到云存储：

```bash
# 安装 rclone
curl https://rclone.org/install.sh | sudo bash

# 配置远程存储（以阿里云 OSS 为例）
rclone config

# 同步备份到云端
rclone sync /opt/gexm/backups/ aliyun:gexm-backups/
```

---

## 7. 应急预案

### 7.1 服务宕机处理

**现象**: 健康检查失败，网站无法访问

**处理流程**:

1. **确认故障范围** (1 分钟内)
   ```bash
   # 检查服务状态
   pm2 status
   systemctl status nginx
   
   # 检查端口监听
   netstat -tlnp | grep -E '3000|80|443'
   ```

2. **尝试重启服务** (2 分钟内)
   ```bash
   # 重启后端
   pm2 restart gexm-server
   
   # 重启 Nginx
   systemctl restart nginx
   ```

3. **查看错误日志** (同时进行)
   ```bash
   # 后端日志
   pm2 logs gexm-server --err --lines 100
   
   # Nginx 错误日志
   tail -100 /var/log/nginx/gexm-error.log
   
   # 系统日志
   journalctl -u gexm.service -n 100
   ```

4. **常见原因排查**
   - 端口被占用：`lsof -i :3000`
   - 内存不足：`free -h`, `dmesg | grep -i oom`
   - 磁盘满：`df -h`
   - 数据库损坏：检查 SQLite 文件

5. **回滚到上一版本** (如重启无效)
   ```bash
   # 使用备份恢复
   cp /opt/gexm/backups/db/daily/latest.db.gz /tmp/
   gunzip /tmp/latest.db.gz
   pm2 stop gexm-server
   cp /tmp/latest.db /opt/gexm/packages/server/data/gexm.db
   pm2 start gexm-server
   ```

6. **升级告警**: 如 15 分钟内无法恢复，升级为 P0 告警

### 7.2 数据库性能问题

**现象**: 响应变慢，CPU 升高，数据库锁等待

**处理流程**:

1. **查看当前连接和慢查询**
   ```bash
   # 查看数据库文件
   ls -lh /opt/gexm/packages/server/data/gexm.db
   
   # 查看正在执行的操作
   sqlite3 /opt/gexm/packages/server/data/gexm.db ".timeout 1000" "SELECT * FROM sqlite_master WHERE type='table';"
   ```

2. **分析慢查询**
   - 开启慢查询日志
   - 分析索引使用情况
   - 优化 SQL 语句

3. **临时解决方案**
   - 增加缓存
   - 限流
   - 读写分离（如需）

### 7.3 磁盘空间耗尽

**现象**: 服务异常，写入失败，日志报错

**处理流程**:

1. **查找大文件**
   ```bash
   # 查看磁盘使用
   df -h
   
   # 查找大目录
   du -sh /* | sort -rh | head -10
   du -sh /opt/gexm/* | sort -rh | head -10
   
   # 查找大文件
   find / -type f -size +100M 2>/dev/null | head -20
   ```

2. **紧急清理**
   - 清理旧日志：`find /opt/gexm/logs -name "*.log*" -mtime +7 -delete`
   - 清理旧备份（保留必要的）
   - 清理临时文件

3. **扩容**
   - 云服务器扩容磁盘
   - 迁移数据到更大的磁盘

### 7.4 安全事件处理

**现象**: 异常访问、数据泄露、恶意攻击

**处理流程**:

1. **紧急响应**
   - 封禁可疑 IP
   - 暂停可疑账号
   - 保留现场（日志、快照）

2. **攻击类型处理**

   **DDoS 攻击**:
   - 启用 CDN 防护
   - 配置 Nginx 限流
   - 联系云服务商

   **SQL 注入**:
   - 检查并修复漏洞
   - 验证数据完整性
   - 加强输入验证

   **账号被盗**:
   - 冻结账号
   - 强制重置密码
   - 审查操作日志

3. **事后分析**
   - 时间线复盘
   - 漏洞修复
   - 安全加固
   - 报告输出

### 7.5 联系人清单

| 角色 | 姓名 | 电话 | 邮箱 | 备用联系方式 |
|------|------|------|------|--------------|
| 技术负责人 | - | - | - | - |
| 后端开发 | - | - | - | - |
| 前端开发 | - | - | - | - |
| 运维工程师 | - | - | - | - |
| 产品经理 | - | - | - | - |

### 7.6 故障处理模板

```
【故障报告】

故障时间: YYYY-MM-DD HH:MM:SS - YYYY-MM-DD HH:MM:SS
持续时间: XX 分钟
故障级别: P0/P1/P2/P3
影响范围: 所有用户/部分用户/特定功能

故障现象:
- 现象描述 1
- 现象描述 2

处理过程:
1. HH:MM 发现故障，开始排查
2. HH:MM 定位原因是 XXX
3. HH:MM 采取 XXX 措施
4. HH:MM 服务恢复正常

根本原因:
- 技术原因：XXX
- 流程原因：XXX

改进措施:
- 短期措施（1 周内）：XXX
- 中长期措施（1 个月内）：XXX

责任人: XXX
```

---

## 8. 性能优化建议

### 8.1 前端性能优化

#### 8.1.1 静态资源优化

1. **启用 Gzip/Brotli 压缩**
   - Nginx 已配置 Gzip
   - 可考虑启用 Brotli

2. **静态资源 CDN 加速**
   - 将静态资源上传到 CDN
   - 域名使用 CDN 域名

3. **图片优化**
   - 使用 WebP 格式
   - 图片懒加载（已实现）
   - 响应式图片

4. **缓存策略**
   - 已配置静态资源 30 天缓存
   - HTML 不缓存

#### 8.1.2 代码层面优化

1. **代码分割**
   - 路由懒加载
   - 按需引入组件

2. **减少首屏资源体积**
   - 优化第三方依赖
   - Tree Shaking

### 8.2 后端性能优化

#### 8.2.1 数据库优化

1. **索引优化**
   ```sql
   -- 检查索引使用情况
   EXPLAIN QUERY PLAN SELECT * FROM users WHERE username = 'test';
   
   -- 常用索引建议
   -- users: username, email, phone
   -- products: category_id, status, price
   -- orders: user_id, status, created_at
   -- order_items: order_id, product_id
   ```

2. **查询优化**
   - 避免 SELECT *
   - 使用 LIMIT 分页
   - 合理使用 JOIN

3. **SQLite 优化配置**
   ```sql
   PRAGMA journal_mode = WAL;  -- 已启用，提升并发写入
   PRAGMA synchronous = NORMAL;
   PRAGMA cache_size = -20000;  -- 20MB 缓存
   PRAGMA temp_store = MEMORY;
   ```

4. **数据库分库分表（未来扩展）**
   - 用户量大时考虑
   - 订单表可按时间分表

#### 8.2.2 接口优化

1. **添加缓存**
   - 使用 Node.js 内存缓存
   - 或接入 Redis 缓存

2. **接口合并**
   - 减少前端请求次数
   - 合并相关接口数据

3. **分页优化**
   - 禁止深分页
   - 使用游标分页

4. **异步处理**
   - 非核心流程异步化
   - 使用消息队列

#### 8.2.3 连接池与并发

1. **Node.js 集群模式**
   ```javascript
   // PM2 cluster 模式
   instances: 'max',
   exec_mode: 'cluster',
   ```

2. **HTTP Keep-Alive**
   - Nginx 启用 keepalive
   - 减少 TCP 握手开销

### 8.3 Nginx 性能优化

1. **worker 进程数**
   ```nginx
   worker_processes auto;
   worker_cpu_affinity auto;
   ```

2. **连接数优化**
   ```nginx
   events {
       worker_connections 65535;
       use epoll;
       multi_accept on;
   }
   ```

3. **静态文件缓存优化**
   ```nginx
   open_file_cache max=10000 inactive=60s;
   open_file_cache_valid 60s;
   open_file_cache_min_uses 2;
   ```

4. **TCP 参数优化**
   ```nginx
   http {
       tcp_nopush on;
       tcp_nodelay on;
       keepalive_timeout 65;
   }
   ```

### 8.4 系统层面优化

1. **Linux 内核参数优化**

   创建 `/etc/sysctl.d/99-gexm.conf`：

   ```conf
   # TCP 优化
   net.core.somaxconn = 65535
   net.ipv4.tcp_max_syn_backlog = 65535
   net.ipv4.tcp_tw_reuse = 1
   net.ipv4.tcp_fin_timeout = 30
   net.ipv4.tcp_keepalive_time = 120
   net.ipv4.tcp_keepalive_intvl = 30
   net.ipv4.tcp_keepalive_probes = 3
   
   # 文件描述符
   fs.file-max = 1000000
   fs.inotify.max_user_instances = 8192
   
   # 虚拟内存
   vm.swappiness = 10
   vm.dirty_ratio = 15
   vm.dirty_background_ratio = 5
   ```

   生效：
   ```bash
   sysctl -p /etc/sysctl.d/99-gexm.conf
   ```

2. **文件描述符限制**

   创建 `/etc/security/limits.d/gexm.conf`：

   ```conf
   * soft nofile 65535
   * hard nofile 65535
   root soft nofile 65535
   root hard nofile 65535
   ```

3. **I/O 调度器**
   - SSD 使用 `noop` 或 `deadline`
   - 查看：`cat /sys/block/sda/queue/scheduler`

### 8.5 性能测试建议

1. **压力测试工具**
   - **ab**: Apache Bench，简单快速
   - **wrk**: 高性能 HTTP 压测工具
   - **k6**: 现代化压测工具，支持 JavaScript 脚本

2. **常用压测命令**
   ```bash
   # 使用 ab 压测
   ab -n 10000 -c 100 http://localhost:3000/api/health
   
   # 使用 wrk 压测
   wrk -t8 -c200 -d30s http://localhost:3000/api/products
   ```

3. **性能指标基线**
   | 指标 | 目标值 |
   |------|--------|
   | 首页加载时间 | < 2s |
   | 接口平均响应时间 | < 200ms |
   | 接口 P95 响应时间 | < 500ms |
   | 系统支持 QPS | > 1000 |
   | 错误率 | < 0.1% |

---

## 9. 运维检查清单

### 9.1 每日检查

- [ ] 服务运行状态
- [ ] 错误日志检查
- [ ] 磁盘空间检查
- [ ] 备份执行检查

### 9.2 每周检查

- [ ] 系统资源使用率趋势
- [ ] 慢查询分析
- [ ] 错误率趋势
- [ ] 备份完整性校验

### 9.3 每月检查

- [ ] 安全补丁更新
- [ ] 性能趋势分析
- [ ] 容量规划评估
- [ ] 故障演练
