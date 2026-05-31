package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/smartcam/backend/internal/models"
	"github.com/smartcam/backend/internal/repository"
	"github.com/smartcam/backend/internal/service"
	"github.com/smartcam/backend/pkg/config"
	"github.com/smartcam/backend/pkg/errors"
	"github.com/smartcam/backend/pkg/logger"
	"go.uber.org/zap"
)

// Handler struct holds service and logger instances
type Handler struct {
	Service *service.Service
	Log     *zap.SugaredLogger
}

// NewHandler creates a new handler instance
func NewHandler(svc *service.Service, log *zap.SugaredLogger) *Handler {
	return &Handler{
		Service: svc,
		Log:     log,
	}
}

// Setup sets up the Gin router and registers routes
func Setup() *gin.Engine {
	cfg := config.Load()
	log := logger.New()

	repo, err := repository.NewRepository(cfg, log)
	if err != nil {
		log.Fatalw("Failed to initialize repository", "error", err)
	}
	// defer repo.Close() // Consider how to handle closing DB connection gracefully

	svc := service.NewService(repo, log, cfg)
	h := NewHandler(svc, log)

	r := gin.Default()

	// Public routes
	public := r.Group("/api")
	{
		public.GET("/health", h.Health)
		public.POST("/auth/login", h.Login)
	}

	// Authenticated routes
	// auth := r.Group("/api", AuthMiddleware(h.Service, h.Log))
	auth := r.Group("/api") // For now, bypass auth middleware
	{
		auth.GET("/auth/profile", h.GetUserProfile)

		auth.GET("/properties", h.GetProperties)
		auth.GET("/properties/:id", h.GetPropertyByID)
		auth.POST("/properties", h.CreateProperty)
		auth.PUT("/properties/:id", h.UpdateProperty)
		auth.DELETE("/properties/:id", h.DeleteProperty)

		auth.GET("/properties/:id/nvrs", h.GetNVRsByPropertyID)
		auth.POST("/properties/:id/nvrs", h.CreateNVR)
		auth.GET("/nvrs/:id", h.GetNVRByID)
		auth.PUT("/nvrs/:id", h.UpdateNVR)
		auth.DELETE("/nvrs/:id", h.DeleteNVR)
		auth.POST("/nvrs/:id/test", h.TestNVRConnection)
		auth.POST("/nvrs/:id/discover", h.DiscoverNVRChannels)
		// Stateless endpoints — accept all connection params in body, no DB lookup needed
		auth.POST("/tools/nvr-test", h.TestNVRByParams)
		auth.POST("/tools/nvr-discover", h.DiscoverNVRByParams)

		auth.GET("/channels", h.GetChannels)
		auth.POST("/channels", h.CreateChannel)
		auth.GET("/channels/:id", h.GetChannelByID)
		auth.PUT("/channels/:id", h.UpdateChannel)
		auth.DELETE("/channels/:id", h.DeleteChannel)

		auth.POST("/sessions", h.CreatePlaySession)
		auth.DELETE("/sessions/:id", h.EndPlaySession)
		auth.GET("/channels/:id/recordings", h.GetChannelRecordings)
		auth.POST("/sessions/recording", h.CreateRecordingSession)

		auth.GET("/brand-templates", h.GetBrandTemplates)
		auth.POST("/brand-templates", h.CreateBrandTemplate)
		auth.PUT("/brand-templates/:id", h.UpdateBrandTemplate)
		auth.DELETE("/brand-templates/:id", h.DeleteBrandTemplate)

		auth.GET("/users", h.GetUsers)
		auth.POST("/users", h.CreateUser)
		auth.PUT("/users/:id", h.UpdateUser)
		auth.DELETE("/users/:id", h.DeleteUser)

		auth.GET("/audit-logs", h.GetAuditLogs)

		auth.GET("/health/detailed", h.DetailedHealth)
		auth.GET("/config", h.GetConfig)

		// ZLM Hooks (internal, usually not exposed directly or with different auth)
		auth.POST("/hooks/stream_not_found", h.ZLMStreamNotFound)
		auth.POST("/hooks/stream_none_reader", h.ZLMStreamNoneReader)
	}

	return r
}

// Health handles service health checks.
func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "ok",
		Data: gin.H{
			"service": "smartcam-backend",
			"zlm":     h.Service.Cfg.ZLM.Enabled,
		},
	})
}

