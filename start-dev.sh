#!/bin/bash
# SmartCam 开发环境启动脚本
# 用于启动后端、前端和可选的 ZLMediaKit

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"
FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}正在关闭服务...${NC}"
    
    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo "停止后端 (PID: $pid)"
            kill "$pid" 2>/dev/null || true
            rm "$BACKEND_PID_FILE"
        fi
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo "停止前端 (PID: $pid)"
            kill "$pid" 2>/dev/null || true
            rm "$FRONTEND_PID_FILE"
        fi
    fi
    
    echo -e "${GREEN}✓ 所有服务已停止${NC}"
}

trap cleanup EXIT

# 检查 .env 文件
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}❌ 找不到 .env 文件${NC}"
    echo "请运行: bash setup-dev.sh"
    exit 1
fi

# 加载环境变量
set -a
source "$PROJECT_ROOT/.env"
set +a

echo "=========================================="
echo -e "${BLUE}SmartCam 开发环境启动${NC}"
echo "=========================================="
echo ""

# 检查依赖
echo "[1/4] 检查依赖..."
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go 未安装，请运行 setup-dev.sh${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装，请运行 setup-dev.sh${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 依赖检查通过${NC}"

# 启动后端
echo ""
echo "[2/4] 启动 Go 后端..."
cd "$PROJECT_ROOT/backend"

# 检查 server 是否已运行
if [ -f "$BACKEND_PID_FILE" ]; then
    local old_pid=$(cat "$BACKEND_PID_FILE")
    if kill -0 "$old_pid" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  后端已在运行 (PID: $old_pid)${NC}"
    else
        rm "$BACKEND_PID_FILE"
    fi
fi

# 如果后端未运行，启动它
if [ ! -f "$BACKEND_PID_FILE" ]; then
    nohup go run ./cmd/server > "$PROJECT_ROOT/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$BACKEND_PID_FILE"
    
    # 等待后端启动
    echo "等待后端启动..."
    sleep 3
    
    # 检查后端是否正常
    if curl -s http://127.0.0.1:8081/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端已启动 (PID: $BACKEND_PID)${NC}"
        echo "  API 地址: http://$PUBLIC_API_BASE_URL"
    else
        echo -e "${RED}❌ 后端启动失败，查看日志: tail -f backend.log${NC}"
        cat "$PROJECT_ROOT/backend.log" | tail -20
        exit 1
    fi
fi

# 启动前端
echo ""
echo "[3/4] 启动 React 前端..."
cd "$PROJECT_ROOT/frontend"

# 检查是否需要安装依赖
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

# 检查 front 是否已运行
if [ -f "$FRONTEND_PID_FILE" ]; then
    local old_pid=$(cat "$FRONTEND_PID_FILE")
    if kill -0 "$old_pid" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  前端已在运行 (PID: $old_pid)${NC}"
    else
        rm "$FRONTEND_PID_FILE"
    fi
fi

# 如果前端未运行，启动它
if [ ! -f "$FRONTEND_PID_FILE" ]; then
    nohup npm run dev > "$PROJECT_ROOT/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
    
    echo "等待前端启动..."
    sleep 3
    
    echo -e "${GREEN}✓ 前端已启动 (PID: $FRONTEND_PID)${NC}"
    echo "  前端地址: http://<服务器IP>:5173"
fi

# ZLMediaKit (可选)
echo ""
echo "[4/4] ZLMediaKit 状态..."
if [ "$ZLM_ENABLED" = "true" ]; then
    echo -e "${YELLOW}ZLM_ENABLED=true，确保 docker-compose 已启动${NC}"
    if command -v docker-compose &> /dev/null; then
        if docker-compose ps zlm 2>/dev/null | grep -q "Up"; then
            echo -e "${GREEN}✓ ZLMediaKit 已运行${NC}"
        else
            echo -e "${YELLOW}⚠️  ZLMediaKit 未运行，正在启动...${NC}"
            docker-compose up -d zlm
            sleep 3
            echo -e "${GREEN}✓ ZLMediaKit 已启动${NC}"
        fi
    fi
else
    echo -e "${YELLOW}ZLM_ENABLED=false，ZLMediaKit 暂未启用${NC}"
    echo "要启用 ZLMediaKit，请执行："
    echo "  1. 修改 .env: ZLM_ENABLED=true"
    echo "  2. 运行: docker-compose up -d zlm"
    echo "  3. 重启后端"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ 所有服务已启动！${NC}"
echo "=========================================="
echo ""
echo "📋 日志文件:"
echo "  后端: tail -f $PROJECT_ROOT/backend.log"
echo "  前端: tail -f $PROJECT_ROOT/frontend.log"
echo ""
echo "🌐 访问地址:"
echo "  前端: http://<服务器IP>:5173"
echo "  API:  http://<服务器IP>:8081"
echo "  健康检查: curl http://127.0.0.1:8081/api/health"
echo ""
echo "💡 快捷命令:"
echo "  查看状态: bash status-dev.sh"
echo "  重启服务: bash restart-dev.sh"
echo "  按 Ctrl+C 停止服务"
echo ""
echo "按 Ctrl+C 停止所有服务..."
wait
