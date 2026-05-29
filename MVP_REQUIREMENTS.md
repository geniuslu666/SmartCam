# SmartCam MVP 第一版 - 开发环境配置完成

**日期**: 2026-05-29  
**项目**: SmartCam - NVR 集中监控系统（海康 + 多物业 + 按需拉流）  
**阶段**: MVP 开发环境搭建  
**目标**: 1 个物业、海康 NVR、8-16 路摄像头的完整 PoC

---

## ✅ 已完成工作

### 📦 环境配置文件（6 个）

| 文件 | 用途 |
|------|------|
| `scripts/setup-dev-server.sh` | 系统环境初始化（Go、Node.js、Docker、PostgreSQL、Redis） |
| `scripts/docker-compose.dev.yml` | 开发容器编排（PostgreSQL、Redis、ZLMediaKit） |
| `scripts/smartcam-db-init.sql` | 数据库初始化（10 张表、3 个视图、完整索引） |
| `scripts/init-project.sh` | 项目结构初始化（后端、前端目录和配置） |
| `scripts/check-dev-env.sh` | 开发环境检查清单 |
| `ops/zlm/config.ini.dev` | ZLMediaKit 开发配置（Hook、按需拉流） |

### 📚 完整文档（4 个）

| 文档 | 内容 |
|------|------|
| `DEV_GUIDE.md` | 完整开发指南（环境配置、开发流程、API 设计） |
| `DATABASE.md` | 数据库详细设计（10 张表、视图、索引、优化建议） |
| `MVP_REQUIREMENTS.md`（本文件） | 本次配置的完整说明 |
| `start-dev-mvp.sh` | 一键启动脚本 |

### 🗄️ 数据库设计（10 张表）

```
物业管理层：
  - properties（物业）
  - users（用户）
  - user_property_permissions（权限）

设备管理层：
  - nvrs（NVR 设备）
  - channels（摄像头通道）

流媒体管理层：
  - zlm_streams（ZLM 代理流）
  - play_sessions（播放会话）

运维监控层：
  - health_checks（健康检查）
  - alerts（告警）
  - audit_logs（审计日志）
```

### 🎨 项目结构初始化

**后端（Go）**：
- `backend/cmd/server/` - 入口
- `backend/internal/{models,repository,service,handler,middleware}`
- `backend/pkg/{config,logger,errors,utils}`
- `go.mod`、`.env.example`

**前端（React）**：
- `frontend/src/{components,pages,hooks,services,types,utils,styles}`
- `frontend/package.json`、`vite.config.ts`、`tsconfig.json`
- `tailwind.config.js`、`index.html`

---

## 🚀 快速开始（4 步）

### 第 1 步：系统环境初始化（仅一次）

**在远程 Linux 服务器上以 root 身份运行**：

```bash
cd /opt/smartcam
sudo bash scripts/setup-dev-server.sh
```

**自动安装**：
- Go 1.22+
- Node.js 20+
- PostgreSQL 15
- Redis
- Docker & Docker Compose
- 所有系统依赖

**预计耗时**: 10-15 分钟

### 第 2 步：启动开发容器

```bash
docker-compose -f scripts/docker-compose.dev.yml up -d
```

**启动的服务**：
- PostgreSQL 5432（数据库）
- Redis 6379（缓存）
- ZLMediaKit 8080/554/1935（流媒体）

**验证**：
```bash
docker-compose -f scripts/docker-compose.dev.yml ps
```

### 第 3 步：验证开发环境

```bash
bash scripts/check-dev-env.sh
```

**检查项**：
- ✓ Go、Node.js、Docker 等依赖
- ✓ PostgreSQL、Redis 连接
- ✓ 数据库初始化
- ✓ 项目结构完整
- ✓ 所有必需端口可用

### 第 4 步：启动开发

**后端（Go）**：
```bash
cd backend
go run ./cmd/server
# 服务在 http://127.0.0.1:8081
```

**前端（React）**：
```bash
cd frontend
npm install
npm run dev
# 前端在 http://127.0.0.1:5173
```

---

## 🎯 MVP 第一版功能规划

### 第 1 周：数据模型 & API 基础

**后端任务**：
- [ ] 完善 models 层（Property、NVR、Channel、PlaySession）
- [ ] 实现 Repository 层（CRUD 操作）
- [ ] 实现 Service 层（业务逻辑）
- [ ] 实现 Handler 层（HTTP 路由）
- [ ] 实现权限中间件（RBAC）

**API 端点**（优先级）：
```
P0:
  GET    /api/properties              # 物业列表
  GET    /api/properties/:id/nvrs     # 物业的 NVR 列表
  GET    /api/channels                # 通道列表
  POST   /api/sessions                # 创建播放会话
  DELETE /api/sessions/:id            # 结束播放会话
  
P1:
  GET    /api/audit/logs              # 审计日志
  POST   /api/health/check            # 健康检查
```

