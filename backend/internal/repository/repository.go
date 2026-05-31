package repository

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/postgres"
	"github.com/smartcam/backend/internal/models"
	"github.com/smartcam/backend/pkg/config"
	"github.com/smartcam/backend/pkg/utils"
	"go.uber.org/zap"
)

// Repository struct holds the database connection
type Repository struct {
	DB  *gorm.DB
	Log *zap.SugaredLogger
}

type gormLogger struct {
	log *zap.SugaredLogger
}

func (l gormLogger) Print(values ...interface{}) {
	l.log.Debug(values...)
}

// NewRepository creates a new repository instance
func NewRepository(cfg *config.Config, log *zap.SugaredLogger) (*Repository, error) {
	dsn := cfg.Database.DSN()
	db, err := gorm.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	db.LogMode(true)
	db.SetLogger(gormLogger{log: log})

	db.DB().SetMaxIdleConns(10)
	db.DB().SetMaxOpenConns(100)
	db.DB().SetConnMaxLifetime(time.Hour)

	// Auto-migrate tables (for development only, use real migrations in production)
	db.AutoMigrate(
		&models.BrandTemplate{},
		&models.Property{},
		&models.NVR{},
		&models.Channel{},
		&models.PlaySession{},
		&models.User{},
		&models.UserPropertyPermission{},
		&models.AuditLog{},
		&models.ZLMStream{},
		&models.HealthCheck{},
		&models.Alert{},
	)

	return &Repository{DB: db, Log: log}, nil
}

// Close closes the database connection
func (r *Repository) Close() error {
	return r.DB.Close()
}

// SeedAdminUser creates a default admin user if not exists
func (r *Repository) SeedAdminUser(password string) error {
	var user models.User
	if r.DB.Where("username = ?", "admin").First(&user).RecordNotFound() {
		hashedPassword, err := utils.HashPassword(password)
		if err != nil {
			return fmt.Errorf("failed to hash admin password: %w", err)
		}

		adminUser := models.User{
			Username:     "admin",
			PasswordHash: hashedPassword,
			Role:         "admin",
			Status:       "active",
		}
		if err := r.DB.Create(&adminUser).Error; err != nil {
			return fmt.Errorf("failed to create admin user: %w", err)
		}
		r.Log.Infow("Default admin user created", "username", "admin")
	}
	return nil
}

// GetUserByUsername retrieves a user by username
func (r *Repository) GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	if r.DB.Where("username = ?", username).First(&user).RecordNotFound() {
		return nil, nil // User not found
	}
	return &user, nil
}

// GetUserByID retrieves a user by ID
func (r *Repository) GetUserByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	if r.DB.Where("id = ?", id).First(&user).RecordNotFound() {
		return nil, nil // User not found
	}
	return &user, nil
}

// CreateProperty creates a new property
func (r *Repository) CreateProperty(property *models.Property) error {
	return r.DB.Create(property).Error
}

// GetPropertyByID retrieves a property by ID
func (r *Repository) GetPropertyByID(id uuid.UUID) (*models.Property, error) {
	var property models.Property
	if r.DB.Where("id = ?", id).First(&property).RecordNotFound() {
		return nil, nil
	}
	return &property, nil
}

