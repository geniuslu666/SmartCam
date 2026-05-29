# SmartCam MVP 第一版开发指南

## 📋 项目范围回顾

### 核心目标
为 40+ 物业、320-800 路海康 NVR 摄像头创建**安全、低成本、可扩展**的集中监控系统。

### 第一版 MVP 边界
✅ **必须做**：物业/NVR/摄像头台账、RTSP 子码流预览、1/4/9/16 分屏、按需拉流、无人观看自动断流、权限、审计、健康检查

❌ **暂不做**：中心录像、AI、云台控制、超大屏可视化

---

## 🛠️ 开发环境配置

### 前置要求
- 远程 Linux 服务器（Ubuntu 20.04+）
- Root 权限（用于安装系统依赖）
- Git 访问

### 一键初始化（推荐）

**第 1 步：初始化系统环境**（仅需一次）
```bash
# 以 root 身份在远程服务器运行
sudo bash scripts/setup-dev-server.sh
```

**输出内容**：
- Go 1.22+
- Node.js 20+
- Docker 和 Docker Compose
- PostgreSQL 15
- Redis
- 所有基础依赖

**第 2 步：启动开发容器**
```bash
docker-compose -f scripts/docker-compose.dev.yml up -d
```

**输出内容**：
- PostgreSQL 容器 (5432)
- Redis 容器 (6379)
- ZLMediaKit 容器 (8080, 554, 1935)

**第 3 步：初始化项目结构**
```bash
bash scripts/init-project.sh /opt/smartcam
```

**输出内容**：
- `backend/` - Go 项目完整目录
- `frontend/` - React 项目完整目录
- 所有必要的配置文件和模板

**第 4 步：验证环境**
```bash
bash scripts/check-dev-env.sh
```

**输出内容**：
- 依赖检查 ✓
- 服务状态 ✓
- 配置文件 ✓
- 数据库连接 ✓

---

## 📂 项目目录结构

```
SmartCam/
├── backend/                    # Go 后端服务
│   ├── cmd/
│   │   └── server/
│   │       └── main.go        # 服务入口
│   ├── internal/
│   │   ├── models/            # 数据模型
│   │   ├── repository/        # 数据访问层
│   │   ├── service/           # 业务逻辑层
│   │   ├── handler/           # HTTP 处理层
│   │   └── middleware/        # 中间件
│   ├── pkg/
│   │   ├── config/            # 配置管理
│   │   ├── logger/            # 日志
│   │   ├── errors/            # 错误处理
│   │   └── utils/             # 工具函数
│   ├── migrations/            # 数据库迁移
│   ├── go.mod
│   ├── go.sum
│   └── .env.example
│
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/        # React 组件
│   │   ├── pages/             # 页面
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── services/          # API 调用
│   │   ├── types/             # TypeScript 类型
│   │   ├── utils/             # 工具函数
│   │   ├── styles/            # 全局样式
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
│
├── ops/
│   ├── zlm/
│   │   ├── config.ini         # 生产配置
│   │   └── config.ini.dev     # 开发配置
│   ├── nginx/
│   ├── systemd/
│   └── k8s/                   # 未来 Kubernetes 部署
│
├── scripts/
│   ├── setup-dev-server.sh    # 系统环境初始化
│   ├── init-project.sh        # 项目结构初始化
│   ├── check-dev-env.sh       # 开发环境检查
│   ├── docker-compose.dev.yml # 开发容器编排
│   └── smartcam-db-init.sql   # 数据库初始化
│
└── docs/                      # 文档
    ├── API.md                 # API 文档
    ├── DATABASE.md            # 数据库设计
    └── ARCHITECTURE.md        # 架构设计
```

---

## 🚀 开始开发

### 后端开发（Go）

**第 1 步：进入后端目录**
```bash
cd backend
```

**第 2 步：安装依赖**
```bash
go mod download
```

**第 3 步：配置环境变量**
```bash
cp .env.example .env
# 编辑 .env，确保数据库和 Redis 配置正确
```

**第 4 步：运行服务器**
```bash
go run ./cmd/server
```

**输出示例**：
```
{"level":"info","msg":"Starting SmartCam Server","version":"1.0.0","timestamp":"..."}
{"level":"info","msg":"Server listening","addr":":8081","timestamp":"..."}
```

**访问 API**：
```bash
curl http://127.0.0.1:8081/api/health
```

### 前端开发（React）

**第 1 步：进入前端目录**
```bash
cd frontend
```

**第 2 步：安装依赖**
```bash
npm install
```

**第 3 步：启动开发服务器**
```bash
npm run dev
```

