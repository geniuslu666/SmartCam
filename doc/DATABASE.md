# SmartCam MVP 数据库设计文档

## 📊 数据库架构概述

### 设计原则

1. **规范化** - 避免数据冗余，但保留必要的冗余字段以提高查询性能
2. **扩展性** - 支持未来品牌扩展和功能升级
3. **审计性** - 记录所有关键操作，用于合规性要求
4. **性能** - 索引策略优化查询，JSONB 支持灵活数据结构

### 数据库选择

- **PostgreSQL 15+** - 成熟、稳定、功能丰富
- **JSONB 字段** - 存储灵活数据（如健康检查详情、告警参数）
- **uuid** - 分布式 ID 支持
- **TEXT 索引** - 支持全文搜索（未来扩展）

---

## 🏗️ 核心表结构

### 1. properties（物业表）

**用途**：存储物业基本信息

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY,                    -- 物业唯一标识
  name VARCHAR(255) NOT NULL UNIQUE,      -- 物业名称
  description TEXT,                       -- 描述
  address VARCHAR(255),                   -- 物业地址
  contact_person VARCHAR(100),            -- 联系人
  contact_phone VARCHAR(20),              -- 联系电话
  uplink_bandwidth_mbps INT,              -- 上行带宽（Mbps）
  max_concurrent_streams INT DEFAULT 50,  -- 最大并发流数
  status VARCHAR(20) DEFAULT 'active',    -- 状态：active/inactive/maintenance
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**索引**：
```sql
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_created_at ON properties(created_at);
```

**关键字段说明**：
- `uplink_bandwidth_mbps` - 物业上行宽带，用于配置最大并发流数
- `max_concurrent_streams` - 为防止拉流数过多导致物业网络瘫痪

### 2. nvrs（NVR 设备表）

**用途**：存储 NVR 设备信息和连接参数

```sql
CREATE TABLE nvrs (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id),
  name VARCHAR(255) NOT NULL,             -- 设备名称
  brand VARCHAR(100) NOT NULL,            -- 品牌：hikvision/dahua/uniview/onvif/other
  model VARCHAR(100),                     -- 型号
  firmware_version VARCHAR(50),           -- 固件版本
  ip_address INET NOT NULL,               -- IP 地址
  rtsp_port INT DEFAULT 554,              -- RTSP 服务端口
  http_port INT DEFAULT 80,               -- HTTP 管理端口
  username VARCHAR(100) NOT NULL,         -- 登录用户名
  password_encrypted VARCHAR(255),        -- 加密密码（bcrypt）
  max_bandwidth_mbps INT,                 -- NVR 最大出流带宽
  channel_count INT NOT NULL,             -- 通道总数
  support_h264 BOOLEAN DEFAULT true,      -- 是否支持 H.264
  support_h265 BOOLEAN DEFAULT false,     -- 是否支持 H.265
  is_online BOOLEAN DEFAULT true,         -- 在线状态
  last_heartbeat TIMESTAMP,               -- 最后心跳时间
  status VARCHAR(20) DEFAULT 'active',    -- 状态
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(property_id, ip_address)
);
```

**关键设计**：
- `brand` - 用于未来多品牌适配
- `password_encrypted` - 密码必须加密存储，不允许明文
- `channel_count` - 为了快速查询，冗余存储通道数
- `support_h264/h265` - 记录编码支持能力

### 3. channels（摄像头通道表）

**用途**：存储摄像头/通道信息和 RTSP 配置

```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY,
  nvr_id UUID NOT NULL REFERENCES nvrs(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  channel_number INT NOT NULL,                -- 通道号（101、102 等）
  name VARCHAR(255) NOT NULL,                 -- 通道名称
  location VARCHAR(255),                      -- 位置描述（如"1楼大厅"）
  
  -- RTSP URL 模板，用于动态生成真实 URL
  rtsp_main_url_template VARCHAR(512),        -- 主码流 URL 模板
  rtsp_sub_url_template VARCHAR(512),         -- 子码流 URL 模板
  
  -- 编码格式
  main_stream_encoding VARCHAR(50) DEFAULT 'H.264',  -- 主码流编码
  sub_stream_encoding VARCHAR(50) DEFAULT 'H.264',   -- 子码流编码
  
  -- 分辨率、帧率、码率（用于 UI 显示和预估带宽）
  main_stream_resolution VARCHAR(50),         -- 如 "1920x1080"
  main_stream_fps INT,
  main_stream_bitrate_kbps INT,
  
  sub_stream_resolution VARCHAR(50),
  sub_stream_fps INT,
  sub_stream_bitrate_kbps INT,
  
  is_online BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(nvr_id, channel_number)
);
```

