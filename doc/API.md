# SmartCam MVP API 设计文档

**版本**: 1.0.0  
**最后更新**: 2026-05-29  
**API 基础地址**: `http://127.0.0.1:8081` (开发) / `https://api.smartcam.com` (生产)

---

## 📋 API 通用规范

### 认证方式

使用 JWT Bearer Token

```bash
Authorization: Bearer <token>
```

### 响应格式

所有 API 返回 JSON

**成功响应 (200/201)**：
```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

**错误响应**：
```json
{
  "code": 400,
  "message": "参数错误",
  "error": "property_id is required"
}
```

### 常见错误码

| 码 | 含义 |
|----|------|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未认证或 Token 过期 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如重复创建） |
| 500 | 服务器错误 |

---

## 🔐 认证 API

### 1. 用户登录

**Endpoint**: `POST /api/auth/login`

**请求**：
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

**错误响应 (401)**：
```json
{
  "code": 401,
  "message": "用户名或密码错误"
}
```

---

### 2. 获取当前用户信息

**Endpoint**: `GET /api/auth/profile`

**请求头**：
```
Authorization: Bearer <token>
```

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "role": "admin",
    "properties": [
      {
        "property_id": "550e8400-e29b-41d4-a716-446655440001",
        "property_name": "中心酒店",
        "permission_level": "admin"
      }
    ]
  }
}
```

---

## 🏢 物业 API

### 1. 获取物业列表

**Endpoint**: `GET /api/properties`

**查询参数**：
```
?page=1&limit=20&status=active
```

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 5,
    "page": 1,
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "中心酒店",
        "address": "福田区中心街 100 号",
        "nvr_count": 2,
        "channel_count": 16,
        "offline_channels": 0,
        "uplink_bandwidth_mbps": 10,
        "max_concurrent_streams": 50,
        "status": "active",
        "created_at": "2026-05-29T10:00:00Z"
      }
    ]
  }
}
```

---

### 2. 获取物业详情

**Endpoint**: `GET /api/properties/:id`

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "中心酒店",
    "address": "福田区中心街 100 号",
    "contact_person": "李经理",
    "contact_phone": "13800138000",
    "uplink_bandwidth_mbps": 10,
    "max_concurrent_streams": 50,
    "nvrs": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "name": "NVR-1",
        "brand": "hikvision",
        "channel_count": 8,
        "is_online": true
      }
    ],
    "active_sessions": 3
  }
}
```

---

### 3. 创建物业（仅 admin）

**Endpoint**: `POST /api/properties`

**请求**：
```json
{
  "name": "中心酒店",
  "address": "福田区中心街 100 号",
  "contact_person": "李经理",
  "contact_phone": "13800138000",
  "uplink_bandwidth_mbps": 10,
  "max_concurrent_streams": 50
}
```

**成功响应 (201)**：
```json
{
  "code": 0,
  "message": "created",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "中心酒店"
  }
}
```

---

## 🎥 NVR 设备 API

### 1. 获取 NVR 列表

**Endpoint**: `GET /api/properties/:property_id/nvrs`

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "property_id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "NVR-1",
      "brand": "hikvision",
      "model": "DS-7916N",
      "ip_address": "192.168.1.100",
      "channel_count": 8,
      "is_online": true,
      "last_heartbeat": "2026-05-29T10:05:00Z",
      "status": "active"
    }
  ]
}
```

---

### 2. 创建 NVR

**Endpoint**: `POST /api/properties/:property_id/nvrs`

**请求**：
```json
{
  "name": "NVR-1",
  "brand": "hikvision",
  "model": "DS-7916N",
  "ip_address": "192.168.1.100",
  "rtsp_port": 554,
  "http_port": 80,
  "username": "admin",
  "password": "12345",
  "channel_count": 8,
  "max_bandwidth_mbps": 50
}
```

**成功响应 (201)**：
```json
{
  "code": 0,
  "message": "created",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "status": "active"
  }
}
```

**错误响应 (400)** - NVR 离线或凭据错误：
```json
{
  "code": 400,
  "message": "NVR 连接失败",
  "error": "connection timeout"
}
```

---

### 3. 更新 NVR

**Endpoint**: `PUT /api/nvrs/:id`

**可更新字段**：
```json
{
  "name": "NVR-1 (主楼)",
  "channel_count": 16
}
```

---

### 4. 删除 NVR

**Endpoint**: `DELETE /api/nvrs/:id`

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "deleted"
}
```

