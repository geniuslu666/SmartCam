package service

import (
	"crypto/md5"  //nolint:gosec // Digest auth requires MD5 per RFC 2617
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/smartcam/backend/internal/models"
	"github.com/smartcam/backend/internal/repository"
	"github.com/smartcam/backend/pkg/config"
	"github.com/smartcam/backend/pkg/errors"
	"github.com/smartcam/backend/pkg/utils"
	"go.uber.org/zap"
)

// Service struct holds repository and logger instances
type Service struct {
	Repo *repository.Repository
	Log  *zap.SugaredLogger
	Cfg  *config.Config
}

// NewService creates a new service instance
func NewService(repo *repository.Repository, log *zap.SugaredLogger, cfg *config.Config) *Service {
	return &Service{
		Repo: repo,
		Log:  log,
		Cfg:  cfg,
	}
}

// AuthenticateUser authenticates a user and returns a JWT token
func (s *Service) AuthenticateUser(username, password string) (string, *models.User, *errors.APIError) {
	user, err := s.Repo.GetUserByUsername(username)
	if err != nil {
		s.Log.Errorw("Failed to get user by username", "username", username, "error", err)
		return "", nil, errors.ErrInternalServerError
	}

	if user == nil || !utils.CheckPasswordHash(password, user.PasswordHash) {
		return "", nil, errors.NewAPIError(401, "用户名或密码错误", "invalid credentials")
	}

	// Generate JWT token (simplified for now)
	token, err := utils.GenerateRandomToken(32) // Replace with actual JWT generation
	if err != nil {
		s.Log.Errorw("Failed to generate token", "error", err)
		return "", nil, errors.ErrInternalServerError
	}

	return token, user, nil
}

// GetUserProfile retrieves user profile by ID
func (s *Service) GetUserProfile(userID uuid.UUID) (*models.User, *errors.APIError) {
	user, err := s.Repo.GetUserByID(userID)
	if err != nil {
		s.Log.Errorw("Failed to get user by ID", "user_id", userID, "error", err)
		return nil, errors.ErrInternalServerError
	}
	if user == nil {
		return nil, errors.ErrNotFound
	}
	return user, nil
}

// CreateProperty creates a new property
func (s *Service) CreateProperty(property *models.Property) (*models.Property, *errors.APIError) {
	if err := s.Repo.CreateProperty(property); err != nil {
		s.Log.Errorw("Failed to create property", "property_name", property.Name, "error", err)
		return nil, errors.ErrInternalServerError
	}
	return property, nil
}

// GetPropertyByID retrieves a property by ID
func (s *Service) GetPropertyByID(id uuid.UUID) (*models.Property, *errors.APIError) {
	property, err := s.Repo.GetPropertyByID(id)
	if err != nil {
		s.Log.Errorw("Failed to get property by ID", "property_id", id, "error", err)
		return nil, errors.ErrInternalServerError
	}
	if property == nil {
		return nil, errors.ErrNotFound
	}
	return property, nil
}

// GetProperties retrieves a list of properties
func (s *Service) GetProperties(offset, limit int) ([]models.PropertyOverview, int, *errors.APIError) {
	properties, total, err := s.Repo.GetProperties(offset, limit)
	if err != nil {
		s.Log.Errorw("Failed to get properties", "error", err)
		return nil, 0, errors.ErrInternalServerError
	}
	return properties, total, nil
}

// UpdateProperty updates an existing property
func (s *Service) UpdateProperty(property *models.Property) *errors.APIError {
	if err := s.Repo.UpdateProperty(property); err != nil {
		s.Log.Errorw("Failed to update property", "property_id", property.ID, "error", err)
		return errors.ErrInternalServerError
	}
	return nil
}

// DeleteProperty deletes a property
func (s *Service) DeleteProperty(id uuid.UUID) *errors.APIError {
	if err := s.Repo.DeleteProperty(id); err != nil {
		s.Log.Errorw("Failed to delete property", "property_id", id, "error", err)
		return errors.ErrInternalServerError
	}
	return nil
}

// CreateNVR creates a new NVR and performs an initial connection test
func (s *Service) CreateNVR(nvr *models.NVR, password string) (*models.NVR, *errors.APIError) {
	// Hash password
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		s.Log.Errorw("Failed to hash NVR password", "error", err)
		return nil, errors.ErrInternalServerError
	}
	nvr.PasswordEncrypted = hashedPassword

	// TODO: Perform actual NVR connection test here

	if err := s.Repo.CreateNVR(nvr); err != nil {
		s.Log.Errorw("Failed to create NVR", "nvr_name", nvr.Name, "error", err)
		return nil, errors.ErrInternalServerError
	}
	return nvr, nil
}

// GetNVRsByPropertyID retrieves NVRs by property ID
func (s *Service) GetNVRsByPropertyID(propertyID uuid.UUID) ([]models.NVR, *errors.APIError) {
	nvrs, err := s.Repo.GetNVRsByPropertyID(propertyID)
	if err != nil {
		s.Log.Errorw("Failed to get NVRs by property ID", "property_id", propertyID, "error", err)
		return nil, errors.ErrInternalServerError
	}
	return nvrs, nil
}

// GetNVRByID retrieves an NVR by ID
func (s *Service) GetNVRByID(id uuid.UUID) (*models.NVR, *errors.APIError) {
	nvr, err := s.Repo.GetNVRByID(id)
	if err != nil {
		s.Log.Errorw("Failed to get NVR by ID", "nvr_id", id, "error", err)
		return nil, errors.ErrInternalServerError
	}
	if nvr == nil {
		return nil, errors.ErrNotFound
	}
	return nvr, nil
}

