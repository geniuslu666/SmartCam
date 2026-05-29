# SmartCam
# NVR 集中监控第一版

这是第一版工程骨架，用于把一个海康 NVR 测试物业接入自研集中监控后台。

当前包含：

- Go 后端控制面：设备台账、海康 RTSP URL 生成、ZLMediaKit 拉流/断流 API、ZLM hook 接收入口。
- React 前端：物业概览、摄像头列表、4/9/16 分屏、主/子码流切换、播放/停止。
- ZLMediaKit Docker Compose 示例。
- 远程 Linux 开发环境变量模板。

## 目录

```text
backend/     Go 控制面
frontend/    Vite + React + Tailwind 管理端
ops/zlm/     ZLMediaKit 最小配置
```

## 远程 Linux 准备

建议服务器安装：

- Go 1.22+
- Node.js 20+
- Docker / Docker Compose
- VSCode Remote SSH

克隆或同步代码后，复制环境变量：

```bash
cp .env.example .env
```

编辑 `.env`，至少修改：

```bash
PUBLIC_API_BASE_URL=http://服务器IP:8081
PUBLIC_STREAM_BASE_URL=http://服务器IP:8080
HIK_NVR_HOST=海康NVR可访问IP
HIK_NVR_USERNAME=取流账号
HIK_NVR_PASSWORD=取流密码
HIK_CAMERA_COUNT=实际通道数
```

首次调试建议先保持：

```bash
ZLM_ENABLED=false
```

这样前后端可以先跑通，点击播放会返回播放地址，但不会真的请求 ZLM 拉 NVR。

## 启动后端

```bash
set -a
source .env
set +a

cd backend
go run ./cmd/server
```

健康检查：

```bash
curl http://127.0.0.1:8081/api/health
```

## 启动前端

```bash
cd frontend
npm install
npm run dev
```

浏览器打开：

```text
http://服务器IP:5173
```

VSCode Remote SSH 场景下，也可以用 VSCode 的端口转发打开 `5173` 和 `8081`。

## 启动 ZLMediaKit

确认后端已启动后，在项目根目录执行：

```bash
docker compose up -d zlm
```

然后把 `.env` 改为：

```bash
ZLM_ENABLED=true
```

重启 Go 后端。

## 海康 RTSP 规则

当前后端按海康常见规则生成：

```text
rtsp://user:password@NVR_IP:554/Streaming/channels/101
rtsp://user:password@NVR_IP:554/Streaming/channels/102
```

其中：

- `101` 表示第 1 通道主码流。
- `102` 表示第 1 通道子码流。
- `201` / `202` 表示第 2 通道。

第一版默认用子码流播放，建议在 NVR 里把子码流设置为 H.264。

## 下一步建议

1. 用 VLC 或 ffprobe 先验证每个通道的 RTSP 是否能从远程服务器访问。
2. 开启 ZLM 后测试 1 路子码流播放。
3. 再测试 4/9 分屏和页面关闭后的 `on_stream_none_reader`。
4. 稳定后把内存台账替换为 PostgreSQL。
5. 加登录、RBAC、播放审计和并发限制。