// GetProperties retrieves a list of properties with stats from v_property_overview
func (r *Repository) GetProperties(offset, limit int) ([]models.PropertyOverview, int, error) {
	var total int
	if err := r.DB.Model(&models.Property{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Fetch base property rows
	var props []models.Property
	if err := r.DB.Order("created_at").Offset(offset).Limit(limit).Find(&props).Error; err != nil {
		return nil, 0, err
	}

	if len(props) == 0 {
		return nil, total, nil
	}

	// Fetch stats from view using a flat scan struct
	type viewRow struct {
		ID              string `gorm:"column:id"`
		NVRCount        int64  `gorm:"column:nvr_count"`
		ChannelCount    int64  `gorm:"column:channel_count"`
		OfflineChannels int64  `gorm:"column:offline_channels"`
		ActiveSessions  int64  `gorm:"column:active_sessions"`
	}
	var stats []viewRow
	r.DB.Raw(`SELECT id::text, nvr_count, channel_count, offline_channels, active_sessions FROM v_property_overview`).Scan(&stats)

	statsMap := make(map[string]viewRow, len(stats))
	for _, s := range stats {
		statsMap[s.ID] = s
	}

	list := make([]models.PropertyOverview, 0, len(props))
	for _, p := range props {
		o := models.PropertyOverview{Property: p}
		if s, ok := statsMap[p.ID.String()]; ok {
			o.NVRCount = s.NVRCount
			o.ChannelCount = s.ChannelCount
			o.OfflineChannels = s.OfflineChannels
			o.ActiveSessions = s.ActiveSessions
		}
		list = append(list, o)
	}
	return list, total, nil
}

// UpdateProperty updates an existing property
func (r *Repository) UpdateProperty(property *models.Property) error {
	return r.DB.Save(property).Error
}

// DeleteProperty deletes a property
func (r *Repository) DeleteProperty(id uuid.UUID) error {
	return r.DB.Delete(&models.Property{}, id).Error
}

// CreateNVR creates a new NVR
func (r *Repository) CreateNVR(nvr *models.NVR) error {
	return r.DB.Create(nvr).Error
}

// GetNVRsByPropertyID retrieves NVRs by property ID
func (r *Repository) GetNVRsByPropertyID(propertyID uuid.UUID) ([]models.NVR, error) {
	var nvrs []models.NVR
	if err := r.DB.Where("property_id = ?", propertyID).Find(&nvrs).Error; err != nil {
		return nil, err
	}
	return nvrs, nil
}

// GetNVRByID retrieves an NVR by ID
func (r *Repository) GetNVRByID(id uuid.UUID) (*models.NVR, error) {
	var nvr models.NVR
	if r.DB.Where("id = ?", id).First(&nvr).RecordNotFound() {
		return nil, nil
	}
	return &nvr, nil
}

// UpdateNVR updates an existing NVR
func (r *Repository) UpdateNVR(nvr *models.NVR) error {
	return r.DB.Save(nvr).Error
}

// DeleteNVR deletes an NVR
func (r *Repository) DeleteNVR(id uuid.UUID) error {
	return r.DB.Delete(&models.NVR{}, id).Error
}

// CreateChannel creates a new channel
func (r *Repository) CreateChannel(channel *models.Channel) error {
	return r.DB.Create(channel).Error
}

// GetChannelsByPropertyID retrieves channels by property ID
func (r *Repository) GetChannelsByPropertyID(propertyID uuid.UUID) ([]models.Channel, error) {
	var channels []models.Channel
	if err := r.DB.Where("property_id = ?", propertyID).Find(&channels).Error; err != nil {
		return nil, err
	}
	return channels, nil
}

// GetChannels retrieves a paginated list of channels.
func (r *Repository) GetChannels(offset, limit int) ([]models.Channel, int, error) {
	var channels []models.Channel
	var total int

	if err := r.DB.Model(&models.Channel{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := r.DB.Offset(offset).Limit(limit).Find(&channels).Error; err != nil {
		return nil, 0, err
	}
	return channels, total, nil
}

// GetChannelByID retrieves a channel by ID
func (r *Repository) GetChannelByID(id uuid.UUID) (*models.Channel, error) {
	var channel models.Channel
	if r.DB.Where("id = ?", id).First(&channel).RecordNotFound() {
		return nil, nil
	}
	return &channel, nil
}

// UpdateChannel updates an existing channel
func (r *Repository) UpdateChannel(channel *models.Channel) error {
	return r.DB.Save(channel).Error
}

// DeleteChannel deletes a channel
func (r *Repository) DeleteChannel(id uuid.UUID) error {
	return r.DB.Delete(&models.Channel{}, id).Error
}

// CreatePlaySession creates a new play session.
func (r *Repository) CreatePlaySession(session *models.PlaySession) error {
	return r.DB.Create(session).Error
}

// GetPlaySessionByID retrieves a play session by ID.
func (r *Repository) GetPlaySessionByID(id uuid.UUID) (*models.PlaySession, error) {
	var session models.PlaySession
	if r.DB.Where("id = ?", id).First(&session).RecordNotFound() {
		return nil, nil
	}
	return &session, nil
}

// EndPlaySession marks a play session as ended.
func (r *Repository) EndPlaySession(id uuid.UUID) error {
	now := time.Now()
	return r.DB.Model(&models.PlaySession{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"is_active": false,
			"status":    "ended",
			"ended_at":  &now,
		}).Error
}

// ── Brand templates ───────────────────────────────────────────────────────────

func (r *Repository) GetBrandTemplates() ([]models.BrandTemplate, error) {
	var list []models.BrandTemplate
	if err := r.DB.Order("brand, name").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *Repository) GetBrandTemplateByID(id uuid.UUID) (*models.BrandTemplate, error) {
	var t models.BrandTemplate
	if r.DB.Where("id = ?", id).First(&t).RecordNotFound() {
		return nil, nil
	}
	return &t, nil
}

func (r *Repository) CreateBrandTemplate(t *models.BrandTemplate) error {
	return r.DB.Create(t).Error
}

func (r *Repository) UpdateBrandTemplate(t *models.BrandTemplate) error {
	return r.DB.Save(t).Error
}

func (r *Repository) DeleteBrandTemplate(id uuid.UUID) error {
	return r.DB.Delete(&models.BrandTemplate{}, id).Error
}

// ── Users ─────────────────────────────────────────────────────────────────────

func (r *Repository) GetUsers(offset, limit int) ([]models.User, int, error) {
	var list []models.User
	var total int
	if err := r.DB.Model(&models.User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := r.DB.Order("created_at").Offset(offset).Limit(limit).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func (r *Repository) CreateUser(user *models.User) error {
	return r.DB.Create(user).Error
}

func (r *Repository) UpdateUser(user *models.User) error {
	return r.DB.Save(user).Error
}

func (r *Repository) DeleteUser(id uuid.UUID) error {
	return r.DB.Delete(&models.User{}, id).Error
}

// ── Audit logs ────────────────────────────────────────────────────────────────

func (r *Repository) GetAuditLogs(offset, limit int) ([]models.AuditLog, int, error) {
	var list []models.AuditLog
	var total int
	if err := r.DB.Model(&models.AuditLog{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := r.DB.Order("created_at desc").Offset(offset).Limit(limit).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func (r *Repository) CreateAuditLog(entry *models.AuditLog) error {
	return r.DB.Create(entry).Error
}