// UpdateNVR updates an existing NVR (password unchanged).
func (s *Service) UpdateNVR(nvr *models.NVR) *errors.APIError {
	if err := s.Repo.UpdateNVR(nvr); err != nil {
		s.Log.Errorw("Failed to update NVR", "nvr_id", nvr.ID, "error", err)
		return errors.ErrInternalServerError
	}
	return nil
}

// UpdateNVRWithPassword updates an NVR and optionally rotates the password.
// If newPassword is empty the existing stored password is preserved.
func (s *Service) UpdateNVRWithPassword(nvr *models.NVR, newPassword string) *errors.APIError {
	if newPassword != "" {
		hashed, err := utils.HashPassword(newPassword)
		if err != nil {
			return errors.ErrInternalServerError
		}
		nvr.PasswordEncrypted = hashed
	} else {
		// Preserve the existing password — fetch it to avoid wiping with an empty string
		existing, err := s.Repo.GetNVRByID(nvr.ID)
		if err != nil || existing == nil {
			return errors.ErrNotFound
		}
		nvr.PasswordEncrypted = existing.PasswordEncrypted
	}
	if err := s.Repo.UpdateNVR(nvr); err != nil {
		s.Log.Errorw("Failed to update NVR", "nvr_id", nvr.ID, "error", err)
		return errors.ErrInternalServerError
	}
	return nil
}

// DeleteNVR deletes an NVR
func (s *Service) DeleteNVR(id uuid.UUID) *errors.APIError {
	if err := s.Repo.DeleteNVR(id); err != nil {
		s.Log.Errorw("Failed to delete NVR", "nvr_id", id, "error", err)
		return errors.ErrInternalServerError
	}
	return nil
}

// CreateChannel creates a new channel (simplified RTSP template for Hikvision)
func (s *Service) CreateChannel(channel *models.Channel) (*models.Channel, *errors.APIError) {
	// TODO: Auto-generate RTSP templates based on NVR brand/model
	// For Hikvision, default templates:
	// Main stream: rtsp://{username}:{password}@{ip}:{port}/Streaming/channels/{channel_number}01
	// Sub stream:  rtsp://{username}:{password}@{ip}:{port}/Streaming/channels/{channel_number}02

	if channel.RTSPMainURLTemplate == "" {
		channel.RTSPMainURLTemplate = "rtsp://{username}:{password}@{ip}:{port}/Streaming/channels/{channel_number}01"
	}
	if channel.RTSPSubURLTemplate == "" {
		channel.RTSPSubURLTemplate = "rtsp://{username}:{password}@{ip}:{port}/Streaming/channels/{channel_number}02"
	}

	if err := s.Repo.CreateChannel(channel); err != nil {
		s.Log.Errorw("Failed to create channel", "channel_name", channel.Name, "error", err)
		return nil, errors.ErrInternalServerError
	}
	return channel, nil
}

// GetChannelsByPropertyID retrieves channels by property ID
func (s *Service) GetChannelsByPropertyID(propertyID uuid.UUID) ([]models.Channel, *errors.APIError) {
	channels, err := s.Repo.GetChannelsByPropertyID(propertyID)
	if err != nil {
		s.Log.Errorw("Failed to get channels by property ID", "property_id", propertyID, "error", err)
		return nil, errors.ErrInternalServerError
	}
	return channels, nil
}

// GetChannels retrieves a paginated list of channels.
func (s *Service) GetChannels(offset, limit int) ([]models.Channel, int, *errors.APIError) {
	channels, total, err := s.Repo.GetChannels(offset, limit)
	if err != nil {
		s.Log.Errorw("Failed to get channels", "error", err)
		return nil, 0, errors.ErrInternalServerError
	}
	return channels, total, nil
}

// GetChannelByID retrieves a channel by ID
func (s *Service) GetChannelByID(id uuid.UUID) (*models.Channel, *errors.APIError) {
	channel, err := s.Repo.GetChannelByID(id)
	if err != nil {
		s.Log.Errorw("Failed to get channel by ID", "channel_id", id, "error", err)
		return nil, errors.ErrInternalServerError
	}
	if channel == nil {
		return nil, errors.ErrNotFound
	}
	return channel, nil
}

// UpdateChannel updates an existing channel
func (s *Service) UpdateChannel(channel *models.Channel) *errors.APIError {
	if err := s.Repo.UpdateChannel(channel); err != nil {
		s.Log.Errorw("Failed to update channel", "channel_id", channel.ID, "error", err)
		return errors.ErrInternalServerError
	}
	return nil
}

// DeleteChannel deletes a channel
func (s *Service) DeleteChannel(id uuid.UUID) *errors.APIError {
	if err := s.Repo.DeleteChannel(id); err != nil {
		s.Log.Errorw("Failed to delete channel", "channel_id", id, "error", err)
		return errors.ErrInternalServerError
	}
	return nil
}