**输出示例**：
```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://127.0.0.1:5173/
  ➜  press h to show help
```

**访问前端**：
浏览器打开 http://127.0.0.1:5173

---

## 🗄️ 数据库设计

### 核心表结构

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| properties | 物业信息 | id, name, status, max_concurrent_streams |
| nvrs | NVR 设备 | id, property_id, brand, ip_address, channel_count |
| channels | 摄像头/通道 | id, nvr_id, channel_number, rtsp_url_template |
| play_sessions | 播放会话 | id, user_id, channel_id, token, stream_type |
| users | 用户信息 | id, username, role, password_hash |
| user_property_permissions | 权限 | user_id, property_id, permission_level |
| audit_logs | 审计日志 | id, user_id, action, channel_id, created_at |
| zlm_streams | ZLM 流代理 | id, channel_id, stream_id, reader_count |
| health_checks | 健康检查 | id, nvr_id, check_type, result |
| alerts | 运维告警 | id, property_id, alert_type, severity |

### 初始化数据库

```bash
# 使用 PostgreSQL 初始化
sudo -u postgres psql -d smartcam < scripts/smartcam-db-init.sql

# 验证
psql -h 127.0.0.1 -U smartcam -d smartcam -c "SELECT COUNT(*) FROM properties;"
```

---

## 🔌 API 设计

### 基础响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { /* ... */ }
}
```

### 核心端点（第一版）

#### 物业管理
```
GET    /api/properties              # 列表
GET    /api/properties/:id          # 详情
POST   /api/properties              # 创建
PUT    /api/properties/:id          # 更新
DELETE /api/properties/:id          # 删除
```

#### 设备和通道
```
GET    /api/nvrs                    # NVR 列表
GET    /api/channels                # 通道列表
POST   /api/channels/:id/health     # 健康检查
```

#### 播放会话
```
POST   /api/sessions                # 创建播放会话（拉流）
GET    /api/sessions/:id            # 获取会话
DELETE /api/sessions/:id            # 结束会话
```

#### 权限和审计
```
GET    /api/users                   # 用户列表
POST   /api/users                   # 创建用户
GET    /api/audit/logs              # 审计日志
```

#### 健康检查
```
GET    /api/health                  # 服务健康检查
GET    /api/system/status           # 系统状态
```

---

## 🎨 前端页面规划

### 第一版页面列表

| 页面 | 功能 | 优先级 |
|------|------|--------|
| 登录 | 用户认证 | P0 |
| 物业列表 | 概览、在线状态、异常数 | P0 |
| 物业详情 | 通道分组、预览 | P0 |
| 实时预览 | 1/4/9/16 分屏 | P0 |
| 配置管理 | 通道名、RTSP 模板 | P0 |
| 运维诊断 | RTSP 探测、拉流状态 | P0 |
| 审计日志 | 播放记录、导出 | P1 |
| 用户管理 | 权限授权 | P1 |

### 前端架构

```
src/
├── components/
│   ├── Common/              # 通用组件
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── VideoPlayer/         # 视频播放
│   │   ├── Player.tsx       # 单路播放器
│   │   └── MultiGrid.tsx    # 多路播放
│   └── ...
├── pages/
│   ├── Login.tsx
│   ├── PropertyList.tsx
│   ├── PropertyDetail.tsx
│   ├── Preview.tsx
│   └── ...
├── services/
│   ├── api.ts              # API 调用
│   └── auth.ts             # 认证
├── hooks/
│   ├── useAuth.ts
│   └── useStreams.ts
└── types/
    └── index.ts            # 类型定义
```

---

## 🎯 开发流程

### Week 1: 数据模型 & API

**任务**：
1. 完善后端 models 层（物业、NVR、通道）
2. 实现 Repository 层（数据访问）
3. 实现基础 Service 层（业务逻辑）
4. 实现 Handler 层（HTTP 路由）
5. 实现权限中间件

**验收**：
```bash
# 测试 API
curl http://127.0.0.1:8081/api/properties

# 查询数据库
psql -c "SELECT COUNT(*) FROM properties;"
```

### Week 2-3: 播放会话 & 流媒体

**任务**：
1. 实现播放会话创建/释放逻辑
2. 集成 ZLMediaKit addStreamProxy API
3. 实现 Hook 接收（on_stream_not_found, on_stream_none_reader）
4. 实现自动断流逻辑（30 秒无读者）
5. 实现并发控制（单用户、单物业、全局）

**验收**：
```bash
# 测试拉流
POST /api/sessions
{
  "channel_id": "xxx",
  "stream_type": "sub"
}

