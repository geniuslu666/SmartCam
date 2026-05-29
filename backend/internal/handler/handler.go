package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

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

		auth.GET("/channels", h.GetChannels)
		auth.POST("/channels", h.CreateChannel)
		auth.GET("/channels/:id", h.GetChannelByID)
		auth.PUT("/channels/:id", h.UpdateChannel)
		auth.DELETE("/channels/:id", h.DeleteChannel)

		auth.POST("/sessions", h.CreatePlaySession)
		auth.DELETE("/sessions/:id", h.EndPlaySession)

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

	var reqNVR models.NVR
	if err := c.ShouldBindJSON(&reqNVR); err != nil {
		h.handleError(c, errors.ErrBadRequest)
		return
	}
	reqNVR.ID = id

	apiErr := h.Service.UpdateNVR(&reqNVR)
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

	// TODO: Implement logic to delete stream proxy from ZLM API and update DB
	// For now, just return success
	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "close the stream"})
}
