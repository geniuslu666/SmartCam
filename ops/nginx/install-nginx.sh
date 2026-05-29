#!/bin/bash
# SmartCam Nginx 反向代理安装脚本

set -e

echo "=========================================="
echo "配置 Nginx 反向代理"
echo "=========================================="
echo ""

# 检查权限
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 此脚本需要 root 权限"
    exit 1
fi

# 检查 Nginx 安装
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx 未安装"
    echo "请先安装: apt-get install nginx"
    exit 1
fi

DOMAIN=${1:-smartcam.example.com}
CONFIG_NAME=$(echo $DOMAIN | tr '.' '_')

echo "域名: $DOMAIN"
echo ""

# 创建配置文件
echo "[1/3] 创建 Nginx 配置..."
cp /root/webroot/SmartCam/ops/nginx/smartcam.conf.example /etc/nginx/sites-available/$CONFIG_NAME

# 替换域名
sed -i "s|smartcam.example.com|$DOMAIN|g" /etc/nginx/sites-available/$CONFIG_NAME

echo "✓ 配置文件创建完成"

# 创建符号链接
echo "[2/3] 启用站点..."
if [ -L /etc/nginx/sites-enabled/$CONFIG_NAME ]; then
    rm /etc/nginx/sites-enabled/$CONFIG_NAME
fi
ln -s /etc/nginx/sites-available/$CONFIG_NAME /etc/nginx/sites-enabled/$CONFIG_NAME
echo "✓ 站点已启用"

# 测试配置
echo "[3/3] 测试 Nginx 配置..."
nginx -t
echo "✓ 配置测试通过"

echo ""
echo "=========================================="
echo "✓ 配置完成！"
echo "=========================================="
echo ""
echo "后续操作："
echo ""
echo "1. 编辑配置文件（配置 SSL 证书等）："
echo "   nano /etc/nginx/sites-available/$CONFIG_NAME"
echo ""
echo "2. 重载 Nginx："
echo "   systemctl reload nginx"
echo ""
echo "3. 查看日志："
echo "   tail -f /var/log/nginx/smartcam-access.log"
echo "   tail -f /var/log/nginx/smartcam-error.log"
echo ""
echo "4. 配置 SSL 证书（使用 Let's Encrypt）："
echo "   apt-get install certbot python3-certbot-nginx"
echo "   certbot --nginx -d $DOMAIN"
echo ""
