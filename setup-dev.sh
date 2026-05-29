#!/bin/bash
# SmartCam 远程开发环境初始化脚本
# 用于设置 Go、Node.js、Docker 等依赖环境

set -e

echo "=========================================="
echo "SmartCam 开发环境初始化"
echo "=========================================="

# 检查并安装 Go
echo ""
echo "[1/5] 检查 Go 环境..."
if ! command -v go &> /dev/null; then
    echo "Go 未安装，正在下载 Go 1.22..."
    if command -v wget &> /dev/null; then
        wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz -O /tmp/go.tar.gz
    else
        curl -o /tmp/go.tar.gz https://go.dev/dl/go1.22.0.linux-amd64.tar.gz
    fi
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf /tmp/go.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    export PATH=$PATH:/usr/local/go/bin
    rm /tmp/go.tar.gz
    echo "Go 1.22 安装完成"
else
    echo "✓ Go 版本: $(go version)"
fi

# 检查并安装 Node.js
echo ""
echo "[2/5] 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo "Node.js 未安装，正在使用 nvm 安装 Node.js 20..."
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        . "$HOME/.nvm/nvm.sh"
    else
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
    nvm install 20
    nvm use 20
    echo "Node.js 20 安装完成"
else
    echo "✓ Node.js 版本: $(node -v)"
fi

# 检查并安装 Docker
echo ""
echo "[3/5] 检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    echo "Docker 未安装，正在安装..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    sudo usermod -aG docker $USER
    echo "Docker 安装完成，请重新登录以应用群组变更"
else
    echo "✓ Docker 版本: $(docker --version)"
fi

# 检查 Docker Compose
echo ""
echo "[4/5] 检查 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose 未安装，正在安装..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose 安装完成"
else
    echo "✓ Docker Compose 版本: $(docker-compose --version)"
fi

# 配置环境变量
echo ""
echo "[5/5] 配置环境变量..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ 已从 .env.example 复制 .env 模板"
        echo "⚠️  请立即编辑 .env，修改以下关键配置："
        echo "   - PUBLIC_API_BASE_URL=http://<你的服务器IP>:8081"
        echo "   - PUBLIC_STREAM_BASE_URL=http://<你的服务器IP>:8080"
        echo "   - HIK_NVR_HOST=<海康NVR的IP>"
        echo "   - HIK_NVR_USERNAME=<取流账号>"
        echo "   - HIK_NVR_PASSWORD=<取流密码>"
        echo "   - HIK_CAMERA_COUNT=<实际通道数>"
    else
        echo "❌ 找不到 .env.example"
    fi
else
    echo "✓ .env 已存在"
fi

echo ""
echo "=========================================="
echo "✓ 环境初始化完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 编辑 .env 文件，配置 NVR 和服务器地址"
echo "2. 运行: bash start-dev.sh"
echo ""
