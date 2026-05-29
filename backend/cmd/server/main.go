package main

import (
	"fmt"
	"github.com/smartcam/backend/internal/handler"
	"github.com/smartcam/backend/pkg/config"
	"github.com/smartcam/backend/pkg/logger"
)

func main() {
	// 初始化配置
	cfg := config.Load()
	
	// 初始化日志
	log := logger.New()
	defer log.Sync()

	log.Infow("Starting SmartCam Server", "version", "1.0.0")
	
	// 初始化处理器
	r := handler.Setup()
	
	// 启动服务器
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Infow("Server listening", "addr", addr)
	
	if err := r.Run(addr); err != nil {
		log.Fatalw("Server error", "error", err)
	}
}