---

## 📹 通道 API

### 1. 获取通道列表

**Endpoint**: `GET /api/channels`

**查询参数**：
```
?property_id=xxx&nvr_id=xxx&status=active
```

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "nvr_id": "550e8400-e29b-41d4-a716-446655440010",
      "property_id": "550e8400-e29b-41d4-a716-446655440001",
      "channel_number": 1,
      "name": "1 楼大厅",
      "location": "1楼入口处",
      "is_online": true,
      "sub_stream_encoding": "H.264",
      "sub_stream_bitrate_kbps": 1024,
      "status": "active"
    }
  ]
}
```

---

### 2. 获取通道详情

**Endpoint**: `GET /api/channels/:id`

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "name": "1 楼大厅",
    "channel_number": 1,
    "nvr_name": "NVR-1",
    "property_name": "中心酒店",
    "main_stream_encoding": "H.264",
    "main_stream_resolution": "1920x1080",
    "main_stream_fps": 25,
    "main_stream_bitrate_kbps": 2560,
    "sub_stream_encoding": "H.264",
    "sub_stream_resolution": "960x576",
    "sub_stream_fps": 25,
    "sub_stream_bitrate_kbps": 1024,
    "is_online": true
  }
}
```

---

### 3. 更新通道

**Endpoint**: `PUT /api/channels/:id`

**请求**：
```json
{
  "name": "1 楼大厅（已更新）",
  "location": "1 楼南侧入口"
}
```

---

## ▶️ 播放会话 API

### 1. 创建播放会话

**Endpoint**: `POST /api/sessions`

**请求**：
```json
{
  "channel_id": "550e8400-e29b-41d4-a716-446655440100",
  "stream_type": "sub",
  "protocol": "http-flv"
}
```

**stream_type 选项**：
- `main` - 主码流（高清，高带宽）
- `sub` - 子码流（标清，低带宽，默认）

**protocol 选项**：
- `http-flv` - HTTP FLV（推荐，兼容性好）
- `rtsp` - RTSP（直通）
- `hls` - HLS（低延迟不够，只用于回放）
- `webrtc` - WebRTC（低延迟，需要客户端支持）

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440200",
    "channel_id": "550e8400-e29b-41d4-a716-446655440100",
    "token": "xxx_token_xxx",
    "stream_url": "http://127.0.0.1:8080/live/xxx_stream_id.flv",
    "expires_in": 3600,
    "estimated_bitrate_kbps": 1024
  }
}
```

**错误响应 (409)** - 超过并发限制：
```json
{
  "code": 409,
  "message": "并发流数超过限制",
  "error": "property limit reached (50/50)"
}
```

**错误响应 (401)** - Token 过期：
```json
{
  "code": 401,
  "message": "token expired"
}
```

---

### 2. 获取播放会话列表

**Endpoint**: `GET /api/sessions`

**查询参数**：
```
?user_id=xxx&channel_id=xxx&is_active=true
```

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "session_id": "550e8400-e29b-41d4-a716-446655440200",
      "user_id": "550e8400-e29b-41d4-a716-446655440003",
      "channel_id": "550e8400-e29b-41d4-a716-446655440100",
      "channel_name": "1 楼大厅",
      "stream_type": "sub",
      "protocol": "http-flv",
      "started_at": "2026-05-29T10:10:00Z",
      "duration_seconds": 120,
      "is_active": true
    }
  ]
}
```

---

### 3. 结束播放会话

**Endpoint**: `DELETE /api/sessions/:id`

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "session closed",
  "data": {
    "duration_seconds": 300
  }
}
```

---

## 🔗 ZLMediaKit Hook API（内部）

### 1. Stream Not Found Hook

**Endpoint**: `POST /api/hooks/stream_not_found`

**由 ZLMediaKit 调用**。当客户端请求不存在的流时，触发此 Hook。

**请求**（由 ZLMediaKit 发送）：
```json
{
  "schema": "rtsp",
  "vhost": "__defaultVhost__",
  "app": "live",
  "stream": "xxx_stream_id",
  "url": "/live/xxx_stream_id",
  "ip": "127.0.0.1",
  "port": 8000,
  "tcp_seq": 100
}
```

**响应应该是**（返回 200）：
```json
{
  "code": 0,
  "msg": "pull stream from nvr"
}
```

**内部逻辑**：
1. 解析 stream_id 获得 channel_id
2. 从数据库查询 channel 和 NVR 信息
3. 构造 RTSP URL：`rtsp://user:pass@nvr_ip/Streaming/channels/sub_stream_number`
4. 调用 ZLM `addStreamProxy` API 拉取流
5. 返回 200 确认