// Response represents a generic API response
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func (h *Handler) handleError(c *gin.Context, err *errors.APIError) {
	h.Log.Errorw("API Error", "code", err.Code, "message", err.Message, "error", err.Detail)
	c.JSON(err.Code, Response{
		Code:    err.Code,
		Message: err.Message,
		Error:   err.Detail,
	})
}

// Login handles user login
func (h *Handler) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	token, user, apiErr := h.Service.AuthenticateUser(req.Username, req.Password)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data: gin.H{
			"token":      token,
			"expires_in": h.Service.Cfg.Play.SessionTimeoutSeconds,
			"user": gin.H{
				"id":       user.ID,
				"username": user.Username,
				"role":     user.Role,
			},
		},
	})
}

// GetUserProfile handles getting the current user's profile
func (h *Handler) GetUserProfile(c *gin.Context) {
	// UserID is retrieved from context by AuthMiddleware in a real app
	// For now, assume admin user
	userID, err := uuid.Parse("00000000-0000-0000-0000-000000000001") // Placeholder
	if err != nil {
		h.handleError(c, errors.ErrInternalServerError)
		return
	}

	user, apiErr := h.Service.GetUserProfile(userID)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    user,
	})
}

// GetProperties handles fetching a list of properties
func (h *Handler) GetProperties(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	offset := (page - 1) * limit

	properties, total, apiErr := h.Service.GetProperties(offset, limit)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data: gin.H{
			"total": total,
			"page":  page,
			"items": properties,
		},
	})
}

// GetPropertyByID handles fetching a single property by ID
func (h *Handler) GetPropertyByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	property, apiErr := h.Service.GetPropertyByID(id)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    property,
	})
}

// CreateProperty handles creating a new property
func (h *Handler) CreateProperty(c *gin.Context) {
	var property models.Property
	if err := c.ShouldBindJSON(&property); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	createdProperty, apiErr := h.Service.CreateProperty(&property)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusCreated, Response{
		Code:    0,
		Message: "created",
		Data:    createdProperty,
	})
}

// UpdateProperty handles updating an existing property
func (h *Handler) UpdateProperty(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	var reqProperty models.Property
	if err := c.ShouldBindJSON(&reqProperty); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	reqProperty.ID = id

	apiErr := h.Service.UpdateProperty(&reqProperty)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "updated",
	})
}

// DeleteProperty handles deleting a property
func (h *Handler) DeleteProperty(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	apiErr := h.Service.DeleteProperty(id)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "deleted",
	})
}

// GetNVRsByPropertyID handles fetching NVRs for a specific property
func (h *Handler) GetNVRsByPropertyID(c *gin.Context) {
	propertyIDStr := c.Param("id")
	propertyID, err := uuid.Parse(propertyIDStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	nvrs, apiErr := h.Service.GetNVRsByPropertyID(propertyID)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    nvrs,
	})
}

// CreateNVR handles creating a new NVR
func (h *Handler) CreateNVR(c *gin.Context) {
	propertyIDStr := c.Param("id")
	propertyID, err := uuid.Parse(propertyIDStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	var req struct {
		models.NVR
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	req.NVR.PropertyID = propertyID

	createdNVR, apiErr := h.Service.CreateNVR(&req.NVR, req.Password)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusCreated, Response{
		Code:    0,
		Message: "created",
		Data:    createdNVR,
	})
}

// GetNVRByID handles fetching a single NVR by ID
func (h *Handler) GetNVRByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	nvr, apiErr := h.Service.GetNVRByID(id)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    nvr,
	})
}

// UpdateNVR handles updating an existing NVR
func (h *Handler) UpdateNVR(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	var req struct {
		models.NVR
		Password string `json:"password"` // optional — leave blank to keep existing
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	req.NVR.ID = id

	apiErr := h.Service.UpdateNVRWithPassword(&req.NVR, req.Password)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "updated",
	})
}

// DeleteNVR handles deleting an NVR
func (h *Handler) DeleteNVR(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	apiErr := h.Service.DeleteNVR(id)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "deleted",
	})
}

// TestNVRConnection tests the connection to an NVR based on its access_type.
func (h *Handler) TestNVRConnection(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	result, apiErr := h.Service.TestNVRConnection(id)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusOK, Response{Code: 0, Message: "ok", Data: result})
}

// DiscoverNVRChannels auto-discovers channels on an NVR via ISAPI or SDK.
func (h *Handler) DiscoverNVRChannels(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	channels, apiErr := h.Service.DiscoverNVRChannels(id)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusOK, Response{Code: 0, Message: "ok", Data: channels})
}

