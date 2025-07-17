# HLSmith 部署教程

## 概述

HLSmith 是一个视频转 HLS 管理工具，支持用户注册、视频上传、HLS 转换和播放等功能。本教程将详细介绍如何在不同环境下部署该应用。

## 系统架构

- **前端**: Next.js 15 + React 19 + TypeScript
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite
- **视频处理**: FFmpeg
- **认证**: JWT
- **容器化**: Docker + Docker Compose

## 部署方式

### 1. Docker Compose 部署（推荐）

这是最简单快速的部署方式，适合生产环境使用。

#### 1.1 前置要求

- Docker 20.0+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 10GB 可用磁盘空间

#### 1.2 部署步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd HLSmith

# 2. 创建存储目录
mkdir -p storage/{uploads,hls,thumbnails,chunks,temp/chunks}

# 3. 配置环境变量（可选）
cp docker-compose.yml docker-compose.production.yml
# 编辑 docker-compose.production.yml 修改配置

# 4. 启动服务
docker-compose up -d

# 5. 查看服务状态
docker-compose ps
docker-compose logs -f
```

#### 1.3 环境变量配置

在 `docker-compose.yml` 中修改以下关键配置：

```yaml
services:
  backend:
    environment:
      # 安全配置
      - JWT_SECRET=your-strong-jwt-secret-here  # 必须修改
      
      # 功能配置
      - ALLOW_REGISTRATION=true                 # 是否允许新用户注册
      - ALLOW_FIRST_ADMIN_REGISTRATION=true    # 是否允许首个管理员注册
      
      # 性能配置
      - UPLOAD_MAX_SIZE=2147483648             # 最大上传文件大小 (2GB)
      - MAX_CONCURRENT=2                        # 最大并发转换任务数
      - FFMPEG_TIMEOUT=1800000                 # FFmpeg 超时时间 (30分钟)
      
      # 网络配置
      - FRONTEND_URL=http://your-domain.com    # 前端域名
      - BASE_URL=http://your-api-domain.com    # API 域名
```

#### 1.4 端口说明

- **3000**: 前端服务端口
- **3001**: 后端 API 服务端口

#### 1.5 数据持久化

项目使用 Docker 卷来持久化数据：

```bash
# 查看存储目录
ls -la storage/
├── chunks/          # 分片上传临时文件
├── database.sqlite  # SQLite 数据库文件
├── hls/            # HLS 转换输出文件
├── temp/           # 临时文件
├── thumbnails/     # 视频缩略图
└── uploads/        # 原始上传视频
```

### 2. 生产环境配置

#### 2.1 反向代理配置

**Nginx 配置示例:**

```nginx
# /etc/nginx/sites-available/hlsmith
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 文件上传大小限制
        client_max_body_size 2G;
    }
    
    # 静态文件服务 (缩略图)
    location /thumbnails/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 缓存配置
        add_header Cache-Control "public, max-age=86400";
        add_header Access-Control-Allow-Origin "*";
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/hlsmith /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 2.2 SSL 证书配置

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

#### 2.3 系统服务配置

创建 systemd 服务文件：

**后端服务 `/etc/systemd/system/hlsmith-backend.service`:**
```ini
[Unit]
Description=HLSmith Backend Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/HLSmith/backend
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**前端服务 `/etc/systemd/system/hlsmith-frontend.service`:**
```ini
[Unit]
Description=HLSmith Frontend Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/HLSmith/frontend
Environment=NODE_ENV=production
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用并启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable hlsmith-backend hlsmith-frontend
sudo systemctl start hlsmith-backend hlsmith-frontend
sudo systemctl status hlsmith-backend hlsmith-frontend
```

## 监控和维护

### 3. 日志管理

**Docker 部署日志查看:**
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 查看最近 100 行日志
docker-compose logs --tail=100 backend
```

**手动部署日志:**
```bash
# 后端日志
journalctl -u hlsmith-backend -f

# 前端日志
journalctl -u hlsmith-frontend -f
```

### 4. 性能监控

**系统资源监控:**
```bash
# CPU 和内存使用
htop

# 磁盘使用
df -h
du -sh storage/

# Docker 容器资源使用
docker stats
```

**应用监控指标:**
- 活跃用户数
- 视频转换队列长度
- 存储空间使用情况
- API 响应时间

### 5. 备份策略

**数据库备份:**
```bash
# 备份 SQLite 数据库
cp storage/database.sqlite backup/database-$(date +%Y%m%d-%H%M%S).sqlite

# 自动备份脚本
#!/bin/bash
BACKUP_DIR="/path/to/backup"
DATE=$(date +%Y%m%d-%H%M%S)
cp storage/database.sqlite "$BACKUP_DIR/database-$DATE.sqlite"
find "$BACKUP_DIR" -name "database-*.sqlite" -mtime +7 -delete
```

**存储文件备份:**
```bash
# 备份所有存储文件
tar -czf backup/storage-$(date +%Y%m%d-%H%M%S).tar.gz storage/

# 增量备份（推荐）
rsync -av storage/ backup/storage/
```

### 6. 故障排除

**常见问题:**

1. **视频转换失败**
   - 检查 FFmpeg 是否正确安装
   - 查看后端日志错误信息
   - 确认磁盘空间充足

2. **上传失败**
   - 检查文件大小是否超过限制
   - 确认网络连接稳定
   - 查看服务器错误日志

3. **播放问题**
   - 确认 HLS 文件生成完整
   - 检查网络连接
   - 查看浏览器控制台错误

**调试命令:**
```bash
# 检查服务状态
docker-compose ps

# 进入容器调试
docker-compose exec backend sh
docker-compose exec frontend sh

# 查看容器资源使用
docker stats hlsmith-backend hlsmith-frontend

# 重启服务
docker-compose restart backend
docker-compose restart frontend
```

## 安全配置

### 7. 必须修改的安全配置

- **JWT_SECRET**: 设置强密码
- **数据库文件权限**: 限制访问权限
- **文件上传限制**: 设置合理的文件大小和类型限制

### 8. 网络安全

- 使用 HTTPS
- 配置防火墙规则
- 定期更新系统和依赖

### 9. 数据安全

- 定期备份数据
- 设置文件访问权限
- 监控异常访问

## 总结

本教程涵盖了 HLSmith 的完整部署流程，从简单的 Docker 部署到生产环境的完整配置。根据您的需求选择合适的部署方式，并注意安全配置和监控维护。