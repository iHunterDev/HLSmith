# HLSmith Deployment Guide

## Overview

HLSmith is a video to HLS management tool that supports user registration, video upload, HLS conversion, and playback. This guide will detail how to deploy the application in different environments.

## System Architecture

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite
- **Video Processing**: FFmpeg
- **Authentication**: JWT
- **Containerization**: Docker + Docker Compose

## Deployment Methods

### 1. Docker Compose Deployment (Recommended)

This is the simplest and fastest deployment method, suitable for production environments.

#### 1.1 Prerequisites

- Docker 20.0+
- Docker Compose 2.0+
- At least 2GB available memory
- At least 10GB available disk space

#### 1.2 Deployment Steps

```bash
# 1. Clone the project
git clone <repository-url>
cd HLSmith

# 2. Create storage directories
mkdir -p storage/{uploads,hls,thumbnails,chunks,temp/chunks}

# 3. Configure environment variables (optional)
cp docker-compose.yml docker-compose.production.yml
# Edit docker-compose.production.yml to modify configuration

# 4. Start services
docker-compose up -d

# 5. Check service status
docker-compose ps
docker-compose logs -f
```

#### 1.3 Environment Variable Configuration

Modify the following key configurations in `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      # Security configuration
      - JWT_SECRET=your-strong-jwt-secret-here  # Must be changed
      
      # Feature configuration
      - ALLOW_REGISTRATION=true                 # Allow new user registration
      - ALLOW_FIRST_ADMIN_REGISTRATION=true    # Allow first admin registration
      
      # Performance configuration
      - UPLOAD_MAX_SIZE=2147483648             # Max upload file size (2GB)
      - MAX_CONCURRENT=2                        # Max concurrent conversion tasks
      - FFMPEG_TIMEOUT=1800000                 # FFmpeg timeout (30 minutes)
      
      # Network configuration
      - FRONTEND_URL=http://your-domain.com    # Frontend domain
      - CORS_ORIGIN=http://your-domain.com     # CORS allowed origin
      - BASE_URL=http://your-api-domain.com    # API domain
```

#### 1.4 Port Configuration

- **3000**: Frontend service port
- **3001**: Backend API service port

#### 1.5 Data Persistence

The project uses Docker volumes for data persistence:

```bash
# Check storage directories
ls -la storage/
├── chunks/          # Chunked upload temporary files
├── database.sqlite  # SQLite database file
├── hls/            # HLS conversion output files
├── temp/           # Temporary files
├── thumbnails/     # Video thumbnails
└── uploads/        # Original uploaded videos
```

### 2. Production Environment Configuration

#### 2.1 Reverse Proxy Configuration

**Nginx Configuration Example:**

```nginx
# /etc/nginx/sites-available/hlsmith
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend
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
        
        # File upload size limit
        client_max_body_size 2G;
    }
    
    # Static file serving (thumbnails)
    location /thumbnails/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache configuration
        add_header Cache-Control "public, max-age=86400";
        add_header Access-Control-Allow-Origin "*";
    }
}
```

Enable configuration:
```bash
sudo ln -s /etc/nginx/sites-available/hlsmith /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 2.2 SSL Certificate Configuration

Using Let's Encrypt free certificates:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add the following line
0 12 * * * /usr/bin/certbot renew --quiet
```

#### 2.3 System Service Configuration

Create systemd service files:

**Backend Service `/etc/systemd/system/hlsmith-backend.service`:**
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

**Frontend Service `/etc/systemd/system/hlsmith-frontend.service`:**
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

Enable and start services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable hlsmith-backend hlsmith-frontend
sudo systemctl start hlsmith-backend hlsmith-frontend
sudo systemctl status hlsmith-backend hlsmith-frontend
```

## Monitoring and Maintenance

### 3. Log Management

**Docker Deployment Log Viewing:**
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# View recent 100 lines of logs
docker-compose logs --tail=100 backend
```

**Manual Deployment Logs:**
```bash
# Backend logs
journalctl -u hlsmith-backend -f

# Frontend logs
journalctl -u hlsmith-frontend -f
```

### 4. Performance Monitoring

**System Resource Monitoring:**
```bash
# CPU and memory usage
htop

# Disk usage
df -h
du -sh storage/

# Docker container resource usage
docker stats
```

**Application Monitoring Metrics:**
- Active user count
- Video conversion queue length
- Storage space usage
- API response time

### 5. Backup Strategy

**Database Backup:**
```bash
# Backup SQLite database
cp storage/database.sqlite backup/database-$(date +%Y%m%d-%H%M%S).sqlite

# Automated backup script
#!/bin/bash
BACKUP_DIR="/path/to/backup"
DATE=$(date +%Y%m%d-%H%M%S)
cp storage/database.sqlite "$BACKUP_DIR/database-$DATE.sqlite"
find "$BACKUP_DIR" -name "database-*.sqlite" -mtime +7 -delete
```

**Storage File Backup:**
```bash
# Backup all storage files
tar -czf backup/storage-$(date +%Y%m%d-%H%M%S).tar.gz storage/

# Incremental backup (recommended)
rsync -av storage/ backup/storage/
```

### 6. Troubleshooting

**Common Issues:**

1. **Video conversion failure**
   - Check if FFmpeg is properly installed
   - Review backend log error messages
   - Ensure sufficient disk space

2. **Upload failure**
   - Check if file size exceeds limits
   - Ensure stable network connection
   - Review server error logs

3. **Playback issues**
   - Ensure HLS files are generated completely
   - Check network connection
   - Review browser console errors

**Debug Commands:**
```bash
# Check service status
docker-compose ps

# Enter container for debugging
docker-compose exec backend sh
docker-compose exec frontend sh

# View container resource usage
docker stats hlsmith-backend hlsmith-frontend

# Restart services
docker-compose restart backend
docker-compose restart frontend
```

## Security Configuration

### 7. Required Security Configuration Changes

- **JWT_SECRET**: Set a strong password
- **Database file permissions**: Restrict access permissions
- **File upload restrictions**: Set reasonable file size and type limits

### 8. Network Security

- Use HTTPS
- Configure firewall rules
- Regularly update system and dependencies

### 9. Data Security

- Regular data backups
- Set file access permissions
- Monitor abnormal access

## Summary

This guide covers the complete deployment process for HLSmith, from simple Docker deployment to full production environment configuration. Choose the appropriate deployment method based on your needs, and pay attention to security configuration and monitoring maintenance.