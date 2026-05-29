# SmartCam 部署和开发工具包

> 2026-05-29 创建 | 为 SmartCam 项目添加完整的开发、测试和部署自动化

## 📦 新增文件清单

### 🚀 核心启动脚本（项目根目录）

| 脚本 | 功能 | 用途 |
|------|------|------|
| [`setup-dev.sh`](setup-dev.sh) | 环境初始化 | 首次运行，自动安装 Go、Node.js、Docker 等依赖 |
| [`start-dev.sh`](start-dev.sh) | 启动所有服务 | 启动后端、前端和可选的 ZLMediaKit，支持后台运行 |
| [`restart-dev.sh`](restart-dev.sh) | 重启服务 | 停止并重新启动所有服务 |
| [`status-dev.sh`](status-dev.sh) | 查看服务状态 | 显示后端、前端、ZLM 的运行状态 |
| [`logs-dev.sh`](logs-dev.sh) | 查看实时日志 | 支持查看后端、前端、全部日志 |
| [`deploy.sh`](deploy.sh) | 远程部署 | 通过 SSH + rsync 部署到远程服务器 |
| [`check-deployment.sh`](check-deployment.sh) | 部署检查 | 验证所有依赖、配置、服务状态 |

### 📋 配置和文档（项目根目录）

| 文件 | 内容 |
|------|------|
| [`Makefile`](Makefile) | Make 快捷命令，支持 `make start`、`make test` 等 |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | 详细的部署和开发指南 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | 架构设计、部署流程、故障排查 |

### 🔧 运维脚本和配置（ops 目录）

#### systemd 服务

```
ops/systemd/
├── smartcam-backend.service.example    # 后端 systemd 服务配置
├── smartcam-frontend.service.example   # 前端 systemd 服务配置
└── install-service.sh                  # 安装 systemd 服务脚本
```

#### Nginx 反向代理

```
ops/nginx/
├── smartcam.conf.example               # Nginx 配置模板
└── install-nginx.sh                    # 安装 Nginx 配置脚本
```

### 🤖 CI/CD 工作流（.github/workflows/）

| 文件 | 触发条件 | 功能 |
|------|---------|------|
| `deploy.yml` | 推送到 main 分支 | 自动部署到远程服务器 |
| `backend-ci.yml` | 后端文件变更 | 代码检查、单元测试、构建 |
| `frontend-ci.yml` | 前端文件变更 | 代码检查、构建验证 |

## 🎯 快速开始

### 第一次运行（远程 Linux 服务器）

```bash
# 1. 克隆项目
git clone <repo-url> /opt/smartcam
cd /opt/smartcam

# 2. 初始化环境（自动安装所有依赖）
bash setup-dev.sh

# 3. 配置环境变量
nano .env

# 4. 启动所有服务
bash start-dev.sh

# 5. 访问前端
http://<服务器IP>:5173
```

### 日常开发

```bash
# 查看状态
bash status-dev.sh

# 查看日志
bash logs-dev.sh all

# 重启服务
bash restart-dev.sh

# 或使用 Make 命令
make status
make logs
make restart
```

## 🔑 主要功能

### ✅ 自动化部署

- ✅ **SSH + rsync** - 通过 SSH 密钥自动部署到远程服务器
- ✅ **GitHub Actions** - 推送到 main 分支自动触发部署
- ✅ **systemd 服务** - 配置自动启动和监管
- ✅ **Nginx 反向代理** - HTTPS + SSL 自动配置

### ✅ 生命周期管理

- ✅ **自动启动** - 服务意外停止时自动重启
- ✅ **日志管理** - 实时日志查看和归档
- ✅ **健康检查** - 定期检查服务状态
- ✅ **优雅关闭** - 支持 SIGTERM/SIGKILL 信号处理

### ✅ 开发工具

- ✅ **Makefile** - 统一的命令接口
- ✅ **部署检查** - `check-deployment.sh` 验证所有配置
- ✅ **CI/CD** - 自动代码检查和构建
- ✅ **环境隔离** - 开发、测试、生产环境分离

## 📊 架构图

```
┌─────────────────────────────────────────────┐
│         GitHub Repository                   │
│  ┌───────────────────────────────────────┐  │
│  │  .github/workflows/                   │  │
│  │  ├─ deploy.yml       (自动部署)       │  │
│  │  ├─ backend-ci.yml   (后端检查)       │  │
│  │  └─ frontend-ci.yml  (前端检查)       │  │
│  └───────────────────────────────────────┘  │
└────────────────┬──────────────────────────┘
                 │ git push origin main
                 ▼
        ┌─────────────────────┐
        │  GitHub Actions CI  │
        │  - 运行测试         │
        │  - 代码检查         │
        │  - 构建             │
        └────────┬────────────┘
                 │ SSH + rsync
                 ▼
        ┌─────────────────────┐
        │ 远程 Linux 服务器   │
        │ ┌─────────────────┐ │
        │ │ setup-dev.sh    │ │
        │ │ start-dev.sh    │ │
        │ │ restart-dev.sh  │ │
        │ │ systemd service │ │
        │ │ Nginx reverse   │ │
        │ │ proxy           │ │
        │ └─────────────────┘ │
        │ ┌─────────────────┐ │
        │ │ Backend (Go)    │ │
        │ │ Frontend (React)│ │
        │ │ ZLMediaKit      │ │
        │ │ PostgreSQL      │ │
        │ └─────────────────┘ │
        └─────────────────────┘
```

