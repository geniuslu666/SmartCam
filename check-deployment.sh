#!/bin/bash
# SmartCam 部署检查清单

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo -e "${BLUE}SmartCam 部署检查清单${NC}"
echo "=========================================="
echo ""

FAILED=0

# 检查函数
check_command() {
    local cmd=$1
    local name=$2
    if command -v $cmd &> /dev/null; then
        echo -e "${GREEN}✓${NC} $name 已安装 ($(${cmd} --version 2>/dev/null | head -1))"
    else
        echo -e "${RED}✗${NC} $name 未安装"
        FAILED=$((FAILED + 1))
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

check_port() {
    local port=$1
    local name=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name 端口 $port 已监听"
    else
        echo -e "${YELLOW}⚠${NC} $name 端口 $port 未监听"
    fi
}

# 环境依赖
echo -e "${BLUE}[1/5] 环境依赖${NC}"
check_command "go" "Go"
check_command "node" "Node.js"
check_command "npm" "npm"
check_command "docker" "Docker"
check_command "docker-compose" "Docker Compose"
check_command "git" "Git"

# 配置文件
echo ""
echo -e "${BLUE}[2/5] 配置文件${NC}"
check_file ".env" ".env"
check_file ".env.example" ".env.example"
check_file "docker-compose.yml" "docker-compose.yml"

# 源代码
echo ""
echo -e "${BLUE}[3/5] 源代码${NC}"
check_file "backend/cmd/server/main.go" "后端入口"
check_file "frontend/package.json" "前端配置"
check_file "README.md" "项目说明"

# 部署脚本
echo ""
echo -e "${BLUE}[4/5] 部署脚本${NC}"
check_file "setup-dev.sh" "环境初始化脚本"
check_file "start-dev.sh" "启动脚本"
check_file "restart-dev.sh" "重启脚本"
check_file "status-dev.sh" "状态查看脚本"
check_file "logs-dev.sh" "日志脚本"
check_file "deploy.sh" "部署脚本"

# 服务运行状态
echo ""
echo -e "${BLUE}[5/5] 服务运行状态${NC}"
check_port "5173" "前端"
check_port "8081" "后端 API"
check_port "8080" "流媒体"

# 检查 Docker 容器
if command -v docker &> /dev/null; then
    echo ""
    if docker ps 2>/dev/null | grep -q "zlm"; then
        echo -e "${GREEN}✓${NC} ZLMediaKit 容器运行中"
    else
        echo -e "${YELLOW}⚠${NC} ZLMediaKit 容器未运行"
    fi
fi

# 检查环境变量
echo ""
echo -e "${BLUE}环境变量检查:${NC}"
if [ -f ".env" ]; then
    # 检查关键变量
    for var in PUBLIC_API_BASE_URL HIK_NVR_HOST HIK_NVR_USERNAME HIK_NVR_PASSWORD; do
        if grep -q "^$var=" .env; then
            echo -e "${GREEN}✓${NC} $var 已配置"
        else
            echo -e "${RED}✗${NC} $var 未配置"
            FAILED=$((FAILED + 1))
        fi
    done
else
    echo -e "${RED}✗${NC} .env 未找到"
    FAILED=$((FAILED + 1))
fi

# 健康检查
echo ""
echo -e "${BLUE}健康检查:${NC}"

if command -v curl &> /dev/null; then
    # 检查后端
    if curl -s http://127.0.0.1:8081/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 后端 API 健康检查通过"
    else
        echo -e "${YELLOW}⚠${NC} 后端 API 健康检查失败"
    fi
    
    # 检查前端
    if curl -s http://127.0.0.1:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 前端可访问"
    else
        echo -e "${YELLOW}⚠${NC} 前端不可访问"
    fi
fi

# 总结
echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！${NC}"
    echo "SmartCam 已准备就绪。"
else
    echo -e "${RED}✗ 有 $FAILED 项检查失败${NC}"
    echo "请根据上面的错误信息进行修复。"
fi
echo "=========================================="
echo ""

# 建议
echo -e "${BLUE}后续建议:${NC}"
echo ""
echo "开发环境："
echo "  1. 查看服务状态: bash status-dev.sh"
echo "  2. 查看实时日志: bash logs-dev.sh all"
echo "  3. 重启服务: bash restart-dev.sh"
echo ""
echo "生产环境："
echo "  1. 安装 systemd 服务: sudo bash ops/systemd/install-service.sh"
echo "  2. 配置 Nginx: sudo bash ops/nginx/install-nginx.sh your-domain.com"
echo "  3. 配置 SSL: sudo certbot --nginx -d your-domain.com"
echo ""

exit $FAILED
