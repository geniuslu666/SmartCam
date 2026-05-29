#!/bin/bash
# SmartCam MVP 开发环境完整检查清单
# 在启动开发之前运行此脚本验证所有配置

set -e

echo "=========================================="
echo "SmartCam MVP 开发环境检查清单"
echo "=========================================="
echo ""

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FAILED=0

# 检查函数
check_command() {
    local cmd=$1
    local name=$2
    if command -v $cmd &> /dev/null; then
        local version=$($cmd --version 2>/dev/null | head -1 || echo "")
        echo -e "${GREEN}✓${NC} $name 已安装 ($version)"
    else
        echo -e "${RED}✗${NC} $name 未安装"
        FAILED=$((FAILED + 1))
    fi
}

check_service() {
    local name=$1
    local port=$2
    if nc -z 127.0.0.1 $port 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $name 运行中 (端口 $port)"
    else
        echo -e "${YELLOW}⚠${NC} $name 未运行 (端口 $port)"
    fi
}

check_file() {
    local file=$1
    local name=$2
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $name 存在"
    else
        echo -e "${RED}✗${NC} $name 不存在"
        FAILED=$((FAILED + 1))
    fi
}

# ===== 1. 系统依赖 =====
echo -e "${BLUE}[1/5] 系统依赖${NC}"
check_command "go" "Go"
check_command "node" "Node.js"
check_command "npm" "npm"
check_command "docker" "Docker"
check_command "docker-compose" "Docker Compose"
check_command "psql" "PostgreSQL Client"
check_command "redis-cli" "Redis CLI"
check_command "curl" "curl"
check_command "git" "Git"

# ===== 2. 配置文件 =====
echo ""
echo -e "${BLUE}[2/5] 配置文件${NC}"
check_file ".env" "环境变量"
check_file "backend/.env" "后端配置"
check_file "scripts/smartcam-db-init.sql" "数据库初始化脚本"
check_file "ops/zlm/config.ini.dev" "ZLMediaKit 配置"

# ===== 3. 数据库 =====
echo ""
echo -e "${BLUE}[3/5] 数据库检查${NC}"
if command -v psql &> /dev/null; then
    if psql -h 127.0.0.1 -U postgres -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} PostgreSQL 可连接"
        if psql -h 127.0.0.1 -U smartcam -d smartcam -c "SELECT 1" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} smartcam 数据库已初始化"
        else
            echo -e "${YELLOW}⚠${NC} smartcam 数据库未初始化"
        fi
    else
        echo -e "${YELLOW}⚠${NC} PostgreSQL 不可连接"
    fi
else
    echo -e "${YELLOW}⚠${NC} PostgreSQL 未安装"
fi

# ===== 4. 缓存和消息队列 =====
echo ""
echo -e "${BLUE}[4/5] 缓存和服务${NC}"
check_service "Redis" 6379
check_service "PostgreSQL" 5432
check_service "ZLMediaKit HTTP" 8080

# ===== 5. 项目结构 =====
echo ""
echo -e "${BLUE}[5/5] 项目结构${NC}"
check_file "backend/cmd/server/main.go" "后端主入口"
check_file "backend/go.mod" "后端依赖"
check_file "frontend/package.json" "前端依赖"
check_file "frontend/vite.config.ts" "Vite 配置"
check_file "frontend/src/main.tsx" "前端主入口"

# ===== 环境变量验证 =====
echo ""
echo -e "${BLUE}环境变量检查${NC}"
if [ -f ".env" ]; then
    # 关键配置项
    for var in DB_HOST DB_NAME DB_USER REDIS_ADDR; do
        if grep -q "^$var=" .env; then
            VALUE=$(grep "^$var=" .env | cut -d= -f2)
            echo -e "${GREEN}✓${NC} $var = $VALUE"
        else
            echo -e "${YELLOW}⚠${NC} $var 未配置"
        fi
    done
fi

# ===== 端口检查 =====
echo ""
echo -e "${BLUE}端口占用检查${NC}"
PORTS=(5173 8081 8080 8082 554 6379 5432)
for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠${NC} 端口 $port 已被占用"
    else
        echo -e "${GREEN}✓${NC} 端口 $port 可用"
    fi
done

# ===== 总结 =====
echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！${NC}"
    echo "可以开始开发了。"
else
    echo -e "${RED}✗ 有 $FAILED 项检查失败${NC}"
    echo "请根据上面的错误信息进行修复。"
fi
echo "=========================================="
echo ""

echo -e "${BLUE}后续操作${NC}"
echo ""
echo "1. 启动开发环境（如果还未启动）:"
echo "   docker-compose -f scripts/docker-compose.dev.yml up -d"
echo ""
echo "2. 后端开发:"
echo "   cd backend"
echo "   go mod download"
echo "   go run ./cmd/server"
echo ""
echo "3. 前端开发（新终端）:"
echo "   cd frontend"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "4. 访问:"
echo "   前端: http://127.0.0.1:5173"
echo "   API:  http://127.0.0.1:8081"
echo "   ZLM:  http://127.0.0.1:8080"
echo ""
echo "5. 数据库管理:"
echo "   psql -h 127.0.0.1 -U smartcam -d smartcam"
echo ""
echo "6. Redis CLI:"
echo "   redis-cli -h 127.0.0.1"
echo ""

exit $FAILED
