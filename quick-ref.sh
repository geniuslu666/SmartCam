#!/bin/bash
# SmartCam 快速参考卡片（可打印）
# 使用: bash quick-ref.sh | less

cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                 SmartCam 快速参考卡片                         ║
║              https://github.com/your-org/smartcam            ║
╚═══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🚀 快速开始（首次运行）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  cd /opt/smartcam
  bash setup-dev.sh                 # 初始化环境
  nano .env                         # 编辑配置
  bash start-dev.sh                 # 启动服务
  curl http://127.0.0.1:8081/api/health  # 测试后端
  
  访问前端: http://<服务器IP>:5173

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📋 日常命令
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  状态检查
    bash status-dev.sh              # 查看所有服务状态
    make status                     # Make 版本
  
  查看日志
    bash logs-dev.sh all            # 查看所有日志
    bash logs-dev.sh backend        # 只看后端
    bash logs-dev.sh frontend       # 只看前端
  
  重启服务
    bash restart-dev.sh             # 重启所有服务
    make restart                    # Make 版本
  
  停止服务
    Ctrl+C                          # 在启动脚本窗口按 Ctrl+C

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🐳 ZLMediaKit 流媒体
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  第一阶段：禁用 ZLM（先验证前后端）
    编辑 .env:   ZLM_ENABLED=false
    运行服务:    bash start-dev.sh
  
  第二阶段：启用 ZLM
    启动容器:    docker-compose up -d zlm
    编辑 .env:   ZLM_ENABLED=true
    重启后端:    bash restart-dev.sh
    查看日志:    docker-compose logs -f zlm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🔧 Make 命令（如果安装了 make）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  make help           查看所有命令
  make setup          初始化环境
  make start          启动服务
  make restart        重启服务
  make status         查看状态
  make logs           查看日志
  make clean          清理日志

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🌐 关键端口和地址
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  前端     http://<服务器IP>:5173
  API      http://<服务器IP>:8081
  流媒体    http://<服务器IP>:8080
  
  本地测试:
    http://127.0.0.1:5173
    http://127.0.0.1:8081/api/health
    http://127.0.0.1:8080

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🐛 故障排查
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  检查所有依赖
    bash check-deployment.sh
  
  后端无法连接 (端口 8081)
    tail -50 backend.log
    lsof -i :8081                   # 查看端口占用
    cd backend && go run ./cmd/server  # 手动运行调试
  
  前端无法访问 (端口 5173)
    tail -50 frontend.log
    ps aux | grep "npm run dev"
    lsof -i :5173
  
  摄像头无法播放
    ffprobe rtsp://user:pass@NVR_IP:554/Streaming/channels/102
    ping <NVR_IP>
    telnet <NVR_IP> 554
    docker-compose logs -f zlm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🔑 关键配置（.env）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  PUBLIC_API_BASE_URL=http://192.168.1.100:8081
  PUBLIC_STREAM_BASE_URL=http://192.168.1.100:8080
  HIK_NVR_HOST=192.168.1.50
  HIK_NVR_USERNAME=admin
  HIK_NVR_PASSWORD=12345
  HIK_CAMERA_COUNT=16
  ZLM_ENABLED=false          # 先设置 false，验证后改 true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🚀 生产部署（可选）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  systemd 自动启动
    sudo bash ops/systemd/install-service.sh
    sudo systemctl start smartcam-backend
    sudo systemctl start smartcam-frontend
    sudo systemctl status smartcam-backend
  
  Nginx 反向代理 + HTTPS
    sudo bash ops/nginx/install-nginx.sh your-domain.com
    sudo certbot --nginx -d your-domain.com
    sudo systemctl reload nginx

  GitHub Actions 自动部署
    1. 设置 GitHub Secrets:
       - DEPLOY_HOST
       - DEPLOY_USER
       - DEPLOY_KEY
       - DEPLOY_PATH
    2. git push origin main  # 自动触发部署

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📚 完整文档
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  README.md          项目说明
  DEPLOYMENT.md      详细部署指南
  ARCHITECTURE.md    架构和故障排查
  TOOLS.md           工具和自动化说明

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 💡 提示
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  • 首次运行时务必执行 setup-dev.sh
  • 修改 .env 后需要重启后端 (bash restart-dev.sh)
  • 查看日志是排查问题的第一步 (bash logs-dev.sh all)
  • 在 ZLM_ENABLED=false 时可以验证前后端通信
  • 使用 Ctrl+C 停止 start-dev.sh，会自动清理资源
  • 每次更新代码后建议运行 bash check-deployment.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🆘 获取帮助
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  查看详细指南    cat DEPLOYMENT.md
  运行诊断        bash check-deployment.sh
  查看完整日志    bash logs-dev.sh all
  查看所有命令    make help
  了解架构        cat ARCHITECTURE.md

╔═══════════════════════════════════════════════════════════════╗
║  SmartCam v1.0 | 最后更新: 2026-05-29                        ║
╚═══════════════════════════════════════════════════════════════╝
EOF