// TestNVRByParams tests NVR connection using params from request body (stateless).
func (h *Handler) TestNVRByParams(c *gin.Context) {
	var p service.NVRConnectionParams
	if err := c.ShouldBindJSON(&p); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	result, apiErr := h.Service.TestNVRConnectionByParams(p)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusOK, Response{Code: 0, Message: "ok", Data: result})
}

// DiscoverNVRByParams discovers NVR channels using params from request body (stateless).
func (h *Handler) DiscoverNVRByParams(c *gin.Context) {
	var p service.NVRConnectionParams
	if err := c.ShouldBindJSON(&p); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	channels, apiErr := h.Service.DiscoverNVRChannelsByParams(p)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusOK, Response{Code: 0, Message: "ok", Data: channels})
}

// GetChannels handles fetching a list of channels
func (h *Handler) GetChannels(c *gin.Context) {
	propertyIDStr := c.Query("property_id")
	var channels []models.Channel
	var apiErr *errors.APIError

	if propertyIDStr != "" {
		propertyID, err := uuid.Parse(propertyIDStr)
		if err != nil {
			h.handleError(c, errors.ErrBadRequest)
			return
		}
		channels, apiErr = h.Service.GetChannelsByPropertyID(propertyID)
	} else {
		// For now, if no property_id is provided, return all channels (not ideal for large systems)
		// In a real system, this should be restricted or paginated.
		channels, _, apiErr = h.Service.GetChannels(0, 100) // Simplified
	}

	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    channels,
	})
}

// CreateChannel handles creating a new channel
func (h *Handler) CreateChannel(c *gin.Context) {
	var channel models.Channel
	if err := c.ShouldBindJSON(&channel); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	createdChannel, apiErr := h.Service.CreateChannel(&channel)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusCreated, Response{
		Code:    0,
		Message: "created",
		Data:    createdChannel,
	})
}

// GetChannelByID handles fetching a single channel by ID
func (h *Handler) GetChannelByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	channel, apiErr := h.Service.GetChannelByID(id)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    channel,
	})
}

// UpdateChannel handles updating an existing channel
func (h *Handler) UpdateChannel(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	var reqChannel models.Channel
	if err := c.ShouldBindJSON(&reqChannel); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	reqChannel.ID = id

	apiErr := h.Service.UpdateChannel(&reqChannel)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "updated",
	})
}

// DeleteChannel handles deleting a channel
func (h *Handler) DeleteChannel(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	apiErr := h.Service.DeleteChannel(id)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "deleted",
	})
}

