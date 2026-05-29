package models

import (
	"time"

	"github.com/google/uuid"
	gorm "github.com/jinzhu/gorm"
)

// BaseModel provides common fields for GORM models
type BaseModel struct {
	ID        uuid.UUID  `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"deleted_at,omitempty"`
}

// BeforeCreate will set a UUID rather than relying on the DB
func (base *BaseModel) BeforeCreate(scope *gorm.Scope) error {
	if base.ID == uuid.Nil {
		return scope.SetColumn("ID", uuid.New())
	}
	return nil
}

// Property represents a property/tenant
type Property struct {
	BaseModel
	Name                   string `gorm:"type:varchar(255);not null;unique" json:"name"`
	Description            string `gorm:"type:text" json:"description,omitempty"`
	Address                string `gorm:"type:varchar(255)" json:"address,omitempty"`
	ContactPerson          string `gorm:"type:varchar(100)" json:"contact_person,omitempty"`
	ContactPhone           string `gorm:"type:varchar(20)" json:"contact_phone,omitempty"`
	UplinkBandwidthMbps    int    `gorm:"type:integer" json:"uplink_bandwidth_mbps,omitempty"`
	MaxConcurrentStreams   int    `gorm:"type:integer;default:50" json:"max_concurrent_streams"`
	Status                 string `gorm:"type:varchar(20);default:active" json:"status"` // active/inactive/maintenance
}

// NVR represents an NVR device
type NVR struct {
	BaseModel
	PropertyID         uuid.UUID  `gorm:"type:uuid;not null" json:"property_id"`
	Name               string     `gorm:"type:varchar(255);not null" json:"name"`
	Brand              string     `gorm:"type:varchar(100);not null" json:"brand"` // hikvision/dahua/uniview/onvif/other
	Model              string     `gorm:"type:varchar(100)" json:"model,omitempty"`
	FirmwareVersion    string     `gorm:"type:varchar(50)" json:"firmware_version,omitempty"`
	IPAddress          string     `gorm:"type:inet;not null" json:"ip_address"`
	RTSPPort           int        `gorm:"type:integer;default:554" json:"rtsp_port"`
	HTTPPort           int        `gorm:"type:integer;default:80" json:"http_port"`
	Username           string     `gorm:"type:varchar(100);not null" json:"username"`
	PasswordEncrypted  string     `gorm:"type:varchar(255)" json:"-"` // bcrypt hash
	MaxBandwidthMbps   int        `gorm:"type:integer" json:"max_bandwidth_mbps,omitempty"`
	ChannelCount       int        `gorm:"type:integer;not null" json:"channel_count"`
	SupportH264        bool       `gorm:"default:true" json:"support_h264"`
	SupportH265        bool       `gorm:"default:false" json:"support_h265"`
	IsOnline           bool       `gorm:"default:true" json:"is_online"`
	LastHeartbeat      *time.Time `json:"last_heartbeat,omitempty"`
	Status             string     `gorm:"type:varchar(20);default:active" json:"status"`

	Property           Property   `gorm:"foreignkey:PropertyID" json:"-"`
	Channels           []Channel  `json:"channels,omitempty"`
}