// CreatePlaySession creates a new play session
func (s *Service) CreatePlaySession(session *models.PlaySession) (*models.PlaySession, *errors.APIError) {
	channel, err := s.Repo.GetChannelByID(session.ChannelID)
	if err != nil {
		s.Log.Errorw("Failed to get channel for play session", "channel_id", session.ChannelID, "error", err)
		return nil, errors.ErrInternalServerError
	}
	if channel == nil {
		return nil, errors.ErrNotFound
	}

	nvr, err := s.Repo.GetNVRByID(channel.NVRID)
	if err != nil {
		s.Log.Errorw("Failed to get NVR for play session", "nvr_id", channel.NVRID, "error", err)
		return nil, errors.ErrInternalServerError
	}
	if nvr == nil {
		return nil, errors.ErrNotFound
	}

	user, err := s.Repo.GetUserByUsername("admin")
	if err != nil || user == nil {
		s.Log.Errorw("Failed to get default admin user for play session", "error", err)
		return nil, errors.ErrInternalServerError
	}

	// Generate token and set expiry
	token, err := utils.GenerateRandomToken(16)
	if err != nil {
		s.Log.Errorw("Failed to generate session token", "error", err)
		return nil, errors.ErrInternalServerError
	}
	session.Token = token
	session.UserID = user.ID
	session.PropertyID = channel.PropertyID
	expiresAt := time.Now().Add(time.Duration(s.Cfg.Play.SessionTimeoutSeconds) * time.Second)
	session.TokenExpiresAt = &expiresAt

	channelKey := strings.ReplaceAll(channel.ID.String(), "-", "")
	streamID := fmt.Sprintf("camera_%s_%s", channelKey, session.StreamType)
	session.ZLMStreamID = streamID

	if s.Cfg.ZLM.Enabled {
		sourceURL := buildRTSPURL(channel, nvr, session.StreamType)
		if err := s.addZLMPlaybackProxy(streamID, sourceURL); err != nil {
			s.Log.Errorw("Failed to add ZLM playback proxy", "stream_id", streamID, "source_url", maskRTSPPassword(sourceURL), "stream_type", session.StreamType, "error", err)
			return nil, errors.NewAPIError(502, "拉流失败", err.Error())
		}
	}

	if err := s.Repo.CreatePlaySession(session); err != nil {
		s.Log.Errorw("Failed to create play session", "channel_id", session.ChannelID, "error", err)
		return nil, errors.ErrInternalServerError
	}
	return session, nil
}

func buildRTSPURL(channel *models.Channel, nvr *models.NVR, streamType string) string {
	// Channel's own access_type takes precedence; fall back to NVR-level setting
	accessType := channel.AccessType
	if accessType == "" {
		accessType = nvr.AccessType
	}

	suffix := "01"
	if streamType == "sub" {
		suffix = "02"
	}
	switch accessType {
	case "isapi":
		return fmt.Sprintf("rtsp://%s:%s@%s:%d/ISAPI/Streaming/channels/%d%s",
			nvr.Username, nvr.PasswordEncrypted, nvr.IPAddress, nvr.RTSPPort, channel.ChannelNumber, suffix)
	case "sdk":
		return fmt.Sprintf("rtsp://%s:%s@%s:%d/Streaming/channels/%d%s",
			nvr.Username, nvr.PasswordEncrypted, nvr.IPAddress, nvr.RTSPPort, channel.ChannelNumber, suffix)
	default: // "rtsp" or empty — use the channel's configured URL template
		tmpl := channel.RTSPSubURLTemplate
		if streamType == "main" {
			tmpl = channel.RTSPMainURLTemplate
		}
		return utils.GenerateRTSPURL(tmpl, nvr.Username, nvr.PasswordEncrypted, nvr.IPAddress, nvr.RTSPPort, channel.ChannelNumber)
	}
}

// ── ISAPI / SDK stateless test & discover ─────────────────────────────────────

// NVRConnectionParams carries all params needed without a DB lookup.
// Used by the stateless test/discover endpoints so form changes are reflected
// immediately without requiring a save first.
// If Password is empty and NVRID is set, the service will look up the stored
// password — this handles edit-mode forms where the password field is blank.
type NVRConnectionParams struct {
	NVRID        string `json:"nvr_id"`      // optional: used to fetch stored password when form password is blank
	IPAddress    string `json:"ip_address"`
	RTSPPort     int    `json:"rtsp_port"`
	HTTPPort     int    `json:"http_port"`
	SDKPort      int    `json:"sdk_port"`
	AccessType   string `json:"access_type"` // rtsp | isapi | sdk
	Username     string `json:"username"`
	Password     string `json:"password"`
	ChannelCount int    `json:"channel_count"`
}

// DiscoveredChannel holds channel info returned from ISAPI/SDK discovery.
type DiscoveredChannel struct {
	ChannelNumber   int    `json:"channel_number"`
	Name            string `json:"name"`
	IsOnline        bool   `json:"is_online"`
	IPAddress       string `json:"ip_address,omitempty"`
	Model           string `json:"model,omitempty"`
	FirmwareVersion string `json:"firmware_version,omitempty"`
	Encoding        string `json:"encoding,omitempty"`
	Resolution      string `json:"resolution,omitempty"`
}

// ConnectionTestResult is returned by TestNVRConnectionByParams.
type ConnectionTestResult struct {
	Success         bool   `json:"success"`
	Message         string `json:"message"`
	DeviceName      string `json:"device_name,omitempty"`
	Model           string `json:"model,omitempty"`
	FirmwareVersion string `json:"firmware_version,omitempty"`
	SerialNumber    string `json:"serial_number,omitempty"`
	DeviceType      string `json:"device_type,omitempty"`
	ChannelCount    int    `json:"channel_count,omitempty"`
	LatencyMs       int64  `json:"latency_ms,omitempty"`
}

// ── isapi XML structs ─────────────────────────────────────────────────────────

type isapiDeviceInfo struct {
	DeviceName      string `xml:"deviceName"`
	Model           string `xml:"model"`
	SerialNumber    string `xml:"serialNumber"`
	FirmwareVersion string `xml:"firmwareVersion"`
	DeviceType      string `xml:"deviceType"`
	HardwareVersion string `xml:"hardwareVersion"`
}