## 📚 完整文档路径

| 场景 | 参考文档 |
|------|---------|
| 快速开始 | [DEPLOYMENT.md](DEPLOYMENT.md) - "快速开始"部分 |
| 部署架构 | [ARCHITECTURE.md](ARCHITECTURE.md) - "架构概览" |
| 部署流程 | [ARCHITECTURE.md](ARCHITECTURE.md) - "部署流程" |
| 故障排查 | [ARCHITECTURE.md](ARCHITECTURE.md) - "故障排查" |
| CI/CD 配置 | [.github/workflows/](.github/workflows/) |
| systemd 配置 | [ops/systemd/](ops/systemd/) |
| Nginx 配置 | [ops/nginx/](ops/nginx/) |

## 🚀 部署场景

### 场景 1：本地开发（推荐首先运行）

```bash
# 环境：本机或 SSH 连接的开发服务器
bash setup-dev.sh      # 初始化（一次）
bash start-dev.sh      # 启动服务
bash status-dev.sh     # 查看状态
bash logs-dev.sh all   # 查看日志
```

### 场景 2：自动部署到生产环境

```bash
# 环境：GitHub Actions
# 配置 GitHub Secrets:
#   DEPLOY_HOST, DEPLOY_USER, DEPLOY_KEY, DEPLOY_PATH
# 推送代码触发自动部署
git push origin main
```

### 场景 3：手动部署到远程服务器

```bash
# 环境：本机有 SSH 密钥访问权限
REMOTE_HOST=prod.example.com REMOTE_USER=deploy bash deploy.sh
```

### 场景 4：生产环境持久化部署

```bash
# 环境：生产 Linux 服务器
# 使用 systemd 和 Nginx 实现高可用

# 首次安装
sudo bash ops/systemd/install-service.sh
sudo bash ops/nginx/install-nginx.sh your-domain.com
sudo certbot --nginx -d your-domain.com

# 日常运维
sudo systemctl status smartcam-backend
sudo systemctl restart smartcam-frontend
sudo journalctl -u smartcam-backend -f
```

## 🔐 安全特性

- ✅ SSH 密钥认证（deploy.sh）
- ✅ GitHub Secrets 加密存储
- ✅ systemd 服务隔离（独立用户运行）
- ✅ Nginx 反向代理（隐藏内部服务）
- ✅ HTTPS/SSL 支持（Let's Encrypt）
- ✅ 防火墙规则示例

## 📈 性能优化

- 优化后端：使用编译优化的二进制
- 优化前端：生产构建和资源压缩
- 启用缓存：HTTP 缓存和数据库连接池
- 内存管理：systemd 资源限制配置

## 🛠️ 工具集成

- **Make** - 简化命令执行
- **Makefile** - 支持 `make help` 查看所有命令
- **GitHub Actions** - 自动 CI/CD
- **Docker Compose** - ZLMediaKit 容器管理
- **systemd** - 服务自动启动和监管
- **Nginx** - 反向代理和负载均衡

## 📋 检查清单

在部署前运行：

```bash
bash check-deployment.sh
```

该脚本会检查：
- ✓ 依赖软件（Go、Node.js、Docker）
- ✓ 配置文件（.env、docker-compose.yml）
- ✓ 源代码文件
- ✓ 部署脚本
- ✓ 服务运行状态
- ✓ 网络连接
- ✓ 健康检查

## 🎓 学习路径

1. **快速上手** → 阅读 [DEPLOYMENT.md](DEPLOYMENT.md)
2. **深入理解** → 查看 [ARCHITECTURE.md](ARCHITECTURE.md)
3. **实践操作** → 按照文档逐步运行脚本
4. **进阶部署** → 配置 systemd 和 Nginx
5. **自动化流程** → 设置 GitHub Actions

## 💬 常见问题

**Q: 为什么要运行 setup-dev.sh？**  
A: 自动安装所有依赖（Go、Node.js、Docker），避免手动配置。

**Q: 如何在生产环境中持久化运行？**  
A: 使用 systemd：`sudo bash ops/systemd/install-service.sh`

**Q: 如何实现 HTTPS？**  
A: 使用 Nginx：`sudo bash ops/nginx/install-nginx.sh your-domain.com`

**Q: 如何自动部署？**  
A: 配置 GitHub Secrets 并推送到 main 分支

**Q: 如何查看详细日志？**  
A: 运行 `bash logs-dev.sh all` 或 `sudo journalctl -u smartcam-backend -f`

## 🤝 贡献

如有改进建议，欢迎提交 Issue 或 Pull Request。

---

**创建日期**: 2026-05-29  
**维护者**: SmartCam Team  
**版本**: 1.0.0