# 观看 30 秒不操作，自动断流
# 查看 ZLM 日志验证
docker-compose logs zlm
```

### Week 4: 前端 MVP

**任务**：
1. 实现登录页
2. 实现物业列表页
3. 实现实时预览页（1/4/9/16 分屏）
4. 集成 mpegts.js 播放器
5. 实现权限检查

**验收**：
- 登录成功
- 显示物业列表
- 点击物业显示通道列表
- 点击通道播放视频
- 9 宫格稳定 30 分钟

---

## 🔒 安全建议

### 开发阶段

| 项 | 要求 | 备注 |
|----|------|------|
| 凭据管理 | 不要提交 .env | 已在 .gitignore |
| 密码存储 | bcrypt 加密 | 至少 cost=12 |
| API 认证 | JWT token | token 有效期 1 小时 |
| 权限检查 | RBAC 强制 | 每个 API 都要检查 |
| 审计日志 | 记录所有观看 | 按法规要求 |
| HTTPS | 生产必须 | 开发可用 HTTP |

### 第一版安全清单

- [ ] NVR 账号密码加密存储
- [ ] JWT token 有效期限制
- [ ] 权限检查覆盖所有接口
- [ ] 审计日志记录播放行为
- [ ] 数据库连接使用 SSL（可选）

---

## 📊 性能优化建议

### 数据库

```sql
-- 关键查询优化
CREATE INDEX idx_channels_property_id ON channels(property_id);
CREATE INDEX idx_play_sessions_user_id ON play_sessions(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### 缓存策略

- 物业/通道列表：Redis 缓存 5 分钟
- 用户权限：Redis 缓存 1 小时
- 播放 token：Redis 存储 1 小时

### 后端优化

```go
// 连接池
db.SetMaxOpenConns(20)
db.SetMaxIdleConns(5)

// 日志采样
// 高流量时采样日志以降低 I/O
```

### 前端优化

```javascript
// 代码分割
const Preview = lazy(() => import('./pages/Preview'))

// 虚拟滚动
// 摄像头列表超过 100 个时使用虚拟滚动

// 图片懒加载
<img loading="lazy" />
```

---

## 🐛 常见问题

### Q: 数据库连接失败？
```bash
# 检查 PostgreSQL 运行状态
docker ps | grep postgres

# 测试连接
psql -h 127.0.0.1 -U smartcam -d smartcam -c "SELECT 1;"
```

### Q: RTSP 流无法拉取？
```bash
# 测试 RTSP URL
ffprobe rtsp://user:pass@nvr_ip:554/Streaming/channels/102

# 检查 ZLM Hook 日志
docker-compose logs zlm | grep hook
```

### Q: 前端无法连接后端？
```bash
# 检查代理配置
cat frontend/vite.config.ts | grep proxy

# 测试 API
curl http://127.0.0.1:8081/api/health
```

### Q: 演员超时？
```bash
# 检查 HTTP Hook 响应时间
# 确保 Go 服务在 10 秒内响应 Hook
```

---

## 📚 相关文档

- [API 文档](API.md)
- [数据库设计](DATABASE.md)
- [架构文档](ARCHITECTURE.md)
- [ZLMediaKit 文档](https://github.com/ZLMediaKit/ZLMediaKit/wiki)
- [Gin 框架文档](https://gin-gonic.com/)
- [React 文档](https://react.dev)

---

## ✅ 第一版 PoC 验收清单

**功能**
- [ ] 单物业 8 路摄像头完整显示
- [ ] 1/4/9/16 分屏切换
- [ ] 主/子码流切换
- [ ] 播放首帧延迟 < 2 秒
- [ ] 9 宫格稳定播放 30 分钟
- [ ] 页面关闭后 30 秒自动断流
- [ ] 权限隔离正常

**稳定性**
- [ ] 后端服务无崩溃
- [ ] 内存使用稳定
- [ ] CPU 使用合理
- [ ] 数据库连接无泄漏

**安全性**
- [ ] 用户认证正常
- [ ] 权限检查生效
- [ ] 审计日志完整
- [ ] 密码加密存储

**运维**
- [ ] 健康检查正常
- [ ] 日志输出清晰
- [ ] 告警机制完善

---

## 🎓 学习资源

- [ZLMediaKit Hook 文档](https://github.com/ZLMediaKit/ZLMediaKit/wiki/HTTP-Hook)
- [海康 RTSP URL 规则](https://www.hikvision.com/us/)
- [mpegts.js 文档](https://github.com/xqq/mpegts.js)
- [Gin 中文教程](https://www.topgoer.com/)

---

**更新时间**: 2026-05-29  
**版本**: 1.0.0 MVP