**关键设计**：
- `rtsp_main_url_template` - 示例：`rtsp://{username}:{password}@{ip}:{port}/Streaming/channels/101`
- 模板中的占位符在生成真实 URL 时被替换
- 子码流通常编码率低，用于预览和分屏

### 4. play_sessions（播放会话表）

**用途**：记录每次播放的会话信息，用于权限校验、并发控制、审计日志

```sql
CREATE TABLE play_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  channel_id UUID NOT NULL REFERENCES channels(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  
  -- 播放参数
  stream_type VARCHAR(50) DEFAULT 'sub' CHECK (stream_type IN ('main', 'sub')),
  protocol VARCHAR(50) DEFAULT 'http-flv' CHECK (protocol IN ('rtsp', 'http-flv', 'webrtc', 'hls')),
  zlm_stream_id VARCHAR(255),                 -- ZLMediaKit 流 ID
  
  -- Token 和过期时间
  token VARCHAR(255) UNIQUE,                  -- 播放令牌
  token_expires_at TIMESTAMP,
  
  -- 会话生命周期
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INT,
  
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'playing',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**索引**：
```sql
CREATE INDEX idx_play_sessions_user_id ON play_sessions(user_id);
CREATE INDEX idx_play_sessions_channel_id ON play_sessions(channel_id);
CREATE INDEX idx_play_sessions_is_active ON play_sessions(is_active);
CREATE INDEX idx_play_sessions_token ON play_sessions(token);
CREATE INDEX idx_play_sessions_started_at ON play_sessions(started_at DESC);
```

### 5. users（用户表）

**用途**：存储用户基本信息和角色

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,       -- bcrypt hash
  role VARCHAR(50) DEFAULT 'viewer',         -- admin/manager/operator/viewer
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 6. user_property_permissions（权限表）

**用途**：实现物业级别的权限隔离

```sql
CREATE TABLE user_property_permissions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  permission_level VARCHAR(50) DEFAULT 'view',   -- admin/manage/view
  created_at TIMESTAMP,
  UNIQUE(user_id, property_id)
);
```

**设计说明**：
- `permission_level='view'` - 只能观看
- `permission_level='manage'` - 可以配置
- `permission_level='admin'` - 物业管理员权限

### 7. audit_logs（审计日志表）

**用途**：记录所有关键操作，用于合规性要求

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,              -- 'play', 'stop', 'configure', 'delete'
  resource_type VARCHAR(100),                -- 'channel', 'property', 'user'
  resource_id UUID,
  property_id UUID REFERENCES properties(id),
  channel_id UUID REFERENCES channels(id),
  details JSONB,                             -- 详细信息
  ip_address INET,
  user_agent VARCHAR(512),
  status VARCHAR(20) DEFAULT 'success',      -- success/failure
  created_at TIMESTAMP DEFAULT NOW()
);
```

**示例日志**：
```json
{
  "action": "play",
  "user": "operator1",
  "channel_name": "1楼大厅",
  "property_name": "中心酒店",
  "stream_type": "sub",
  "duration_seconds": 300,
  "ip_address": "192.168.1.100"
}
```

### 8. zlm_streams（ZLM 流代理表）

**用途**：记录 ZLMediaKit 中的代理流信息