type isapiInputProxyChannel struct {
	ID   int    `xml:"id"`
	Name string `xml:"name"`
}
type isapiInputProxyChannelList struct {
	Channels []isapiInputProxyChannel `xml:"InputProxyChannel"`
}

type isapiChannelStatus struct {
	ID              int    `xml:"id"`
	Online          string `xml:"online"`
	IPAddress       string `xml:"ipAddress"`
	DeviceModelName string `xml:"deviceModelName"`
	FirmwareVersion string `xml:"deviceFirmwareVersion"`
}
type isapiChannelStatusList struct {
	Items []isapiChannelStatus `xml:"InputProxyChannelStatus"`
}

type isapiVideo struct {
	CodecType  string `xml:"videoCodecType"`
	ResWidth   int    `xml:"videoResolutionWidth"`
	ResHeight  int    `xml:"videoResolutionHeight"`
}
type isapiStreamingChannel struct {
	ID      int        `xml:"id"`
	ChName  string     `xml:"channelName"`
	Enabled bool       `xml:"enabled"`
	Video   isapiVideo `xml:"Video"`
}
type isapiStreamingChannelList struct {
	Channels []isapiStreamingChannel `xml:"StreamingChannel"`
}

// ── low-level ISAPI HTTP helper (Digest + Basic fallback) ────────────────────

// isapiGet issues a GET request supporting both Digest and Basic authentication.
// Most modern Hikvision NVRs require Digest (RFC 2617); older firmware uses Basic.
func isapiGet(p NVRConnectionParams, path string) ([]byte, int, error) {
	rawURL := fmt.Sprintf("http://%s:%d%s", p.IPAddress, p.HTTPPort, path)
	client := &http.Client{Timeout: 8 * time.Second}

	// Step 1 — probe (no credentials) to obtain the WWW-Authenticate challenge
	probe, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, 0, err
	}
	r1, err := client.Do(probe)
	if err != nil {
		return nil, 0, err
	}
	wwwAuth := r1.Header.Get("WWW-Authenticate")
	r1.Body.Close()

	if r1.StatusCode != 401 {
		// No auth required (or unexpected status)
		body, _ := io.ReadAll(r1.Body)
		return body, r1.StatusCode, nil
	}

	// Step 2 — choose auth scheme
	if strings.HasPrefix(wwwAuth, "Digest ") {
		return isapiDigestGet(client, p.Username, p.Password, rawURL, path, wwwAuth)
	}
	// Fallback: Basic auth
	req, _ := http.NewRequest(http.MethodGet, rawURL, nil)
	req.SetBasicAuth(p.Username, p.Password)
	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return body, resp.StatusCode, nil
}

// isapiDigestGet performs RFC-2617 Digest authentication for a single GET.
func isapiDigestGet(client *http.Client, username, password, rawURL, path, wwwAuth string) ([]byte, int, error) {
	params := parseDigestParams(wwwAuth)
	realm := params["realm"]
	nonce := params["nonce"]
	qop := params["qop"] // typically "auth"

	// Generate cnonce
	cnonceRaw := make([]byte, 8)
	_, _ = rand.Read(cnonceRaw)
	cnonce := hex.EncodeToString(cnonceRaw)
	nc := "00000001"

	ha1 := md5hex(username + ":" + realm + ":" + password)
	ha2 := md5hex("GET:" + path)

	var digestResponse string
	if strings.Contains(qop, "auth") {
		digestResponse = md5hex(ha1 + ":" + nonce + ":" + nc + ":" + cnonce + ":auth:" + ha2)
	} else {
		digestResponse = md5hex(ha1 + ":" + nonce + ":" + ha2)
	}

	authHeader := fmt.Sprintf(
		`Digest username="%s", realm="%s", nonce="%s", uri="%s", qop=auth, nc=%s, cnonce="%s", response="%s"`,
		username, realm, nonce, path, nc, cnonce, digestResponse,
	)

	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", authHeader)
	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return body, resp.StatusCode, nil
}

func md5hex(s string) string {
	h := md5.Sum([]byte(s)) //nolint:gosec
	return hex.EncodeToString(h[:])
}

var digestParamRe = regexp.MustCompile(`(\w+)="([^"]*)"`)

func parseDigestParams(header string) map[string]string {
	params := make(map[string]string)
	for _, m := range digestParamRe.FindAllStringSubmatch(header, -1) {
		params[m[1]] = m[2]
	}
	return params
}

// ── TestNVRConnectionByParams (stateless) ────────────────────────────────────

func (s *Service) TestNVRConnectionByParams(p NVRConnectionParams) (*ConnectionTestResult, *errors.APIError) {
	// Edit-mode: form never exposes stored password → fetch it from DB
	if p.Password == "" && p.NVRID != "" {
		if id, err := uuid.Parse(p.NVRID); err == nil {
			if nvr, err := s.Repo.GetNVRByID(id); err == nil && nvr != nil {
				p.Password = nvr.PasswordEncrypted
			}
		}
	}
	start := time.Now()
	switch p.AccessType {
	case "isapi":
		return testISAPI(p, start)
	case "sdk":
		return testSDK(p, start)
	default:
		return testRTSP(p, start)
	}
}

// TestNVRConnection — legacy helper that loads from DB and delegates.
func (s *Service) TestNVRConnection(nvrID uuid.UUID) (*ConnectionTestResult, *errors.APIError) {
	nvr, err := s.Repo.GetNVRByID(nvrID)
	if err != nil || nvr == nil {
		return nil, errors.ErrNotFound
	}
	return s.TestNVRConnectionByParams(NVRConnectionParams{
		IPAddress: nvr.IPAddress, RTSPPort: nvr.RTSPPort, HTTPPort: nvr.HTTPPort,
		SDKPort: nvr.SDKPort, AccessType: nvr.AccessType,
		Username: nvr.Username, Password: nvr.PasswordEncrypted,
		ChannelCount: nvr.ChannelCount,
	})
}

