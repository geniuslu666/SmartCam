-- SmartCam MVP 数据库初始化脚本
-- PostgreSQL 15+ 

-- 创建数据库
CREATE DATABASE smartcam 
  ENCODING 'UTF8' 
  LC_COLLATE 'C' 
  LC_CTYPE 'C'
  TEMPLATE template0;

-- 连接到新数据库
\c smartcam

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ================= 租户/物业表 =================

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  address VARCHAR(255),
  contact_person VARCHAR(100),
  contact_phone VARCHAR(20),
  uplink_bandwidth_mbps INT DEFAULT 10 CHECK (uplink_bandwidth_mbps > 0),
  max_concurrent_streams INT DEFAULT 50 CHECK (max_concurrent_streams > 0),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_created_at ON properties(created_at);

-- ================= NVR/设备表 =================

CREATE TABLE nvrs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL CHECK (brand IN ('hikvision', 'dahua', 'uniview', 'onvif', 'other')),
  model VARCHAR(100),
  firmware_version VARCHAR(50),
  ip_address INET NOT NULL,
  rtsp_port INT DEFAULT 554,
  http_port INT DEFAULT 80,
  username VARCHAR(100) NOT NULL,
  password_encrypted VARCHAR(255) NOT NULL,
  max_bandwidth_mbps INT,
  channel_count INT NOT NULL CHECK (channel_count > 0),
  support_h264 BOOLEAN DEFAULT true,
  support_h265 BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id, ip_address)
);

CREATE INDEX idx_nvrs_property_id ON nvrs(property_id);
CREATE INDEX idx_nvrs_status ON nvrs(status);
CREATE INDEX idx_nvrs_brand ON nvrs(brand);

-- ================= 摄像头/通道表 =================

CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nvr_id UUID NOT NULL REFERENCES nvrs(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  channel_number INT NOT NULL CHECK (channel_number > 0),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  
  -- RTSP URL 模板（可包含 {username}, {password}, {ip}, {port} 占位符）
  rtsp_main_url_template VARCHAR(512),
  rtsp_sub_url_template VARCHAR(512),
  
  -- 编码信息
  main_stream_encoding VARCHAR(50) DEFAULT 'H.264' CHECK (main_stream_encoding IN ('H.264', 'H.265')),
  sub_stream_encoding VARCHAR(50) DEFAULT 'H.264' CHECK (sub_stream_encoding IN ('H.264', 'H.265')),
  
  -- 分辨率、帧率、码率
  main_stream_resolution VARCHAR(50),
  main_stream_fps INT,
  main_stream_bitrate_kbps INT,
  
  sub_stream_resolution VARCHAR(50),
  sub_stream_fps INT,
  sub_stream_bitrate_kbps INT,
  
  -- 状态
  is_online BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(nvr_id, channel_number)
);

CREATE INDEX idx_channels_nvr_id ON channels(nvr_id);
CREATE INDEX idx_channels_property_id ON channels(property_id);
CREATE INDEX idx_channels_status ON channels(status);

-- ================= 播放会话表 =================

CREATE TABLE play_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- 流媒体相关
  stream_type VARCHAR(50) DEFAULT 'sub' CHECK (stream_type IN ('main', 'sub')),
  protocol VARCHAR(50) DEFAULT 'http-flv' CHECK (protocol IN ('rtsp', 'http-flv', 'webrtc', 'hls')),
  zlm_stream_id VARCHAR(255),
  
  -- 会话管理
  token VARCHAR(255) UNIQUE,
  token_expires_at TIMESTAMP,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INT,
  
  -- 并发控制
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'playing' CHECK (status IN ('playing', 'paused', 'ended', 'error')),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_play_sessions_user_id ON play_sessions(user_id);
CREATE INDEX idx_play_sessions_channel_id ON play_sessions(channel_id);
CREATE INDEX idx_play_sessions_property_id ON play_sessions(property_id);
CREATE INDEX idx_play_sessions_is_active ON play_sessions(is_active);
CREATE INDEX idx_play_sessions_token ON play_sessions(token);
CREATE INDEX idx_play_sessions_started_at ON play_sessions(started_at DESC);

-- ================= 用户权限表 =================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- ================= 物业权限关联表 =================

CREATE TABLE user_property_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  permission_level VARCHAR(50) DEFAULT 'view' CHECK (permission_level IN ('admin', 'manage', 'view')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, property_id)
);

