#!/bin/bash
# SmartCam MVP 开发环境快速启动脚本
# 一键启动所有必要的服务

set -e

echo "╔═════════════════════════════════════════╗"
echo "║  SmartCam MVP 开发环境启动脚本          ║"
echo "║  (第一版 PoC 快速验证)                  ║"
echo "╚═════════════════════════════════════════╝"
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 第一阶段：启动容器
echo -e "${BLUE}[1/3] 启动开发容器...${NC}"
if docker ps 2>/dev/null | grep -q postgres; then
    echo "容器已运行"
else
    docker-compose -f scripts/docker-compose.dev.yml up -d
    echo "等待容器启动..."
    sleep 5
fi

# 等待 PostgreSQL
echo "等待 PostgreSQL 就绪..."
for i in {1..30}; do
    if docker-compose -f scripts/docker-compose.dev.yml exec -T postgres pg_isready -U smartcam 2>/dev/null; then
        echo -e "${GREEN}✓ PostgreSQL 已就绪${NC}"
        break
    fi
    sleep 1
done

# 第二阶段：验证环境
echo ""
echo -e "${BLUE}[2/3] 验证开发环境...${NC}"
bash scripts/check-dev-env.sh

# 第三阶段：显示启动信息
echo ""
echo -e "${BLUE}[3/3] 启动完成${NC}"
echo ""
echo "╔═════════════════════════════════════════╗"
echo "║         🚀 准备就绪 - 开始开发          ║"
echo "╚═════════════════════════════════════════╝"
echo ""

echo "📌 后端开发（新终端）："
echo "   cd backend"
echo "   go run ./cmd/server"
echo ""

echo "📌 前端开发（新终端）："
echo "   cd frontend"
echo "   npm install"
echo "   npm run dev"
echo ""

echo "🌐 访问地址："
echo "   • 前端: http://127.0.0.1:5173"
echo "   • API:  http://127.0.0.1:8081"
echo "   • ZLM:  http://127.0.0.1:8080"
echo ""

echo "🗄️ 数据库连接："
echo "   psql -h 127.0.0.1 -U smartcam -d smartcam"
echo ""

echo "🔌 Redis 连接："
echo "   redis-cli -h 127.0.0.1"
echo ""

echo "📋 查看日志："
echo "   docker-compose -f scripts/docker-compose.dev.yml logs -f postgres"
echo "   docker-compose -f scripts/docker-compose.dev.yml logs -f redis"
echo "   docker-compose -f scripts/docker-compose.dev.yml logs -f zlm"
echo ""

echo "🛑 停止开发环境："
echo "   docker-compose -f scripts/docker-compose.dev.yml down"
echo ""