func testRTSP(p NVRConnectionParams, start time.Time) (*ConnectionTestResult, *errors.APIError) {
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", p.IPAddress, p.RTSPPort), 5*time.Second)
	if err != nil {
		return &ConnectionTestResult{Success: false, Message: fmt.Sprintf("RTSP 端口 %d 不可达: %v", p.RTSPPort, err)}, nil
	}
	conn.Close()
	return &ConnectionTestResult{
		Success:   true,
		Message:   fmt.Sprintf("RTSP 端口 %d 连通", p.RTSPPort),
		LatencyMs: time.Since(start).Milliseconds(),
	}, nil
}

func testISAPI(p NVRConnectionParams, start time.Time) (*ConnectionTestResult, *errors.APIError) {
	body, status, err := isapiGet(p, "/ISAPI/System/deviceInfo")
	if err != nil {
		return &ConnectionTestResult{Success: false, Message: "ISAPI 连接失败: " + err.Error()}, nil
	}
	if status == 401 {
		return &ConnectionTestResult{Success: false, Message: "认证失败，请检查用户名和密码"}, nil
	}
	if status != 200 {
		return &ConnectionTestResult{Success: false, Message: fmt.Sprintf("ISAPI 返回 HTTP %d", status)}, nil
	}
	var info isapiDeviceInfo
	_ = xml.Unmarshal(body, &info)
	return &ConnectionTestResult{
		Success:         true,
		Message:         "ISAPI 连接成功",
		DeviceName:      info.DeviceName,
		Model:           info.Model,
		FirmwareVersion: info.FirmwareVersion,
		SerialNumber:    info.SerialNumber,
		DeviceType:      info.DeviceType,
		LatencyMs:       time.Since(start).Milliseconds(),
	}, nil
}

func testSDK(p NVRConnectionParams, start time.Time) (*ConnectionTestResult, *errors.APIError) {
	// 1. TCP probe on SDK port
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", p.IPAddress, p.SDKPort), 5*time.Second)
	if err != nil {
		return &ConnectionTestResult{Success: false, Message: fmt.Sprintf("SDK 端口 %d 不可达: %v", p.SDKPort, err)}, nil
	}
	conn.Close()
	latency := time.Since(start).Milliseconds()

	// 2. Also try ISAPI to grab device info (most Hikvision devices support both)
	body, status, isErr := isapiGet(p, "/ISAPI/System/deviceInfo")
	if isErr == nil && status == 200 {
		var info isapiDeviceInfo
		_ = xml.Unmarshal(body, &info)
		return &ConnectionTestResult{
			Success:         true,
			Message:         fmt.Sprintf("SDK 端口 %d 连通，已通过 ISAPI 获取设备信息", p.SDKPort),
			DeviceName:      info.DeviceName,
			Model:           info.Model,
			FirmwareVersion: info.FirmwareVersion,
			SerialNumber:    info.SerialNumber,
			DeviceType:      info.DeviceType,
			LatencyMs:       latency,
		}, nil
	}
	return &ConnectionTestResult{
		Success:   true,
		Message:   fmt.Sprintf("SDK 端口 %d 连通", p.SDKPort),
		LatencyMs: latency,
	}, nil
}

// ── DiscoverNVRChannelsByParams (stateless) ───────────────────────────────────

func (s *Service) DiscoverNVRChannelsByParams(p NVRConnectionParams) ([]DiscoveredChannel, *errors.APIError) {
	// Edit-mode: form never exposes stored password → fetch it from DB
	if p.Password == "" && p.NVRID != "" {
		if id, err := uuid.Parse(p.NVRID); err == nil {
			if nvr, err := s.Repo.GetNVRByID(id); err == nil && nvr != nil {
				p.Password = nvr.PasswordEncrypted
			}
		}
	}
	switch p.AccessType {
	case "isapi":
		return discoverISAPI(p)
	case "sdk":
		return discoverSDK(p)
	default:
		return nil, errors.NewAPIError(400, "RTSP 模式不支持自动发现，请手动添加通道", "unsupported")
	}
}

// DiscoverNVRChannels — legacy helper.
func (s *Service) DiscoverNVRChannels(nvrID uuid.UUID) ([]DiscoveredChannel, *errors.APIError) {
	nvr, err := s.Repo.GetNVRByID(nvrID)
	if err != nil || nvr == nil {
		return nil, errors.ErrNotFound
	}
	return s.DiscoverNVRChannelsByParams(NVRConnectionParams{
		IPAddress: nvr.IPAddress, RTSPPort: nvr.RTSPPort, HTTPPort: nvr.HTTPPort,
		SDKPort: nvr.SDKPort, AccessType: nvr.AccessType,
		Username: nvr.Username, Password: nvr.PasswordEncrypted,
		ChannelCount: nvr.ChannelCount,
	})
}

