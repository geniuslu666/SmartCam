package logger

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"github.com/smartcam/backend/pkg/config"
)

var log *zap.SugaredLogger

// New initializes and returns a zap sugared logger
func New() *zap.SugaredLogger {
	if log == nil {
		cfg := config.Load()

		atom := zap.NewAtomicLevel()
		switch cfg.Log.Level {
		case "debug":
			atom.SetLevel(zap.DebugLevel)
		case "info":
			atom.SetLevel(zap.InfoLevel)
		case "warn":
			atom.SetLevel(zap.WarnLevel)
		case "error":
			atom.SetLevel(zap.ErrorLevel)
		default:
			atom.SetLevel(zap.InfoLevel)
		}

		encoderCfg := zap.NewProductionEncoderConfig()
		encoderCfg.EncodeTime = zapcore.ISO8601TimeEncoder

		var core zapcore.Core
		if cfg.Log.Format == "json" {
			core = zapcore.NewCore(
				zapcore.NewJSONEncoder(encoderCfg),
				zapcore.Lock(os.Stdout),
				atom,
			)
		} else {
			core = zapcore.NewCore(
				zapcore.NewConsoleEncoder(encoderCfg),
				zapcore.Lock(os.Stdout),
				atom,
			)
		}
		
		logger := zap.New(core, zap.AddCaller(), zap.AddCallerSkip(1))
		log = logger.Sugar()
	}
	return log
}
