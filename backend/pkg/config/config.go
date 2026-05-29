package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	ZLM      ZLMConfig
	JWT      JWTConfig
	Log      LogConfig
	Play     PlayConfig
}

type ServerConfig struct {
	Port int
	Host string
	Mode string
}

type DatabaseConfig struct {
	Host     string
	Port     int
	Name     string
	User     string
	Password string
	SSLMode  string
}

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

type ZLMConfig struct {
	APIURL    string
	PublicURL string
	Secret    string
	Enabled   bool
}

type JWTConfig struct {
	Secret string
}

type LogConfig struct {
	Level  string
	Format string
}

type PlayConfig struct {
	SessionTimeoutSeconds           int
	MaxConcurrentStreamsPerUser     int
	MaxConcurrentStreamsPerProperty int
	StreamIdleTimeoutSeconds        int
}

// Load loads configuration from file or environment variables
func Load() *Config {
	v := viper.New()
	v.AddConfigPath(".")
	v.SetConfigName(".env")
	v.SetConfigType("env")
	v.AutomaticEnv() // Read environment variables

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			fmt.Printf("Error reading config file: %s\n", err)
			os.Exit(1)
		}
	}

	// Set default values
	v.SetDefault("SERVER_PORT", 8081)
	v.SetDefault("SERVER_HOST", "0.0.0.0")
	v.SetDefault("GIN_MODE", "debug")

	v.SetDefault("DB_HOST", "127.0.0.1")
	v.SetDefault("DB_PORT", 5432)
	v.SetDefault("DB_NAME", "smartcam")
	v.SetDefault("DB_USER", "smartcam")
	v.SetDefault("DB_PASSWORD", "smartcam_dev_pass")
	v.SetDefault("DB_SSLMODE", "disable")

	v.SetDefault("REDIS_ADDR", "127.0.0.1:6379")
	v.SetDefault("REDIS_PASSWORD", "")
	v.SetDefault("REDIS_DB", 0)

	v.SetDefault("ZLM_API_URL", "http://127.0.0.1:8080")
	v.SetDefault("ZLM_PUBLIC_URL", v.GetString("ZLM_API_URL"))
	v.SetDefault("ZLM_SECRET", "035c73f7-bb6f-4a59-abf7-3a47ddf33d0e")
	v.SetDefault("ZLM_ENABLED", false)

	v.SetDefault("JWT_SECRET", "your-super-secret-key-change-in-production")

	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("LOG_FORMAT", "json")

	v.SetDefault("PLAY_SESSION_TIMEOUT_SECONDS", 3600)
	v.SetDefault("MAX_CONCURRENT_STREAMS_PER_USER", 4)
	v.SetDefault("MAX_CONCURRENT_STREAMS_PER_PROPERTY", 50)
	v.SetDefault("STREAM_IDLE_TIMEOUT_SECONDS", 30)

	var cfg Config
	// Unmarshal configuration into struct
	cfg.Server = ServerConfig{
		Port: v.GetInt("SERVER_PORT"),
		Host: v.GetString("SERVER_HOST"),
		Mode: v.GetString("GIN_MODE"),
	}
	cfg.Database = DatabaseConfig{
		Host:     v.GetString("DB_HOST"),
		Port:     v.GetInt("DB_PORT"),
		Name:     v.GetString("DB_NAME"),
		User:     v.GetString("DB_USER"),
		Password: v.GetString("DB_PASSWORD"),
		SSLMode:  v.GetString("DB_SSLMODE"),
	}
	cfg.Redis = RedisConfig{
		Addr:     v.GetString("REDIS_ADDR"),
		Password: v.GetString("REDIS_PASSWORD"),
		DB:       v.GetInt("REDIS_DB"),
	}
	cfg.ZLM = ZLMConfig{
		APIURL:    v.GetString("ZLM_API_URL"),
		PublicURL: v.GetString("ZLM_PUBLIC_URL"),
		Secret:    v.GetString("ZLM_SECRET"),
		Enabled:   v.GetBool("ZLM_ENABLED"),
	}
	cfg.JWT = JWTConfig{
		Secret: v.GetString("JWT_SECRET"),
	}
	cfg.Log = LogConfig{
		Level:  v.GetString("LOG_LEVEL"),
		Format: v.GetString("LOG_FORMAT"),
	}
	cfg.Play = PlayConfig{
		SessionTimeoutSeconds:           v.GetInt("PLAY_SESSION_TIMEOUT_SECONDS"),
		MaxConcurrentStreamsPerUser:     v.GetInt("MAX_CONCURRENT_STREAMS_PER_USER"),
		MaxConcurrentStreamsPerProperty: v.GetInt("MAX_CONCURRENT_STREAMS_PER_PROPERTY"),
		StreamIdleTimeoutSeconds:        v.GetInt("STREAM_IDLE_TIMEOUT_SECONDS"),
	}

	return &cfg
}

func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.Name, c.SSLMode)
}