func discoverISAPI(p NVRConnectionParams) ([]DiscoveredChannel, *errors.APIError) {
	// Step 1: InputProxy channel list (NVR with IP cameras)
	body, status, err := isapiGet(p, "/ISAPI/ContentMgmt/InputProxy/channels")
	if err != nil {
		return nil, errors.NewAPIError(502, "ISAPI 连接失败: "+err.Error(), err.Error())
	}
	if status == 401 {
		return nil, errors.NewAPIError(401, "认证失败，请检查用户名和密码", "unauthorized")
	}

	var proxyList isapiInputProxyChannelList
	_ = xml.Unmarshal(body, &proxyList)

	if len(proxyList.Channels) == 0 {
		// Fallback: standalone camera — use streaming channels
		return discoverISAPIStreaming(p)
	}

	// Step 2: Channel status (online, camera IP, model, firmware)
	statusMap := fetchISAPIStatus(p)

	// Step 3: Encoding/resolution from streaming channels
	encodingMap := fetchISAPIEncoding(p)

	result := make([]DiscoveredChannel, 0, len(proxyList.Channels))
	for _, ch := range proxyList.Channels {
		st := statusMap[ch.ID]
		enc := encodingMap[ch.ID]
		name := ch.Name
		if name == "" {
			name = fmt.Sprintf("Camera %02d", ch.ID)
		}
		result = append(result, DiscoveredChannel{
			ChannelNumber:   ch.ID,
			Name:            name,
			IsOnline:        st.Online == "true",
			IPAddress:       st.IPAddress,
			Model:           st.DeviceModelName,
			FirmwareVersion: st.FirmwareVersion,
			Encoding:        enc.CodecType,
			Resolution:      fmtResolution(enc.ResWidth, enc.ResHeight),
		})
	}
	return result, nil
}

func discoverISAPIStreaming(p NVRConnectionParams) ([]DiscoveredChannel, *errors.APIError) {
	body, status, err := isapiGet(p, "/ISAPI/Streaming/channels")
	if err != nil || status != 200 {
		msg := "ISAPI Streaming 接口不可用"
		if err != nil {
			msg += ": " + err.Error()
		}
		// Last resort: stubs
		return generateStubs(p.ChannelCount), nil
	}
	var list isapiStreamingChannelList
	_ = xml.Unmarshal(body, &list)

	seen := map[int]bool{}
	var result []DiscoveredChannel
	for _, ch := range list.Channels {
		camNum := ch.ID / 100 // 101→1, 201→2
		if camNum < 1 || ch.ID%100 != 1 || seen[camNum] {
			continue
		}
		seen[camNum] = true
		name := ch.ChName
		if name == "" {
			name = fmt.Sprintf("Camera %02d", camNum)
		}
		result = append(result, DiscoveredChannel{
			ChannelNumber: camNum,
			Name:          name,
			IsOnline:      ch.Enabled,
			Encoding:      ch.Video.CodecType,
			Resolution:    fmtResolution(ch.Video.ResWidth, ch.Video.ResHeight),
		})
	}
	if len(result) == 0 {
		return generateStubs(p.ChannelCount), nil
	}
	return result, nil
}

func discoverSDK(p NVRConnectionParams) ([]DiscoveredChannel, *errors.APIError) {
	// 1. Verify SDK port reachable
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", p.IPAddress, p.SDKPort), 4*time.Second)
	if err != nil {
		return nil, errors.NewAPIError(502, fmt.Sprintf("SDK 端口 %d 不可达，请检查防火墙或端口配置", p.SDKPort), err.Error())
	}
	conn.Close()

	// 2. Try ISAPI for rich channel data (most Hikvision devices support both)
	isAPIResult, isAPIErr := discoverISAPI(p)
	if isAPIErr == nil && len(isAPIResult) > 0 {
		return isAPIResult, nil
	}

	// 3. Fallback: stubs from channel_count
	return generateStubs(p.ChannelCount), nil
}

// ── ISAPI fetch helpers ───────────────────────────────────────────────────────

func fetchISAPIStatus(p NVRConnectionParams) map[int]isapiChannelStatus {
	m := map[int]isapiChannelStatus{}
	body, status, err := isapiGet(p, "/ISAPI/ContentMgmt/InputProxy/channels/status")
	if err != nil || status != 200 {
		return m
	}
	var list isapiChannelStatusList
	_ = xml.Unmarshal(body, &list)
	for _, item := range list.Items {
		m[item.ID] = item
	}
	return m
}

func fetchISAPIEncoding(p NVRConnectionParams) map[int]isapiVideo {
	m := map[int]isapiVideo{}
	body, status, err := isapiGet(p, "/ISAPI/Streaming/channels")
	if err != nil || status != 200 {
		return m
	}
	var list isapiStreamingChannelList
	_ = xml.Unmarshal(body, &list)
	for _, ch := range list.Channels {
		camNum := ch.ID / 100
		if camNum < 1 || ch.ID%100 != 1 {
			continue // only main stream entries
		}
		m[camNum] = ch.Video
	}
	return m
}

func fmtResolution(w, h int) string {
	if w == 0 || h == 0 {
		return ""
	}
	return fmt.Sprintf("%dx%d", w, h)
}

func generateStubs(count int) []DiscoveredChannel {
	result := make([]DiscoveredChannel, 0, count)
	for i := 1; i <= count; i++ {
		result = append(result, DiscoveredChannel{
			ChannelNumber: i,
			Name:          fmt.Sprintf("Camera %02d", i),
			IsOnline:      false,
		})
	}
	return result
}

func (s *Service) addZLMPlaybackProxy(streamID, sourceURL string) error {
	return s.addZLMStreamProxy(streamID, sourceURL)
}

