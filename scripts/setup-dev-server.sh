#!/bin/bash
# SmartCam 第一版 MVP 开发环境初始化脚本
# 配置 PostgreSQL、Redis、ZLMediaKit、Go、Node.js 等依赖

set -e

echo "=========================================="
echo "SmartCam MVP 开发环境初始化"
echo "=========================================="
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查权限
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ 此脚本需要 root 权限${NC}"
    echo "请用 sudo 运行"
    exit 1
fi

# 更新系统
echo -e "${BLUE}[1/8] 更新系统包${NC}"
apt-get update -qq
apt-get upgrade -y -qq
echo -e "${GREEN}✓ 系统已更新${NC}"

# 安装基础工具
echo ""
echo -e "${BLUE}[2/8] 安装基础工具${NC}"
apt-get install -y -qq \
    curl wget git vim nano \
    build-essential pkg-config \
    libssl-dev libffi-dev \
    net-tools htop tmux jq \
    ca-certificates gnupg lsb-release
echo -e "${GREEN}✓ 基础工具安装完成${NC}"

# 安装 Go 1.22+
echo ""
echo -e "${BLUE}[3/8] 检查/安装 Go 1.22+${NC}"
if ! command -v go &> /dev/null || [ $(go version | grep -oP '1\.\d+' | cut -d. -f2) -lt 22 ]; then
    echo "正在下载 Go 1.22.0..."
    wget -q https://go.dev/dl/go1.22.0.linux-amd64.tar.gz -O /tmp/go.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf /tmp/go.tar.gz
    rm /tmp/go.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
    source /etc/profile
    echo -e "${GREEN}✓ Go 1.22 安装完成${NC}"
else
    echo -e "${GREEN}✓ Go $(go version | awk '{print $3}') 已安装${NC}"
fi

# 安装 Node.js 20+
echo ""
echo -e "${BLUE}[4/8] 检查/安装 Node.js 20+${NC}"
if ! command -v node &> /dev/null || [ $(node -v | grep -oP 'v\d+' | cut -dv -f2) -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs
    echo -e "${GREEN}✓ Node.js 20 安装完成${NC}"
else
    echo -e "${GREEN}✓ Node.js $(node -v) 已安装${NC}"
fi

# 安装 PostgreSQL 15+
echo ""
echo -e "${BLUE}[5/8] 检查/安装 PostgreSQL 15+${NC}"
if ! command -v psql &> /dev/null; then
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-archive-keyring.gpg > /dev/null 2>&1
    echo "deb [signed-by=/usr/share/keyrings/postgresql-archive-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    apt-get update -qq
    apt-get install -y -qq postgresql-15 postgresql-contrib-15
    systemctl start postgresql
    systemctl enable postgresql
    echo -e "${GREEN}✓ PostgreSQL 15 安装完成${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL $(psql --version | awk '{print $3}') 已安装${NC}"
fi

# 安装 Redis
echo ""
echo -e "${BLUE}[6/8] 检查/安装 Redis${NC}"
if ! command -v redis-server &> /dev/null; then
    apt-get install -y -qq redis-server
    systemctl start redis-server
    systemctl enable redis-server
    echo -e "${GREEN}✓ Redis 安装完成${NC}"
else
    echo -e "${GREEN}✓ Redis $(redis-server --version | awk '{print $2}') 已安装${NC}"
fi

# 安装 Docker
echo ""
echo -e "${BLUE}[7/8] 检查/安装 Docker${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh > /dev/null 2>&1
    rm /tmp/get-docker.sh
    systemctl start docker
    systemctl enable docker
    usermod -aG docker $(id -u -n) || true
    echo -e "${GREEN}✓ Docker 安装完成${NC}"
else
    echo -e "${GREEN}✓ Docker $(docker --version) 已安装${NC}"
fi

# 安装 Docker Compose
echo ""
echo -e "${BLUE}[8/8] 检查/安装 Docker Compose${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose 安装完成${NC}"
else
    echo -e "${GREEN}✓ Docker Compose $(docker-compose --version) 已安装${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ 开发环境初始化完成！${NC}"
echo "=========================================="
echo ""
echo "下一步："
echo "  1. 配置 PostgreSQL:"
echo "     sudo -u postgres psql < /root/smartcam-db-init.sql"
echo ""
echo "  2. 配置 Redis（可选参数调优）"
echo ""
echo "  3. 启动 ZLMediaKit:"
echo "     docker-compose up -d zlm"
echo ""
echo "  4. 初始化项目:"
echo "     bash init-project.sh /opt/smartcam"
echo ""
