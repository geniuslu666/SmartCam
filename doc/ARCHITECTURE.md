# SmartCam 完整部署架构

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     远程 Linux 服务器                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │   Nginx       │  │  ZLMediaKit  │  │  PostgreSQL    │   │
│  │  (反向代理)   │  │ (流媒体)     │  │  (数据库)      │   │
│  │  :80, :443    │  │  :8080       │  │  :5432         │   │
│  └───────┬───────┘  └──────────────┘  └────────────────┘   │
│          │                                                   │
│          ├─────────────────┬──────────────┬────────────────┤
│          │                 │              │                │
│    ┌─────▼─────┐    ┌──────▼──────┐    │                 │
│    │ Frontend   │    │  Backend    │    │                 │
│    │ (React)    │    │  (Go)       │    │                 │
│    │ :5173      │    │  :8081      │    │                 │
│    └────────────┘    └─────────────┘    │                 │
│                                          │                 │
│          ┌──────────────────────────────┘                 │
│          │ SystemD 服务管理                               │
│          │ - smartcam-backend.service                     │
│          │ - smartcam-frontend.service                    │
│          └──────────────────────────────────────────────┘
│
│  ┌────────────────────────────────────────────────────────┐
│  │  海康 NVR  ◄────── RTSP ────► ZLMediaKit  ◄──► 播放器 │
│  └────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

## 📋 部署流程

### 第一步：环境准备

```bash
# 1. SSH 连接到远程服务器
ssh user@your-server.com

# 2. 克隆项目
git clone <repo-url> /opt/smartcam
cd /opt/smartcam

# 3. 初始化环境
bash setup-dev.sh
```

### 第二步：配置

```bash
# 编辑环境变量
nano .env

# 关键配置：
# - PUBLIC_API_BASE_URL=http://你的服务器IP:8081
# - PUBLIC_STREAM_BASE_URL=http://你的服务器IP:8080
# - HIK_NVR_HOST=海康NVR IP
# - HIK_NVR_USERNAME=账号
# - HIK_NVR_PASSWORD=密码
# - HIK_CAMERA_COUNT=通道数
# - ZLM_ENABLED=false (先设置为 false)
```

### 第三步：验证前后端（不启用 ZLM）

```bash
# 启动所有服务
bash start-dev.sh

# 查看状态
bash status-dev.sh

# 访问前端
http://your-server.com:5173

# 测试 API
curl http://your-server.com:8081/api/health
```

### 第四步：启用 ZLMediaKit

```bash
# 1. 启动 ZLM Docker
docker-compose up -d zlm

# 2. 修改 .env
# ZLM_ENABLED=true

# 3. 重启后端
bash restart-dev.sh

# 4. 测试流媒体播放
```

### 第五步：生产部署（可选）

#### 方案 A：使用 systemd 自动启动

```bash
# 以 root 身份运行
sudo bash ops/systemd/install-service.sh

# 启动服务
sudo systemctl start smartcam-backend smartcam-frontend

# 查看状态
sudo systemctl status smartcam-backend smartcam-frontend
```

#### 方案 B：使用 Nginx 反向代理

```bash
# 以 root 身份运行
sudo bash ops/nginx/install-nginx.sh your-domain.com

# 配置 SSL（自动）
sudo certbot --nginx -d your-domain.com

# 重载 Nginx
sudo systemctl reload nginx
```

## 🔧 自动部署（GitHub Actions）

### 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

```
DEPLOY_HOST=your-server.com
DEPLOY_USER=deploy
DEPLOY_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
           ...你的 SSH 私钥...
           -----END OPENSSH PRIVATE KEY-----
DEPLOY_PATH=/opt/smartcam
```

### 触发自动部署

```bash
# 推送到 main 分支自动触发
git push origin main

# 或在 GitHub 中手动触发 Deploy workflow
```

## 📊 文件结构

```
SmartCam/
├── backend/                    # Go 后端
│   └── cmd/
│       └── server/
│           └── main.go
├── frontend/                   # React 前端
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── ops/
│   ├── zlm/
│   │   └── config.ini         # ZLMediaKit 配置
│   ├── systemd/
│   │   ├── smartcam-backend.service.example
│   │   ├── smartcam-frontend.service.example
│   │   └── install-service.sh
│   └── nginx/
│       ├── smartcam.conf.example
│       └── install-nginx.sh
├── .github/
│   └── workflows/
│       ├── deploy.yml         # 自动部署
│       ├── backend-ci.yml     # 后端 CI
│       └── frontend-ci.yml    # 前端 CI
├── .env.example               # 环境变量模板
├── docker-compose.yml         # ZLM 容器
├── setup-dev.sh              # 环境初始化
├── start-dev.sh              # 启动服务
├── restart-dev.sh            # 重启服务
├── status-dev.sh             # 查看状态
├── logs-dev.sh               # 查看日志
├── deploy.sh                 # 手动部署
├── Makefile                  # Make 命令
└── DEPLOYMENT.md             # 本文件
```