CREATE INDEX idx_user_property_permissions_user_id ON user_property_permissions(user_id);
CREATE INDEX idx_user_property_permissions_property_id ON user_property_permissions(property_id);

-- ================= 审计日志表 =================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  details JSONB,
  ip_address INET,
  user_agent VARCHAR(512),
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_property_id ON audit_logs(property_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_details ON audit_logs USING GIN (details);

-- ================= 流媒体代理表 =================

CREATE TABLE zlm_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  stream_id VARCHAR(255) UNIQUE NOT NULL,
  stream_app VARCHAR(100) DEFAULT 'live',
  stream_name VARCHAR(255),
  protocol VARCHAR(50),
  src_url VARCHAR(512),
  create_time BIGINT,
  duration BIGINT,
  reader_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zlm_streams_channel_id ON zlm_streams(channel_id);
CREATE INDEX idx_zlm_streams_stream_id ON zlm_streams(stream_id);
CREATE INDEX idx_zlm_streams_is_active ON zlm_streams(is_active);

-- ================= 健康检查记录表 =================

CREATE TABLE health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nvr_id UUID REFERENCES nvrs(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  check_type VARCHAR(50) CHECK (check_type IN ('ping', 'rtsp_probe', 'http_probe', 'stream_test')),
  result VARCHAR(20) CHECK (result IN ('success', 'failure', 'timeout')),
  latency_ms INT,
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_health_checks_nvr_id ON health_checks(nvr_id);
CREATE INDEX idx_health_checks_channel_id ON health_checks(channel_id);
CREATE INDEX idx_health_checks_property_id ON health_checks(property_id);
CREATE INDEX idx_health_checks_created_at ON health_checks(created_at DESC);

-- ================= 运维告警表 =================

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  nvr_id UUID REFERENCES nvrs(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_property_id ON alerts(property_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_is_resolved ON alerts(is_resolved);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- ================= 初始化默认用户 =================

INSERT INTO users (username, email, password_hash, role, status) 
VALUES (
  'admin',
  'admin@smartcam.local',
  -- bcrypt hash of 'admin123', should be regenerated in production
  '$2a$12$R9h7cIPz0gi.URNNW3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jKMm2',
  'admin',
  'active'
) ON CONFLICT (username) DO NOTHING;

-- ================= 视图 =================

-- 摄像头详细信息视图
CREATE OR REPLACE VIEW v_channel_details AS
SELECT 
  c.id,
  c.channel_number,
  c.name,
  c.location,
  p.id as property_id,
  p.name as property_name,
  n.id as nvr_id,
  n.name as nvr_name,
  n.brand,
  n.ip_address,
  c.sub_stream_encoding,
  c.sub_stream_bitrate_kbps,
  c.is_online,
  c.status
FROM channels c
JOIN nvrs n ON c.nvr_id = n.id
JOIN properties p ON c.property_id = p.id;

-- 物业概览视图
CREATE OR REPLACE VIEW v_property_overview AS
SELECT 
  p.id,
  p.name,
  p.status,
  COUNT(DISTINCT n.id) as nvr_count,
  COUNT(DISTINCT c.id) as channel_count,
  COUNT(DISTINCT CASE WHEN c.is_online = false THEN c.id END) as offline_channels,
  COUNT(DISTINCT CASE WHEN ps.id IS NOT NULL AND ps.is_active THEN ps.id END) as active_sessions,
  MAX(ps.started_at) as last_play_time
FROM properties p
LEFT JOIN nvrs n ON p.id = n.property_id
LEFT JOIN channels c ON p.id = c.property_id
LEFT JOIN play_sessions ps ON p.id = ps.property_id
GROUP BY p.id, p.name, p.status;

-- ================= 时间戳触发器 =================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_properties_timestamp BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_nvrs_timestamp BEFORE UPDATE ON nvrs
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_channels_timestamp BEFORE UPDATE ON channels
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_users_timestamp BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_zlm_streams_timestamp BEFORE UPDATE ON zlm_streams
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_alerts_timestamp BEFORE UPDATE ON alerts
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ================= 初始化完成 =================

\echo 'SmartCam MVP 数据库初始化完成'
\echo '✓ 已创建所有表'
\echo '✓ 已创建索引'
\echo '✓ 已创建视图'
\echo '✓ 已创建触发器'
\echo '✓ 已创建默认用户 (admin / admin123)'