---

### 2. Stream None Reader Hook

**Endpoint**: `POST /api/hooks/stream_none_reader`

**由 ZLMediaKit 调用**。当流 30 秒无读者时，触发此 Hook。

**请求**（由 ZLMediaKit 发送）：
```json
{
  "schema": "rtsp",
  "vhost": "__defaultVhost__",
  "app": "live",
  "stream": "xxx_stream_id",
  "duration": 30
}
```

**响应**：
```json
{
  "code": 0,
  "msg": "close the stream"
}
```

**内部逻辑**：
1. 调用 ZLM `delStreamProxy` API 删除流
2. 更新 zlm_streams 表状态为 inactive
3. 返回 200 确认

---

## 📊 审计日志 API

### 1. 获取审计日志

**Endpoint**: `GET /api/audit/logs`

**查询参数**：
```
?property_id=xxx&action=play&limit=100
```

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440300",
      "user": "admin",
      "action": "play",
      "channel_name": "1 楼大厅",
      "property_name": "中心酒店",
      "stream_type": "sub",
      "duration_seconds": 300,
      "ip_address": "192.168.1.100",
      "created_at": "2026-05-29T10:15:00Z"
    }
  ]
}
```

---

## 🏥 健康检查 API

### 1. 获取健康检查结果

**Endpoint**: `GET /api/health/status`

**查询参数**：
```
?property_id=xxx
```

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "nvr_status": [
      {
        "nvr_id": "550e8400-e29b-41d4-a716-446655440010",
        "nvr_name": "NVR-1",
        "is_online": true,
        "last_check": "2026-05-29T10:30:00Z",
        "latency_ms": 50
      }
    ],
    "stream_status": [
      {
        "channel_id": "550e8400-e29b-41d4-a716-446655440100",
        "channel_name": "1 楼大厅",
        "is_online": true,
        "last_check": "2026-05-29T10:30:00Z"
      }
    ]
  }
}
```

---

### 2. 手动触发健康检查

**Endpoint**: `POST /api/health/check`

**请求**：
```json
{
  "property_id": "550e8400-e29b-41d4-a716-446655440001",
  "check_type": "rtsp_probe"
}
```

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "check completed",
  "data": {
    "total_channels": 8,
    "online_channels": 8,
    "offline_channels": 0
  }
}
```

---

## ⚠️ 告警 API

### 1. 获取告警列表

**Endpoint**: `GET /api/alerts`

**查询参数**：
```
?property_id=xxx&severity=high&is_resolved=false
```

**成功响应 (200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440400",
      "property_name": "中心酒店",
      "alert_type": "offline",
      "severity": "high",
      "title": "NVR-1 离线",
      "description": "NVR-1 (192.168.1.100) 连接失败",
      "created_at": "2026-05-29T10:00:00Z",
      "is_resolved": false
    }
  ]
}
```

---

### 2. 解决告警

**Endpoint**: `PUT /api/alerts/:id`

**请求**：
```json
{
  "is_resolved": true,
  "note": "已联系安装方排查，网络恢复"
}
```

---

## 🧪 测试工具

### 使用 curl 测试 API

**登录**：
```bash
curl -X POST http://127.0.0.1:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**获取物业列表**：
```bash
TOKEN="..."
curl -X GET http://127.0.0.1:8081/api/properties \
  -H "Authorization: Bearer $TOKEN"
```

**创建播放会话**：
```bash
curl -X POST http://127.0.0.1:8081/api/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel_id":"xxx","stream_type":"sub","protocol":"http-flv"}'
```

### 使用 Postman 测试

1. 导入该文档中的所有端点
2. 配置 `Authorization` 标签为 "Bearer Token"
3. 设置变量 `base_url = http://127.0.0.1:8081`
4. 使用 `Pre-request Script` 自动刷新 Token

---

## 🔒 API 安全规则

1. **所有 API（除登录外）都需要 JWT Token**
2. **Token 有效期 1 小时**
3. **用户只能访问自己有权限的物业**
4. **密码字段永不返回给客户端**
5. **所有涉敏操作（创建/删除）都记录审计日志**
6. **错误消息不暴露内部实现细节**

---

**版本**: 1.0.0  
**最后更新**: 2026-05-29
