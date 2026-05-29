#!/bin/bash
# SmartCam 生产环境部署脚本
# 用于将代码部署到远程 Linux 服务器

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 配置
DEPLOY_ENV=${1:-.env}
REMOTE_USER=${REMOTE_USER:-root}
REMOTE_HOST=${REMOTE_HOST}
REMOTE_PATH=${REMOTE_PATH:-/opt/smartcam}
DOCKER_IMAGE=${DOCKER_IMAGE:-smartcam:latest}

echo "=========================================="
echo -e "${BLUE}SmartCam 生产环境部署${NC}"
echo "=========================================="
echo ""

# 检查参数
if [ -z "$REMOTE_HOST" ]; then
    echo -e "${RED}❌ 未设置远程主机地址${NC}"
    echo ""
    echo "用法:"
    echo "  REMOTE_HOST=example.com REMOTE_USER=deploy bash deploy.sh"
    echo ""
    echo "可选参数:"
    echo "  REMOTE_PATH=/opt/smartcam  (默认: /opt/smartcam)"
    echo "  DEPLOY_ENV=.env.prod       (默认: .env)"
    exit 1
fi

echo "目标配置:"
echo "  主机: $REMOTE_USER@$REMOTE_HOST"
echo "  路径: $REMOTE_PATH"
echo "  环境: $DEPLOY_ENV"
echo ""

# 验证连接
echo "[1/6] 验证 SSH 连接..."
if ! ssh -q "$REMOTE_USER@$REMOTE_HOST" exit; then
    echo -e "${RED}❌ SSH 连接失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 连接成功${NC}"

# 创建远程目录
echo ""
echo "[2/6] 创建远程目录..."
ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_PATH"
echo -e "${GREEN}✓ 完成${NC}"

# 上传代码
echo ""
echo "[3/6] 上传代码..."
rsync -avz \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='backend/bin' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='.DS_Store' \
    "$SCRIPT_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"
echo -e "${GREEN}✓ 上传完成${NC}"

# 上传环境变量
if [ -f "$SCRIPT_DIR/$DEPLOY_ENV" ]; then
    echo ""
    echo "[4/6] 上传环境变量..."
    scp "$SCRIPT_DIR/$DEPLOY_ENV" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/.env"
    echo -e "${GREEN}✓ .env 已上传${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  找不到 $DEPLOY_ENV，跳过环境变量更新${NC}"
fi

# 远程构建
echo ""
echo "[5/6] 远程构建..."
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && bash setup-dev.sh"
echo -e "${GREEN}✓ 构建完成${NC}"

# 启动服务
echo ""
echo "[6/6] 启动服务..."
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_PATH && bash start-dev.sh"
echo -e "${GREEN}✓ 服务已启动${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}✓ 部署完成！${NC}"
echo "=========================================="
echo ""
echo "后续操作:"
echo "  ssh $REMOTE_USER@$REMOTE_HOST"
echo "  cd $REMOTE_PATH"
echo "  bash status-dev.sh           # 查看服务状态"
echo "  bash logs-dev.sh all         # 查看实时日志"
echo ""