**验收指标**：
```bash
✓ curl http://127.0.0.1:8081/api/properties
✓ psql -c "SELECT COUNT(*) FROM properties;"
✓ JWT 认证正常
```

### 第 2-3 周：流媒体与播放会话

**重点模块**：
- [ ] 播放会话创建（调用 ZLM addStreamProxy）
- [ ] 播放会话释放（自动断流）
- [ ] ZLM Hook 接收（on_stream_not_found、on_stream_none_reader）
- [ ] 并发控制（单用户、单物业、全局）
- [ ] 自动断流（30 秒无读者）

**关键实现**：
```go
// 创建播放会话
POST /api/sessions
{
  "channel_id": "xxx",
  "stream_type": "sub",    // main or sub
  "protocol": "http-flv"   // rtsp/http-flv/webrtc/hls
}

// 返回
{
  "token": "xxx",
  "stream_url": "http://127.0.0.1:8080/live/xxx.flv",
  "expires_in": 3600
}

// Hook 接收
POST /api/hooks/stream_none_reader
{
  "stream_id": "xxx",
  "action": "close"
}
```

**验收指标**：
```
✓ 创建会话成功，返回流地址
✓ 30 秒无读者，自动断流
✓ 并发限制生效
✓ ZLM 日志显示 addStreamProxy 成功
```

### 第 4 周：前端 MVP

**核心页面**：
1. 登录页
2. 物业列表（概览）
3. 实时预览（1/4/9/16 分屏）
4. 配置管理（通道名、RTSP 模板）

**前端架构**：
```
src/
├── pages/
│   ├── Login.tsx              # 登录
│   ├── PropertyList.tsx       # 物业列表
│   ├── Preview.tsx            # 实时预览
│   └── ConfigPanel.tsx        # 配置管理
├── components/
│   ├── VideoPlayer.tsx        # 单路播放器
│   ├── MultiGrid.tsx          # 多路布局
│   └── Sidebar.tsx            # 侧栏导航
├── hooks/
│   ├── useAuth.ts
│   ├── useStreams.ts
│   └── useChannels.ts
└── services/
    └── api.ts                 # API 调用
```

**播放器集成**：
```javascript
// 使用 mpegts.js 播放 HTTP-FLV
import mpegts from 'mpegts.js';

const player = mpegts.createPlayer({
  type: 'flv',
  isLive: true,
  url: 'http://127.0.0.1:8080/live/xxx.flv'
});
player.attachMediaElement(videoElement);
player.load();
player.play();
```

**验收指标**：
```
✓ 登录成功
✓ 显示物业列表
✓ 点击物业显示通道列表
✓ 点击通道播放视频
✓ 9 宫格稳定 30 分钟
✓ 页面关闭后 30 秒自动断流
```

---

## 📊 测试场景设计

### PoC 验证清单

**环境**：
- 1 个物业（中心酒店）
- 1 台海康 NVR
- 8-16 路摄像头（子码流 512Kbps-1.5Mbps）
- 物业上行带宽：10Mbps（模拟）

**测试用例**：

| # | 场景 | 步骤 | 预期结果 |
|---|------|------|---------|
| 1 | 单路播放 | 点击通道→播放 | 2 秒内首帧，流畅播放 |
| 2 | 4 宫格 | 同时播放 4 路 | 4×1.5Mbps=6Mbps，稳定 |
| 3 | 9 宫格 | 同时播放 9 路 | 9×1.5Mbps=13.5Mbps（超限告警） |
| 4 | 30 分钟稳定性 | 9 宫格播放 30min | 无崩溃、无卡顿、内存稳定 |
| 5 | 自动断流 | 播放→页面关闭→等待 | 30 秒后 ZLM 断流 |
| 6 | 主/子码流切换 | 播放中切换 | 无闪屏，新流播放 |
| 7 | 权限隔离 | 用户 A 看不了用户 B 的物业 | 返回 403 Forbidden |
| 8 | 审计日志 | 观看 5 分钟后查看日志 | 日志记录完整（用户、时间、通道）|
| 9 | 网络恢复 | 拔掉网线→插上 | 自动重连，流恢复 |
| 10 | 并发限制 | 用户打开超过 16 路 | 新流创建失败，提示超限 |

**性能基准**：
```
指标                目标值        公式
首帧延迟            < 2 秒        RTSP 建连 < 0.5s + ZLM 转码 < 0.5s + 网络 < 1s
带宽预估            < 物业上行    路数 × 单路码率
内存占用            < 512MB       后端 + ZLM 共享
CPU 使用率          < 50%         转码、拷贝时
数据库查询          < 100ms       包括关联查询

```

---

## 🔒 安全检查清单

### 第一版必须完成

