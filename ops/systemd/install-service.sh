#!/bin/bash
# SmartCam 生产环境 systemd 安装脚本

set -e

echo "=========================================="
echo "安装 SmartCam 为 systemd 服务"
echo "=========================================="
echo ""

# 检查权限
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 此脚本需要 root 权限"
    exit 1
fi

SMARTCAM_PATH=${1:-/opt/smartcam}

echo "SmartCam 路径: $SMARTCAM_PATH"
echo ""

# 创建 smartcam 用户
echo "[1/5] 创建 smartcam 用户..."
if ! id smartcam &>/dev/null; then
    useradd -r -s /bin/bash -d $SMARTCAM_PATH smartcam
    echo "✓ 用户创建完成"
else
    echo "✓ 用户已存在"
fi

# 设置目录权限
echo "[2/5] 设置目录权限..."
chown -R smartcam:smartcam $SMARTCAM_PATH
chmod -R 755 $SMARTCAM_PATH
echo "✓ 权限设置完成"

# 安装后端服务
echo "[3/5] 安装后端服务..."
cp $SMARTCAM_PATH/ops/systemd/smartcam-backend.service.example /etc/systemd/system/smartcam-backend.service
sed -i "s|/opt/smartcam|$SMARTCAM_PATH|g" /etc/systemd/system/smartcam-backend.service
systemctl daemon-reload
echo "✓ 后端服务安装完成"

# 安装前端服务
echo "[4/5] 安装前端服务..."
cp $SMARTCAM_PATH/ops/systemd/smartcam-frontend.service.example /etc/systemd/system/smartcam-frontend.service
sed -i "s|/opt/smartcam|$SMARTCAM_PATH|g" /etc/systemd/system/smartcam-frontend.service
systemctl daemon-reload
echo "✓ 前端服务安装完成"

# 启用服务
echo "[5/5] 启用服务..."
systemctl enable smartcam-backend
systemctl enable smartcam-frontend
echo "✓ 服务已启用"

echo ""
echo "=========================================="
echo "✓ 安装完成！"
echo "=========================================="
echo ""
echo "下一步操作："
echo ""
echo "启动服务："
echo "  systemctl start smartcam-backend"
echo "  systemctl start smartcam-frontend"
echo ""
echo "查看状态："
echo "  systemctl status smartcam-backend"
echo "  systemctl status smartcam-frontend"
echo ""
echo "查看日志："
echo "  journalctl -u smartcam-backend -f"
echo "  journalctl -u smartcam-frontend -f"
echo ""
echo "停止服务："
echo "  systemctl stop smartcam-backend"
echo "  systemctl stop smartcam-frontend"
echo ""
echo "重启服务："
echo "  systemctl restart smartcam-backend"
echo "  systemctl restart smartcam-frontend"
echo ""