// Channel represents a camera channel on an NVR
type Channel struct {
	BaseModel
	NVRID                  uuid.UUID  `gorm:"type:uuid;not null" json:"nvr_id"`
	PropertyID             uuid.UUID  `gorm:"type:uuid;not null" json:"property_id"`
	ChannelNumber          int        `gorm:"type:integer;not null" json:"channel_number"` // 101, 102 etc.
	Name                   string     `gorm:"type:varchar(255);not null" json:"name"`
	Location               string     `gorm:"type:varchar(255)" json:"location,omitempty"`
	RTSPMainURLTemplate    string     `gorm:"type:varchar(512)" json:"rtsp_main_url_template,omitempty"`
	RTSPSubURLTemplate     string     `gorm:"type:varchar(512)" json:"rtsp_sub_url_template,omitempty"`
	MainStreamEncoding     string     `gorm:"type:varchar(50);default:H.264" json:"main_stream_encoding,omitempty"`
	SubStreamEncoding      string     `gorm:"type:varchar(50);default:H.264" json:"sub_stream_encoding,omitempty"`
	MainStreamResolution   string     `gorm:"type:varchar(50)" json:"main_stream_resolution,omitempty"` // e.g., "1920x1080"
	MainStreamFPS          int        `gorm:"type:integer" json:"main_stream_fps,omitempty"`
	MainStreamBitrateKbps  int        `gorm:"type:integer" json:"main_stream_bitrate_kbps,omitempty"`
	SubStreamResolution    string     `gorm:"type:varchar(50)" json:"sub_stream_resolution,omitempty"`
	SubStreamFPS           int        `gorm:"type:integer" json:"sub_stream_fps,omitempty"`
	SubStreamBitrateKbps   int        `gorm:"type:integer" json:"sub_stream_bitrate_kbps,omitempty"`
	IsOnline               bool       `gorm:"default:true" json:"is_online"`
	LastHeartbeat          *time.Time `json:"last_heartbeat,omitempty"`
	Status                 string     `gorm:"type:varchar(20);default:active" json:"status"`

	NVR                    NVR        `gorm:"foreignkey:NVRID" json:"-"`
	Property               Property   `gorm:"foreignkey:PropertyID" json:"-"`
}

// PlaySession records a playback session
type PlaySession struct {
	BaseModel
	UserID                 uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"`
	ChannelID              uuid.UUID  `gorm:"type:uuid;not null" json:"channel_id"`
	PropertyID             uuid.UUID  `gorm:"type:uuid;not null" json:"property_id"`
	StreamType             string     `gorm:"type:varchar(50);default:sub" json:"stream_type"` // main/sub
	Protocol               string     `gorm:"type:varchar(50);default:http-flv" json:"protocol"` // rtsp/http-flv/webrtc/hls
	ZLMStreamID            string     `gorm:"type:varchar(255)" json:"zlm_stream_id,omitempty"`
	Token                  string     `gorm:"type:varchar(255);unique" json:"token,omitempty"`
	TokenExpiresAt         *time.Time `json:"token_expires_at,omitempty"`
	StartedAt              time.Time  `gorm:"default:now()" json:"started_at"`
	EndedAt                *time.Time `json:"ended_at,omitempty"`
	DurationSeconds        int        `gorm:"type:integer" json:"duration_seconds,omitempty"`
	IsActive               bool       `gorm:"default:true" json:"is_active"`
	Status                 string     `gorm:"type:varchar(20);default:playing" json:"status"`

	User                   User       `gorm:"foreignkey:UserID" json:"-"`
	Channel                Channel    `gorm:"foreignkey:ChannelID" json:"-"`
	Property               Property   `gorm:"foreignkey:PropertyID" json:"-"`
}

// User represents a system user
type User struct {
	BaseModel
	Username               string `gorm:"type:varchar(100);not null;unique" json:"username"`
	Email                  string `gorm:"type:varchar(255)" json:"email,omitempty"`
	PasswordHash           string `gorm:"type:varchar(255);not null" json:"-"` // bcrypt hash
	Role                   string `gorm:"type:varchar(50);default:viewer" json:"role"` // admin/manager/operator/viewer
	Status                 string `gorm:"type:varchar(20);default:active" json:"status"`
}

// UserPropertyPermission defines user's access level to a specific property
type UserPropertyPermission struct {
	BaseModel
	UserID                 uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	PropertyID             uuid.UUID `gorm:"type:uuid;not null" json:"property_id"`
	PermissionLevel        string    `gorm:"type:varchar(50);default:view" json:"permission_level"` // admin/manage/view

	User                   User      `gorm:"foreignkey:UserID" json:"-"`
	Property               Property  `gorm:"foreignkey:PropertyID" json:"-"`
}

