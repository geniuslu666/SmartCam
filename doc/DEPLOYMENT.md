# SmartCam 开发和部署快速参考

## 🚀 快速开始（远程 Linux 服务器）

### 首次运行（一次性）

```bash
# 1. 克隆项目
git clone <repo-url> /opt/smartcam
cd /opt/smartcam

# 2. 初始化开发环境（自动安装 Go、Node.js、Docker 等）
bash setup-dev.sh

# 3. 编辑环境变量，配置 NVR 地址和认证
nano .env

# 4. 启动所有服务
bash start-dev.sh
```

### 日常开发

```bash
# 查看服务状态
bash status-dev.sh

# 查看实时日志
bash logs-dev.sh all        # 所有日志
bash logs-dev.sh backend    # 只看后端
bash logs-dev.sh frontend   # 只看前端

# 重启服务
bash restart-dev.sh

# 停止服务
Ctrl+C  # 在 start-dev.sh 的终端中按 Ctrl+C
```

## 📋 使用 Makefile 快捷命令

如果系统已安装 `make`，可以用更简短的命令：

```bash
make help              # 查看所有可用命令
make setup             # 初始化环境
make start             # 启动服务
make restart           # 重启服务
make status            # 查看状态
make logs              # 查看日志
make clean             # 清理日志

# 后端命令
make backend-fmt       # 格式化代码
make backend-vet       # 代码检查
make backend-test      # 运行测试

# 前端命令
make frontend-lint     # 代码检查
make frontend-build    # 生产构建

# Docker 命令
make docker-up         # 启动 ZLMediaKit
make docker-down       # 停止 ZLMediaKit
make docker-logs       # 查看 ZLMediaKit 日志
```

## 🐳 启用 ZLMediaKit 流媒体服务

### 第一阶段：不启用 ZLM（验证前后端）

```bash
# 确保 .env 中设置
ZLM_ENABLED=false

# 启动服务
bash start-dev.sh

# 测试：点击播放会返回 RTSP URL，但不会真的请求 ZLM
```

### 第二阶段：启用 ZLM

```bash
# 1. 启动 ZLMediaKit Docker
docker-compose up -d zlm

# 2. 修改 .env
ZLM_ENABLED=true

# 3. 重启后端
bash restart-dev.sh

# 4. 测试 1 路子码流播放
# 5. 测试 4/9 分屏
```

## 📦 远程部署（通过 SSH 和 rsync）

### 手动部署

```bash
# 从本机部署到远程服务器（需要配置 SSH 免密登录）
REMOTE_HOST=example.com REMOTE_USER=deploy bash deploy.sh
```

### 自动部署（通过 GitHub Actions）

1. **配置 GitHub Secrets**（在 GitHub 仓库设置中）：
   ```
   DEPLOY_HOST       # 远程服务器地址
   DEPLOY_USER       # SSH 用户名
   DEPLOY_KEY        # SSH 私钥（粘贴整个私钥内容）
   DEPLOY_PATH       # 远程项目路径，如 /opt/smartcam
   ```

2. **推送到 main 分支自动触发部署**：
   ```bash
   git push origin main
   ```

3. **或手动触发部署**：
   - 在 GitHub Actions 页面，点击"Deploy"工作流
   - 点击"Run workflow"

## 🔍 验证部署

### 健康检查

```bash
# 检查后端
curl http://127.0.0.1:8081/api/health

# 前端访问
http://<服务器IP>:5173

# 流媒体地址
http://<服务器IP>:8080
```

### 查看日志

```bash
# 后端日志
tail -f backend.log

# 前端日志
tail -f frontend.log

# 系统日志
journalctl -u smartcam -f  # 如果配置了 systemd
```

## 🐛 常见问题排查

### 后端启动失败

```bash
# 1. 查看详细错误
tail -50 backend.log

# 2. 手动测试后端连接
cd backend
export $(cat ../.env | xargs)
go run ./cmd/server

# 3. 检查端口占用
lsof -i :8081
```