## 🔍 监控和维护

### 日志查看

```bash
# 实时日志
bash logs-dev.sh all

# 后端特定日志
bash logs-dev.sh backend

# 前端特定日志
bash logs-dev.sh frontend

# 或使用 systemd（如果已部署）
sudo journalctl -u smartcam-backend -f
sudo journalctl -u smartcam-frontend -f
```

### 性能监控

```bash
# 查看进程
ps aux | grep smartcam

# 查看端口占用
netstat -tlnp | grep -E '5173|8081|8080'

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 备份和恢复

```bash
# 备份环境变量
cp .env .env.backup-$(date +%Y%m%d)

# 备份数据库（如果使用 PostgreSQL）
docker-compose exec postgres pg_dump -U smartcam smartcam > backup-$(date +%Y%m%d).sql

# 恢复数据库
docker-compose exec postgres psql -U smartcam smartcam < backup-20260529.sql
```

## 🚨 故障排查

### 问题 1：后端无法启动

```bash
# 查看详细错误
tail -50 backend.log

# 检查端口占用
lsof -i :8081

# 检查环境变量
cat .env | grep -v "^#" | head -20

# 手动运行测试
cd backend
export $(cat ../.env | xargs)
go run ./cmd/server
```

### 问题 2：前端无法访问

```bash
# 查看前端进程
ps aux | grep "npm run dev"

# 查看前端日志
tail -50 frontend.log

# 测试前端连接
curl http://127.0.0.1:5173

# 检查前端依赖
cd frontend
npm install
```

### 问题 3：摄像头无法播放

```bash
# 验证 RTSP URL
# 从后端日志中查看生成的 URL

# 测试 RTSP 连接
ffprobe rtsp://user:pass@NVR_IP:554/Streaming/channels/102

# 检查网络连接
ping <NVR_IP>
telnet <NVR_IP> 554

# 查看 ZLMediaKit 日志
docker-compose logs -f zlm

# 验证 ZLM 配置
cat ops/zlm/config.ini | grep -E "enable_hls|enable_rtmp"
```

### 问题 4：SSL 证书错误

```bash
# 查看证书有效期
openssl x509 -in /etc/letsencrypt/live/your-domain/cert.pem -noout -dates

# 续期证书
sudo certbot renew

# 查看证书日志
tail -50 /var/log/letsencrypt/letsencrypt.log
```

## 📈 性能优化

### 后端优化

```bash
# 使用编译优化的二进制
cd backend
CGO_ENABLED=0 go build -ldflags "-s -w -X main.Version=$(git describe --tags)" -o bin/smartcam-server ./cmd/server

# 启用 Gzip 压缩（在后端代码中）
# middleware.GzipMiddleware()
```

### 前端优化

```bash
# 生产构建
cd frontend
npm run build

# 分析包大小
npm run build -- --analyze

# 缓存优化（在 Nginx 中）
# Cache-Control: public, max-age=31536000
```

### 数据库优化

```bash
# PostgreSQL 连接池
export DATABASE_MAX_CONNS=20
export DATABASE_MIN_CONNS=5

# 查询优化
# 添加适当的索引
# EXPLAIN ANALYZE SELECT ...
```

## 🔐 安全加固

### SSH 加固

```bash
# 禁用密码登录
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
# PermitRootLogin no

sudo systemctl restart ssh
```

### 防火墙配置

```bash
sudo ufw enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8080/tcp    # 流媒体（内网）
sudo ufw allow 8081/tcp    # API（内网）
```

### 应用安全

```bash
# 更新依赖
go get -u ./...
npm update

# 安全扫描
go install github.com/securego/gosec/v2/cmd/gosec@latest
gosec ./...

npm audit
```

## 📞 获取帮助

### 常用命令速查

| 命令 | 用途 |
|------|------|
| `bash status-dev.sh` | 查看服务状态 |
| `bash logs-dev.sh all` | 查看所有日志 |
| `bash restart-dev.sh` | 重启所有服务 |
| `make help` | 查看 Make 命令 |
| `curl http://127.0.0.1:8081/api/health` | 检查后端健康 |

### 获取更多帮助

- 查看完整部署指南：[DEPLOYMENT.md](DEPLOYMENT.md)
- 查看开发指南：[README.md](README.md)
- GitHub Issues：报告问题
- 技术文档：参考项目 Wiki

---

**最后更新**: 2026-05-29  
**版本**: v1.0.0