func (s *Service) addZLMStreamProxy(streamID, sourceURL string) error {
	apiURL, err := url.Parse(strings.TrimRight(s.Cfg.ZLM.APIURL, "/") + "/index/api/addStreamProxy")
	if err != nil {
		return err
	}

	query := apiURL.Query()
	query.Set("secret", s.Cfg.ZLM.Secret)
	apiURL.RawQuery = query.Encode()

	form := url.Values{}
	form.Set("vhost", "__defaultVhost__")
	form.Set("app", "live")
	form.Set("stream", streamID)
	form.Set("url", sourceURL)
	form.Set("enable_audio", "0")
	form.Set("enable_hls", "1")
	form.Set("enable_mp4", "0")
	form.Set("rtp_type", "0") // RTSP over TCP avoids UDP packet loss corrupting H.264/H.265 metadata.

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest(http.MethodPost, apiURL.String(), strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var result struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}
	if result.Code != 0 {
		msg := result.Msg
		if msg == "" {
			msg = fmt.Sprintf("ZLM addStreamProxy returned code %d", result.Code)
		}
		if strings.Contains(strings.ToLower(msg), "already exists") {
			return nil
		}
		return fmt.Errorf("%s", msg)
	}
	return nil
}

func maskRTSPPassword(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.User == nil {
		return rawURL
	}
	username := parsed.User.Username()
	parsed.User = url.UserPassword(username, "***")
	return parsed.String()
}

// GetPlaySessionByID retrieves a play session by ID
func (s *Service) GetPlaySessionByID(id uuid.UUID) (*models.PlaySession, *errors.APIError) {
	session, err := s.Repo.GetPlaySessionByID(id)
	if err != nil {
		s.Log.Errorw("Failed to get play session by ID", "session_id", id, "error", err)
		return nil, errors.ErrInternalServerError
	}
	if session == nil {
		return nil, errors.ErrNotFound
	}
	return session, nil
}

// EndPlaySession ends a play session
func (s *Service) EndPlaySession(id uuid.UUID) *errors.APIError {
	if err := s.Repo.EndPlaySession(id); err != nil {
		s.Log.Errorw("Failed to end play session", "session_id", id, "error", err)
		return errors.ErrInternalServerError
	}
	return nil
}

// ── Brand templates ───────────────────────────────────────────────────────────

func (s *Service) GetBrandTemplates() ([]models.BrandTemplate, *errors.APIError) {
	list, err := s.Repo.GetBrandTemplates()
	if err != nil {
		return nil, errors.ErrInternalServerError
	}
	return list, nil
}

func (s *Service) CreateBrandTemplate(t *models.BrandTemplate) (*models.BrandTemplate, *errors.APIError) {
	if err := s.Repo.CreateBrandTemplate(t); err != nil {
		return nil, errors.ErrInternalServerError
	}
	return t, nil
}

func (s *Service) UpdateBrandTemplate(t *models.BrandTemplate) *errors.APIError {
	if err := s.Repo.UpdateBrandTemplate(t); err != nil {
		return errors.ErrInternalServerError
	}
	return nil
}

func (s *Service) DeleteBrandTemplate(id uuid.UUID) *errors.APIError {
	t, err := s.Repo.GetBrandTemplateByID(id)
	if err != nil || t == nil {
		return errors.ErrNotFound
	}
	if t.IsSystem {
		return errors.NewAPIError(403, "系统内置模板不允许删除", "system template")
	}
	if err := s.Repo.DeleteBrandTemplate(id); err != nil {
		return errors.ErrInternalServerError
	}
	return nil
}

// ── Users ─────────────────────────────────────────────────────────────────────

func (s *Service) GetUsers(offset, limit int) ([]models.User, int, *errors.APIError) {
	list, total, err := s.Repo.GetUsers(offset, limit)
	if err != nil {
		return nil, 0, errors.ErrInternalServerError
	}
	return list, total, nil
}

func (s *Service) CreateUser(username, password, role, email string) (*models.User, *errors.APIError) {
	hash, err := utils.HashPassword(password)
	if err != nil {
		return nil, errors.ErrInternalServerError
	}
	user := &models.User{Username: username, PasswordHash: hash, Role: role, Email: email, Status: "active"}
	if err := s.Repo.CreateUser(user); err != nil {
		return nil, errors.NewAPIError(409, "用户名已存在", err.Error())
	}
	return user, nil
}

func (s *Service) UpdateUser(id uuid.UUID, role, email, status string, newPassword string) *errors.APIError {
	user, err := s.Repo.GetUserByID(id)
	if err != nil || user == nil {
		return errors.ErrNotFound
	}
	user.Role = role
	user.Email = email
	user.Status = status
	if newPassword != "" {
		hash, err := utils.HashPassword(newPassword)
		if err != nil {
			return errors.ErrInternalServerError
		}
		user.PasswordHash = hash
	}
	if err := s.Repo.UpdateUser(user); err != nil {
		return errors.ErrInternalServerError
	}
	return nil
}

func (s *Service) DeleteUser(id uuid.UUID) *errors.APIError {
	if err := s.Repo.DeleteUser(id); err != nil {
		return errors.ErrInternalServerError
	}
	return nil
}

// ── Audit logs ────────────────────────────────────────────────────────────────

func (s *Service) GetAuditLogs(offset, limit int) ([]models.AuditLog, int, *errors.APIError) {
	list, total, err := s.Repo.GetAuditLogs(offset, limit)
	if err != nil {
		return nil, 0, errors.ErrInternalServerError
	}
	return list, total, nil
}

