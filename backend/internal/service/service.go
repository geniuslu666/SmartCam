package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
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
func (s *Service) GetProperties(offset, limit int) ([]models.Property, int, *errors.APIError) {
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

// UpdateNVR updates an existing NVR
func (s *Service) UpdateNVR(nvr *models.NVR) *errors.APIError {
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
	template := channel.RTSPSubURLTemplate
	if streamType == "main" {
		template = channel.RTSPMainURLTemplate
	}
	return utils.GenerateRTSPURL(template, nvr.Username, nvr.PasswordEncrypted, nvr.IPAddress, nvr.RTSPPort, channel.ChannelNumber)
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