### 前端无法访问

```bash
# 1. 检查前端进程
ps aux | grep "npm run dev"

# 2. 查看前端日志
tail -50 frontend.log

# 3. 检查端口占用
lsof -i :5173

# 4. 测试连接
curl http://127.0.0.1:5173
```

### 摄像头播放失败

```bash
# 1. 验证 RTSP URL 格式
# 后端日志中查看生成的 URL

# 2. 用 VLC 或 ffprobe 测试
ffprobe rtsp://user:pass@NVR_IP:554/Streaming/channels/102

# 3. 检查网络连接
ping <NVR_IP>
telnet <NVR_IP> 554

# 4. 验证 ZLMediaKit 配置
docker-compose logs zlm | tail -50
```

## 📁 文件说明

| 文件 | 用途 |
|------|------|
| `.env.example` | 环境变量模板 |
| `.env` | 实际环境变量配置（不提交到 Git） |
| `setup-dev.sh` | 环境初始化脚本 |
| `start-dev.sh` | 启动所有服务 |
| `restart-dev.sh` | 重启所有服务 |
| `status-dev.sh` | 查看服务状态 |
| `logs-dev.sh` | 查看实时日志 |
| `deploy.sh` | 远程部署脚本 |
| `Makefile` | Make 快捷命令 |
| `docker-compose.yml` | ZLMediaKit 容器配置 |
| `.github/workflows/deploy.yml` | GitHub Actions 自动部署配置 |
| `.github/workflows/backend-ci.yml` | 后端 CI/CD 配置 |
| `.github/workflows/frontend-ci.yml` | 前端 CI/CD 配置 |

## 🔑 环境变量关键配置

```bash
# 服务地址（改为你的服务器 IP）
PUBLIC_API_BASE_URL=http://192.168.1.100:8081
PUBLIC_STREAM_BASE_URL=http://192.168.1.100:8080

# 海康 NVR 配置
HIK_NVR_HOST=192.168.1.50
HIK_NVR_USERNAME=admin
HIK_NVR_PASSWORD=12345
HIK_CAMERA_COUNT=16

# 流媒体
ZLM_ENABLED=false  # 初期设置为 false，验证后改为 true
ZLM_API_URL=http://127.0.0.1:8081
```

## 💾 备份和恢复

### 备份数据库和配置

```bash
# 备份 .env（不要备份到公开位置）
cp .env .env.backup

# 备份 PostgreSQL 数据（如果已切换到 PG）
docker-compose exec postgres pg_dump -U smartcam smartcam > backup.sql
```

### 恢复数据库

```bash
# 恢复 PostgreSQL
docker-compose exec postgres psql -U smartcam smartcam < backup.sql
```

## 📈 性能优化建议

### 前端优化

```bash
# 生产构建（压缩、摇树优化等）
cd frontend
npm run build

# 输出目录：frontend/dist（约 200KB）
```

### 后端优化

```bash
# 构建优化版本
cd backend
go build -ldflags "-s -w" -o bin/smartcam-server ./cmd/server

# 二进制大小会减少约 30%
```

## 🔐 安全建议

1. **不要提交 `.env`** - 已在 `.gitignore` 中
2. **定期更新依赖**：
   ```bash
   go get -u ./...
   npm update
   ```
3. **使用强密码** - NVR 账号、数据库密码等
4. **限制 SSH 访问** - 仅允许特定 IP
5. **启用防火墙**：
   ```bash
   ufw allow 22/tcp   # SSH
   ufw allow 5173/tcp # 前端
   ufw allow 8081/tcp # API
   ufw allow 8080/tcp # 流媒体
   ```

## 🆘 获取帮助

- 查看服务日志：`bash logs-dev.sh all`
- 检查环境变量：`cat .env | grep -v "^#" | grep -v "^$"`
- 远程服务器调试：`ssh user@host "cd /opt/smartcam && bash status-dev.sh"`

---

**最后更新**: 2026-05-29