```sql
CREATE TABLE zlm_streams (
  id UUID PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES channels(id),
  stream_id VARCHAR(255) UNIQUE NOT NULL,    -- ZLM 流 ID
  stream_app VARCHAR(100) DEFAULT 'live',
  stream_name VARCHAR(255),
  protocol VARCHAR(50),
  src_url VARCHAR(512),                      -- 源 RTSP URL
  create_time BIGINT,                        -- ZLM 创建时间
  duration BIGINT,                           -- 存活时长
  reader_count INT DEFAULT 0,                -- 当前读者数
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**用途**：
- 追踪 ZLM 中的活跃流
- 当 `reader_count=0` 超过 30 秒时触发 Hook 自动释放流

### 9. health_checks（健康检查表）

**用途**：记录健康检查结果，用于故障监测

```sql
CREATE TABLE health_checks (
  id UUID PRIMARY KEY,
  nvr_id UUID REFERENCES nvrs(id),
  channel_id UUID REFERENCES channels(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  
  check_type VARCHAR(50),                    -- 'ping'/'rtsp_probe'/'http_probe'/'stream_test'
  result VARCHAR(20),                        -- 'success'/'failure'/'timeout'
  latency_ms INT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**索引**：
```sql
CREATE INDEX idx_health_checks_created_at ON health_checks(created_at DESC);
CREATE INDEX idx_health_checks_property_id ON health_checks(property_id);
```

### 10. alerts（告警表）

**用途**：存储运维告警

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id),
  nvr_id UUID REFERENCES nvrs(id),
  channel_id UUID REFERENCES channels(id),
  
  alert_type VARCHAR(100),                   -- 'offline'/'stream_fail'/'bandwidth_exceed'
  severity VARCHAR(20) DEFAULT 'info',       -- 'critical'/'high'/'medium'/'low'/'info'
  title VARCHAR(255),
  description TEXT,
  
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📈 视图（用于复杂查询优化）

### v_channel_details - 通道详细信息视图

```sql
CREATE VIEW v_channel_details AS
SELECT 
  c.id, c.channel_number, c.name, c.location,
  p.id as property_id, p.name as property_name,
  n.id as nvr_id, n.name as nvr_name, n.brand,
  c.sub_stream_encoding, c.sub_stream_bitrate_kbps,
  c.is_online, c.status
FROM channels c
JOIN nvrs n ON c.nvr_id = n.id
JOIN properties p ON c.property_id = p.id;
```

### v_property_overview - 物业概览视图

```sql
CREATE VIEW v_property_overview AS
SELECT 
  p.id, p.name, p.status,
  COUNT(DISTINCT n.id) as nvr_count,
  COUNT(DISTINCT c.id) as channel_count,
  COUNT(DISTINCT CASE WHEN c.is_online = false THEN c.id END) as offline_channels,
  COUNT(DISTINCT ps.id) as active_sessions
FROM properties p
LEFT JOIN nvrs n ON p.id = n.property_id
LEFT JOIN channels c ON p.id = c.property_id
LEFT JOIN play_sessions ps ON p.id = ps.property_id AND ps.is_active = true
GROUP BY p.id, p.name, p.status;
```

---

## 🔑 关键索引策略

| 表 | 索引字段 | 原因 |
|----|---------|------|
| channels | property_id, status | 物业页面快速查询该物业的所有通道 |
| play_sessions | user_id, is_active | 查询用户的活跃会话 |
| play_sessions | token | 验证令牌时快速查找 |
| audit_logs | created_at DESC | 审计日志倒序查询 |
| audit_logs | property_id, user_id | 按物业或用户过滤审计日志 |
| health_checks | created_at DESC | 显示最近的检查结果 |
| alerts | is_resolved, severity | 查询未解决的高优先级告警 |

---

## 💾 性能优化技巧

### 1. 避免 N+1 查询

❌ **不好的方式**：
```go
// 循环查询，每个 NVR 查询一次通道
for _, nvr := range nvrs {
    channels := queryChannels(nvr.ID)
}
```

✅ **好的方式**：
```go
// 一次查询所有通道
SELECT * FROM channels WHERE nvr_id IN (...)
```

### 2. 使用连接池

```go
db.SetMaxOpenConns(20)    // 最大连接数
db.SetMaxIdleConns(5)     // 最大空闲连接数
db.SetConnMaxLifetime(time.Hour)  // 连接最大生命周期
```

### 3. 缓存常用数据

```go
// 缓存物业列表（5 分钟过期）
cache.Set("properties:list", properties, 5*time.Minute)

// 缓存用户权限（1 小时过期）
cache.Set(fmt.Sprintf("user:%s:properties", userID), props, 1*time.Hour)
```

### 4. 数据库连接字符串优化

```
postgresql://smartcam:password@localhost/smartcam?
  sslmode=disable&
  connect_timeout=10&
  statement_cache_mode=describe&
  application_name=smartcam
```

---

## 🔐 数据安全

### 密码存储

```go
// 使用 bcrypt 哈希密码，cost >= 12
hash, _ := bcrypt.GenerateFromPassword([]byte(password), 12)
db.Update("nvrs", "password_encrypted = ?", string(hash)).Where("id = ?", nvr.ID)
```

### 凭证管理

```
❌ 不要：SELECT * FROM nvrs WHERE id = ?  // 返回密码字段
✅ 要：SELECT id, name, brand, ... FROM nvrs WHERE id = ?  // 排除密码字段
```

### 审计日志

```sql
-- 所有播放操作记录
INSERT INTO audit_logs (...) 
VALUES (user_id, 'play', 'channel', channel_id, ...);
```

---

## 📊 数据库初始化和维护

### 初始化

```bash
psql -U smartcam -d smartcam < smartcam-db-init.sql
```

### 定期备份

```bash
pg_dump -h localhost -U smartcam -d smartcam > backup-$(date +%Y%m%d).sql
```

### 性能监控

```sql
-- 查看慢查询日志
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

-- 查看表大小
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size DESC;
```

---

## 🚀 未来扩展建议

1. **分片** - 当表大小超过 10GB 时考虑按 property_id 分片
2. **归档** - 旧审计日志定期移到冷存储
3. **只读副本** - 报表查询使用只读副本
4. **时间序列** - 健康检查数据可迁移到 InfluxDB/TimescaleDB

---

**更新时间**: 2026-05-29  
**版本**: 1.0.0