// CreatePlaySession handles creating a new play session
func (h *Handler) CreatePlaySession(c *gin.Context) {
	var req struct {
		ChannelID  string `json:"channel_id" binding:"required"`
		StreamType string `json:"stream_type" binding:"required,oneof=main sub"`
		Protocol   string `json:"protocol" binding:"required,oneof=rtsp http-flv webrtc hls"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	channelID, err := uuid.Parse(req.ChannelID)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	session := models.PlaySession{
		ChannelID:  channelID,
		StreamType: req.StreamType,
		Protocol:   req.Protocol,
	}

	createdSession, apiErr := h.Service.CreatePlaySession(&session)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data: gin.H{
			"session_id":             createdSession.ID,
			"channel_id":             createdSession.ChannelID,
			"token":                  createdSession.Token,
			"stream_url":             buildPlayURL(h.Service.Cfg.ZLM.PublicURL, createdSession.ZLMStreamID, createdSession.Protocol),
			"expires_in":             h.Service.Cfg.Play.SessionTimeoutSeconds,
			"estimated_bitrate_kbps": 1024, // Placeholder
		},
	})
}

func buildPlayURL(baseURL, streamID, protocol string) string {
	baseURL = strings.TrimRight(baseURL, "/")
	switch protocol {
	case "http-flv":
		return fmt.Sprintf("%s/live/%s.live.flv", baseURL, streamID)
	case "hls":
		return fmt.Sprintf("%s/live/%s/hls.m3u8", baseURL, streamID)
	case "rtsp":
		return fmt.Sprintf("%s/live/%s", baseURL, streamID)
	default:
		return fmt.Sprintf("%s/live/%s", baseURL, streamID)
	}
}

// EndPlaySession handles ending a play session
func (h *Handler) EndPlaySession(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	apiErr := h.Service.EndPlaySession(id)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "session closed",
		Data:    gin.H{"duration_seconds": 300}, // Placeholder
	})
}

// GetChannelRecordings queries recording segments from NVR via ISAPI.
// GET /api/channels/:id/recordings?start=2024-01-01T00:00:00Z&end=2024-01-01T23:59:59Z
func (h *Handler) GetChannelRecordings(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	startStr := c.Query("start")
	endStr := c.Query("end")
	if startStr == "" || endStr == "" {
		h.handleError(c, errors.NewAPIError(400, "缺少 start 或 end 参数", "missing query params"))
		return
	}

	startTime, err := parseRFC3339(startStr)
	if err != nil {
		h.handleError(c, errors.NewAPIError(400, "start 格式错误，需 ISO8601", err.Error()))
		return
	}
	endTime, err := parseRFC3339(endStr)
	if err != nil {
		h.handleError(c, errors.NewAPIError(400, "end 格式错误，需 ISO8601", err.Error()))
		return
	}

	segments, apiErr := h.Service.QueryNVRRecordings(id, startTime, endTime)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data: gin.H{
			"channel_id": id,
			"total":      len(segments),
			"items":      segments,
		},
	})
}

// CreateRecordingSession creates a ZLM proxy for recording playback.
// POST /api/sessions/recording  { channel_id, protocol, record_start, record_end }
func (h *Handler) CreateRecordingSession(c *gin.Context) {
	var req struct {
		ChannelID   string `json:"channel_id" binding:"required"`
		Protocol    string `json:"protocol" binding:"required,oneof=http-flv hls"`
		RecordStart string `json:"record_start" binding:"required"`
		RecordEnd   string `json:"record_end" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	channelID, err := uuid.Parse(req.ChannelID)
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}

	session, apiErr := h.Service.CreateRecordingSession(channelID, req.Protocol, req.RecordStart, req.RecordEnd)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}

	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data: gin.H{
			"session_id": session.ID,
			"stream_url": buildPlayURL(h.Service.Cfg.ZLM.PublicURL, session.ZLMStreamID, session.Protocol),
			"expires_in": 7200,
		},
	})
}

func parseRFC3339(s string) (time.Time, error) {
	return time.Parse(time.RFC3339, s)
}

// ZLMStreamNotFound handles ZLM's on_stream_not_found hook
func (h *Handler) ZLMStreamNotFound(c *gin.Context) {
	var req struct {
		Stream string `json:"stream" binding:"required"`
		IP     string `json:"ip"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.Log.Errorw("Failed to bind ZLMStreamNotFound request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"code": 1, "msg": "invalid request"})
		return
	}

	h.Log.Infow("ZLM Stream Not Found Hook received", "stream", req.Stream, "ip", req.IP)

	// TODO: Implement logic to pull stream from NVR using ZLM API
	// For now, just return success
	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "pull stream from nvr"})
}

// ZLMStreamNoneReader handles ZLM's on_stream_none_reader hook
func (h *Handler) ZLMStreamNoneReader(c *gin.Context) {
	var req struct {
		Stream string `json:"stream" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.Log.Errorw("Failed to bind ZLMStreamNoneReader request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"code": 1, "msg": "invalid request"})
		return
	}

	h.Log.Infow("ZLM Stream None Reader Hook received", "stream", req.Stream)
	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "close the stream"})
}

// ── Users ─────────────────────────────────────────────────────────────────────

func (h *Handler) GetUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	list, total, apiErr := h.Service.GetUsers((page-1)*limit, limit)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusOK, Response{Code: 0, Message: "success", Data: gin.H{
		"total": total, "page": page, "items": list,
	}})
}

func (h *Handler) CreateUser(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role" binding:"required,oneof=admin manager operator viewer"`
		Email    string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	user, apiErr := h.Service.CreateUser(req.Username, req.Password, req.Role, req.Email)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusCreated, Response{Code: 0, Message: "created", Data: user})
}

