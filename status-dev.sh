#!/bin/bash
# SmartCam 开发环境状态检查脚本

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"
FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo -e "${BLUE}SmartCam 服务状态${NC}"
echo "=========================================="
echo ""

# 加载环境变量
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# 检查后端
echo -e "${BLUE}后端服务:${NC}"
if [ -f "$BACKEND_PID_FILE" ]; then
    local pid=$(cat "$BACKEND_PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${GREEN}✓ 运行中 (PID: $pid)${NC}"
        if curl -s http://127.0.0.1:8081/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}  ✓ 健康检查通过${NC}"
        else
            echo -e "${RED}  ✗ 健康检查失败${NC}"
        fi
    else
        echo -e "${RED}✗ 已停止${NC}"
    fi
else
    echo -e "${RED}✗ 已停止${NC}"
fi

# 检查前端
echo ""
echo -e "${BLUE}前端服务:${NC}"
if [ -f "$FRONTEND_PID_FILE" ]; then
    local pid=$(cat "$FRONTEND_PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${GREEN}✓ 运行中 (PID: $pid)${NC}"
        if curl -s http://127.0.0.1:5173 > /dev/null 2>&1; then
            echo -e "${GREEN}  ✓ 可访问${NC}"
        else
            echo -e "${YELLOW}  ⚠️  启动中...${NC}"
        fi
    else
        echo -e "${RED}✗ 已停止${NC}"
    fi
else
    echo -e "${RED}✗ 已停止${NC}"
fi

# 检查 ZLMediaKit
echo ""
echo -e "${BLUE}ZLMediaKit 服务:${NC}"
if [ "$ZLM_ENABLED" = "true" ]; then
    if command -v docker-compose &> /dev/null; then
        if docker-compose ps zlm 2>/dev/null | grep -q "Up"; then
            echo -e "${GREEN}✓ 运行中${NC}"
        else
            echo -e "${RED}✗ 已停止${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Docker Compose 未安装${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未启用 (ZLM_ENABLED=false)${NC}"
fi

echo ""
echo "=========================================="