// QueryNVRRecordings queries recording segments from a Hikvision NVR via ISAPI.
func (s *Service) QueryNVRRecordings(channelID uuid.UUID, startTime, endTime time.Time) ([]models.RecordingSegment, *errors.APIError) {
	channel, err := s.Repo.GetChannelByID(channelID)
	if err != nil || channel == nil {
		return nil, errors.ErrNotFound
	}
	nvr, err := s.Repo.GetNVRByID(channel.NVRID)
	if err != nil || nvr == nil {
		return nil, errors.ErrNotFound
	}

	trackID := fmt.Sprintf("%d01", channel.ChannelNumber)
	reqBody := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<CMSearchDescription>
  <searchID>1</searchID>
  <trackList><trackID>%s</trackID></trackList>
  <timeSpanList>
    <timeSpan>
      <startTime>%s</startTime>
      <endTime>%s</endTime>
    </timeSpan>
  </timeSpanList>
  <maxResults>100</maxResults>
  <searchResultPostion>0</searchResultPostion>
  <metadataList>
    <metadataDescriptor>//recordType.meta.hikvision.com/videotype</metadataDescriptor>
  </metadataList>
</CMSearchDescription>`, trackID,
		startTime.UTC().Format("2006-01-02T15:04:05Z"),
		endTime.UTC().Format("2006-01-02T15:04:05Z"),
	)

	apiURL := fmt.Sprintf("http://%s:%d/ISAPI/ContentMgmt/search", nvr.IPAddress, nvr.HTTPPort)
	req, err := http.NewRequest(http.MethodPost, apiURL, strings.NewReader(reqBody))
	if err != nil {
		return nil, errors.ErrInternalServerError
	}
	req.SetBasicAuth(nvr.Username, nvr.PasswordEncrypted)
	req.Header.Set("Content-Type", "application/xml")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		s.Log.Errorw("ISAPI request failed", "nvr", nvr.IPAddress, "error", err)
		return nil, errors.NewAPIError(502, "NVR 连接失败", err.Error())
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, errors.ErrInternalServerError
	}

	// Parse Hikvision ISAPI XML response
	type timeSpan struct {
		StartTime string `xml:"startTime"`
		EndTime   string `xml:"endTime"`
	}
	type mediaDesc struct {
		CodecType string `xml:"codecType"`
	}
	type matchItem struct {
		TrackID  string    `xml:"trackID"`
		TimeSpan timeSpan  `xml:"timeSpan"`
		Media    mediaDesc `xml:"mediaSegmentDescriptor"`
	}
	type searchResult struct {
		XMLName    xml.Name    `xml:"CMSearchResult"`
		NumMatches int         `xml:"numOfMatches"`
		Items      []matchItem `xml:"matchList>searchMatchItem"`
	}

	var result searchResult
	if err := xml.Unmarshal(body, &result); err != nil {
		s.Log.Errorw("ISAPI XML parse failed", "body", string(body), "error", err)
		return nil, errors.NewAPIError(502, "NVR 响应解析失败", err.Error())
	}

	segments := make([]models.RecordingSegment, 0, len(result.Items))
	for _, item := range result.Items {
		segments = append(segments, models.RecordingSegment{
			TrackID:   item.TrackID,
			StartTime: item.TimeSpan.StartTime,
			EndTime:   item.TimeSpan.EndTime,
			CodecType: item.Media.CodecType,
		})
	}
	return segments, nil
}

// CreateRecordingSession creates a ZLM proxy session for recording playback.
func (s *Service) CreateRecordingSession(channelID uuid.UUID, protocol, recordStart, recordEnd string) (*models.PlaySession, *errors.APIError) {
	channel, err := s.Repo.GetChannelByID(channelID)
	if err != nil || channel == nil {
		return nil, errors.ErrNotFound
	}
	nvr, err := s.Repo.GetNVRByID(channel.NVRID)
	if err != nil || nvr == nil {
		return nil, errors.ErrNotFound
	}
	user, err := s.Repo.GetUserByUsername("admin")
	if err != nil || user == nil {
		return nil, errors.ErrInternalServerError
	}

	// Build Hikvision recording RTSP URL
	trackID := fmt.Sprintf("%d01", channel.ChannelNumber)
	// Convert ISO8601 to Hikvision format YYYYMMDDTHHMMSSz
	toHikTime := func(iso string) string {
		t, err := time.Parse(time.RFC3339, iso)
		if err != nil {
			return iso
		}
		return t.UTC().Format("20060102T150405Z")
	}
	rtspURL := fmt.Sprintf("rtsp://%s:%s@%s:%d/Streaming/tracks/%s?starttime=%s&endtime=%s",
		nvr.Username, nvr.PasswordEncrypted,
		nvr.IPAddress, nvr.RTSPPort,
		trackID,
		toHikTime(recordStart),
		toHikTime(recordEnd),
	)

	token, err := utils.GenerateRandomToken(16)
	if err != nil {
		return nil, errors.ErrInternalServerError
	}
	channelKey := strings.ReplaceAll(channel.ID.String(), "-", "")
	streamID := fmt.Sprintf("rec_%s_%s", channelKey, token[:8])
	expiresAt := time.Now().Add(2 * time.Hour)

	session := &models.PlaySession{
		UserID:        user.ID,
		ChannelID:     channelID,
		PropertyID:    channel.PropertyID,
		StreamType:    "main",
		Protocol:      protocol,
		ZLMStreamID:   streamID,
		Token:         token,
		TokenExpiresAt: &expiresAt,
	}

	if s.Cfg.ZLM.Enabled {
		if err := s.addZLMStreamProxy(streamID, rtspURL); err != nil {
			s.Log.Errorw("Failed to add ZLM recording proxy", "stream_id", streamID, "error", err)
			return nil, errors.NewAPIError(502, "拉流失败", err.Error())
		}
	}

	if err := s.Repo.CreatePlaySession(session); err != nil {
		return nil, errors.ErrInternalServerError
	}
	return session, nil
}
