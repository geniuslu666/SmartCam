#!/bin/bash
# SmartCam 开发环境重启脚本

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"
FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"

echo "重启 SmartCam 服务..."
echo ""

# 停止后端
if [ -f "$BACKEND_PID_FILE" ]; then
    local pid=$(cat "$BACKEND_PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
        echo "停止后端 (PID: $pid)"
        kill "$pid" 2>/dev/null || true
        sleep 1
    fi
    rm "$BACKEND_PID_FILE"
fi

# 停止前端
if [ -f "$FRONTEND_PID_FILE" ]; then
    local pid=$(cat "$FRONTEND_PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
        echo "停止前端 (PID: $pid)"
        kill "$pid" 2>/dev/null || true
        sleep 1
    fi
    rm "$FRONTEND_PID_FILE"
fi

echo "启动服务..."
bash "$PROJECT_ROOT/start-dev.sh"