- [ ] NVR 密码 bcrypt 加密存储
- [ ] JWT token 有效期限制（1 小时）
- [ ] 所有 API 接口都有权限检查
- [ ] 播放前验证用户对物业的访问权限
- [ ] 审计日志记录所有播放操作
- [ ] 凭据不暴露给前端
- [ ] ZLM secret 不暴露给前端
- [ ] HTTPS（生产环境）
- [ ] SQL 注入防护（参数化查询）
- [ ] CORS 配置正确

---

## 🛠️ 故障排查指南

### 问题 1：PostgreSQL 连接失败

```bash
# 检查容器状态
docker-compose -f scripts/docker-compose.dev.yml ps postgres

# 查看日志
docker-compose -f scripts/docker-compose.dev.yml logs postgres

# 手动测试
psql -h 127.0.0.1 -U smartcam -d smartcam -c "SELECT 1;"
```

### 问题 2：RTSP 无法拉取

```bash
# 验证 RTSP URL
ffprobe rtsp://admin:password@192.168.1.100:554/Streaming/channels/102

# 检查网络连接
ping 192.168.1.100
telnet 192.168.1.100 554

# 查看 ZLM 日志
docker-compose -f scripts/docker-compose.dev.yml logs zlm | grep error
```

### 问题 3：前端无法连接后端

```bash
# 检查 API 访问
curl http://127.0.0.1:8081/api/health

# 查看前端代理配置
cat frontend/vite.config.ts | grep proxy

# 查看后端日志
# 后端终端查看输出
```

### 问题 4：播放无法开始

```bash
# 1. 检查会话创建是否成功
POST http://127.0.0.1:8081/api/sessions

# 2. 验证 token
curl http://127.0.0.1:8080/live/xxx.flv -H "Authorization: Bearer token"

# 3. 查看 ZLM 中流是否存在
curl http://127.0.0.1:8080/api/listStreams

# 4. 查看浏览器控制台错误
```

---

## 📋 关键文件速查

| 需求 | 查看文件 |
|------|---------|
| 快速开始 | `DEV_GUIDE.md` 前 50 行 |
| 数据库设计 | `DATABASE.md` |
| API 文档 | 待编写（`API.md`） |
| 环境配置 | `scripts/docker-compose.dev.yml` |
| 初始化脚本 | `scripts/smartcam-db-init.sql` |
| 后端配置 | `backend/.env.example` |
| 前端配置 | `frontend/vite.config.ts` |
| ZLM 配置 | `ops/zlm/config.ini.dev` |

---

## 🎓 技术文档参考

- [ZLMediaKit Hook 文档](https://github.com/ZLMediaKit/ZLMediaKit/wiki/HTTP-Hook)
- [海康 RTSP URL 规则](https://www.hikvision.com/)
- [mpegts.js 项目](https://github.com/xqq/mpegts.js)
- [Gin Web Framework](https://gin-gonic.com/)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [Redis 中文文档](https://www.redis.com.cn/)

---

## 📞 后续支持

### 遇到问题

1. **查看日志** - 99% 的问题在日志里
   ```bash
   docker-compose -f scripts/docker-compose.dev.yml logs -f
   ```

2. **检查环境** - 环境配置不对会导致各种奇怪问题
   ```bash
   bash scripts/check-dev-env.sh
   ```

3. **验证网络** - NVR 连通性很关键
   ```bash
   ping <NVR_IP>
   ffprobe rtsp://...
   ```

### 联系方式

- 技术问题 → 查看 `DEV_GUIDE.md`
- 数据库问题 → 查看 `DATABASE.md`
- 部署问题 → 查看 `DEPLOYMENT.md`

---

## ✅ 最终检查清单

在开始开发前，确保以下项已完成：

- [ ] 已运行 `bash scripts/setup-dev-server.sh`
- [ ] 已启动 `docker-compose -f scripts/docker-compose.dev.yml up -d`
- [ ] 已运行 `bash scripts/check-dev-env.sh` 并通过所有检查
- [ ] 已查看 `DEV_GUIDE.md`
- [ ] 已查看 `DATABASE.md`
- [ ] 已了解第一版 MVP 边界（本文档）
- [ ] 已准备好海康 NVR IP、用户名、密码
- [ ] 已准备好测试物业信息

---

## 🎉 准备就绪

**环境配置**: ✅ 完成  
**文档完整**: ✅ 完成  
**项目结构**: ✅ 初始化完成  
**数据库**: ✅ 设计完成  
**开发指南**: ✅ 完成  

**现在可以开始开发第一版 MVP 了！**

下一步：按照 `DEV_GUIDE.md` 中"开发流程"章节逐步实现。

---

**最后更新**: 2026-05-29  
**版本**: 1.0.0 MVP Configuration  
**作者**: SmartCam Development Team