// AuditLog records key operations for compliance
type AuditLog struct {
	BaseModel
	UserID                 *uuid.UUID `gorm:"type:uuid" json:"user_id,omitempty"`
	Action                 string     `gorm:"type:varchar(100);not null" json:"action"` // play, stop, configure, delete
	ResourceType           string     `gorm:"type:varchar(100)" json:"resource_type,omitempty"` // channel, property, user
	ResourceID             *uuid.UUID `gorm:"type:uuid" json:"resource_id,omitempty"`
	PropertyID             *uuid.UUID `gorm:"type:uuid" json:"property_id,omitempty"`
	ChannelID              *uuid.UUID `gorm:"type:uuid" json:"channel_id,omitempty"`
	Details                string     `gorm:"type:jsonb" json:"details,omitempty"` // JSONB string
	IPAddress              string     `gorm:"type:inet" json:"ip_address,omitempty"`
	UserAgent              string     `gorm:"type:varchar(512)" json:"user_agent,omitempty"`
	Status                 string     `gorm:"type:varchar(20);default:success" json:"status"` // success/failure
}

// ZLMStream tracks ZLMediaKit proxy streams
type ZLMStream struct {
	BaseModel
	ChannelID              uuid.UUID  `gorm:"type:uuid;not null" json:"channel_id"`
	StreamID               string     `gorm:"type:varchar(255);unique;not null" json:"stream_id"`
	StreamApp              string     `gorm:"type:varchar(100);default:live" json:"stream_app"`
	StreamName             string     `gorm:"type:varchar(255)" json:"stream_name,omitempty"`
	Protocol               string     `gorm:"type:varchar(50)" json:"protocol,omitempty"`
	SrcURL                 string     `gorm:"type:varchar(512)" json:"src_url,omitempty"`
	CreateTime             int64      `gorm:"type:bigint" json:"create_time,omitempty"`
	Duration               int64      `gorm:"type:bigint" json:"duration,omitempty"`
	ReaderCount            int        `gorm:"type:integer;default:0" json:"reader_count"`
	IsActive               bool       `gorm:"default:true" json:"is_active"`
	LastActivity           time.Time  `gorm:"default:now()" json:"last_activity"`

	Channel                Channel    `gorm:"foreignkey:ChannelID" json:"-"`
}

// HealthCheck records results of health monitoring
type HealthCheck struct {
	BaseModel
	NVRID                  *uuid.UUID `gorm:"type:uuid" json:"nvr_id,omitempty"`
	ChannelID              *uuid.UUID `gorm:"type:uuid" json:"channel_id,omitempty"`
	PropertyID             uuid.UUID  `gorm:"type:uuid;not null" json:"property_id"`
	CheckType              string     `gorm:"type:varchar(50)" json:"check_type"` // ping/rtsp_probe/http_probe/stream_test
	Result                 string     `gorm:"type:varchar(20)" json:"result"`     // success/failure/timeout
	LatencyMs              int        `gorm:"type:integer" json:"latency_ms,omitempty"`
	ErrorMessage           string     `gorm:"type:text" json:"error_message,omitempty"`
}

// Alert stores operational alerts
type Alert struct {
	BaseModel
	PropertyID             uuid.UUID  `gorm:"type:uuid;not null" json:"property_id"`
	NVRID                  *uuid.UUID `gorm:"type:uuid" json:"nvr_id,omitempty"`
	ChannelID              *uuid.UUID `gorm:"type:uuid" json:"channel_id,omitempty"`
	AlertType              string     `gorm:"type:varchar(100)" json:"alert_type"` // offline/stream_fail/bandwidth_exceed
	Severity               string     `gorm:"type:varchar(20);default:info" json:"severity"` // critical/high/medium/low/info
	Title                  string     `gorm:"type:varchar(255)" json:"title"`
	Description            string     `gorm:"type:text" json:"description,omitempty"`
	IsResolved             bool       `gorm:"default:false" json:"is_resolved"`
	ResolvedAt             *time.Time `json:"resolved_at,omitempty"`
}