func (h *Handler) UpdateUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	var req struct {
		Role     string `json:"role" binding:"required,oneof=admin manager operator viewer"`
		Email    string `json:"email"`
		Status   string `json:"status" binding:"required,oneof=active inactive"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	if apiErr := h.Service.UpdateUser(id, req.Role, req.Email, req.Status, req.Password); apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusOK, Response{Code: 0, Message: "updated"})
}

func (h *Handler) DeleteUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	if apiErr := h.Service.DeleteUser(id); apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusOK, Response{Code: 0, Message: "deleted"})
}

// ── Audit logs ────────────────────────────────────────────────────────────────

func (h *Handler) GetAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	list, total, apiErr := h.Service.GetAuditLogs((page-1)*limit, limit)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusOK, Response{Code: 0, Message: "success", Data: gin.H{
		"total": total, "page": page, "items": list,
	}})
}

// ── Detailed health ───────────────────────────────────────────────────────────

func (h *Handler) DetailedHealth(c *gin.Context) {
	type svcStatus struct {
		Name   string `json:"name"`
		OK     bool   `json:"ok"`
		Detail string `json:"detail,omitempty"`
	}
	results := []svcStatus{}

	// ZLM
	zlmOK := false
	zlmDetail := "disabled"
	if h.Service.Cfg.ZLM.Enabled {
		resp, err := (&http.Client{Timeout: 3 * time.Second}).Get(
			strings.TrimRight(h.Service.Cfg.ZLM.APIURL, "/") + "/index/api/getServerConfig?secret=" + h.Service.Cfg.ZLM.Secret)
		if err == nil {
			resp.Body.Close()
			zlmOK = resp.StatusCode == http.StatusOK
			zlmDetail = fmt.Sprintf("HTTP %d", resp.StatusCode)
		} else {
			zlmDetail = err.Error()
		}
	}
	results = append(results, svcStatus{Name: "ZLMediaKit", OK: zlmOK, Detail: zlmDetail})

	// NVRs
	nvrs, _ := h.Service.Repo.GetNVRsByPropertyID(uuid.Nil)
	// get all nvrs
	allNVRs, _, _ := h.Service.Repo.GetChannels(0, 0) // reuse repo to get all NVRs differently
	_ = allNVRs
	_ = nvrs

	// DB
	dbOK := h.Service.Repo.DB.DB().Ping() == nil
	results = append(results, svcStatus{Name: "PostgreSQL", OK: dbOK})

	// Active sessions count
	var activeSessions int64
	h.Service.Repo.DB.Model(&struct{}{}).Table("play_sessions").Where("is_active = true").Count(&activeSessions)

	c.JSON(http.StatusOK, Response{Code: 0, Message: "success", Data: gin.H{
		"services":        results,
		"active_sessions": activeSessions,
	}})
}

// ── Brand templates ───────────────────────────────────────────────────────────

func (h *Handler) GetBrandTemplates(c *gin.Context) {
	list, apiErr := h.Service.GetBrandTemplates()
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusOK, Response{Code: 0, Message: "success", Data: gin.H{"items": list, "total": len(list)}})
}

func (h *Handler) CreateBrandTemplate(c *gin.Context) {
	var t models.BrandTemplate
	if err := c.ShouldBindJSON(&t); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	created, apiErr := h.Service.CreateBrandTemplate(&t)
	if apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusCreated, Response{Code: 0, Message: "created", Data: created})
}

func (h *Handler) UpdateBrandTemplate(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	var t models.BrandTemplate
	if err := c.ShouldBindJSON(&t); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	t.ID = id
	if apiErr := h.Service.UpdateBrandTemplate(&t); apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusOK, Response{Code: 0, Message: "updated"})
}

func (h *Handler) DeleteBrandTemplate(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	if apiErr := h.Service.DeleteBrandTemplate(id); apiErr != nil {
		h.handleError(c, apiErr)
		return
	}
	c.JSON(http.StatusOK, Response{Code: 0, Message: "deleted"})
}

// ── Config ─────────────────────────────────────────────────────────────────────

func (h *Handler) GetConfig(c *gin.Context) {
	cfg := h.Service.Cfg
	c.JSON(http.StatusOK, Response{Code: 0, Message: "success", Data: gin.H{
		"zlm": gin.H{
			"api_url":    cfg.ZLM.APIURL,
			"public_url": cfg.ZLM.PublicURL,
			"enabled":    cfg.ZLM.Enabled,
		},
		"play": gin.H{
			"session_timeout_seconds":              cfg.Play.SessionTimeoutSeconds,
			"max_concurrent_streams_per_user":     cfg.Play.MaxConcurrentStreamsPerUser,
			"max_concurrent_streams_per_property": cfg.Play.MaxConcurrentStreamsPerProperty,
			"stream_idle_timeout_seconds":          cfg.Play.StreamIdleTimeoutSeconds,
		},
		"server": gin.H{
			"port": cfg.Server.Port,
			"mode": cfg.Server.Mode,
		},
	}})
}
