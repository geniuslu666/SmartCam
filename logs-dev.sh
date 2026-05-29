#!/bin/bash
# SmartCam 日志查看脚本

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色输出
BLUE='\033[0;34m'
NC='\033[0m'

# 解析参数
SERVICE=${1:-all}

case $SERVICE in
    backend|后端)
        echo -e "${BLUE}后端日志:${NC}"
        tail -f "$PROJECT_ROOT/backend.log"
        ;;
    frontend|前端)
        echo -e "${BLUE}前端日志:${NC}"
        tail -f "$PROJECT_ROOT/frontend.log"
        ;;
    all|全部)
        echo -e "${BLUE}监控所有服务日志...${NC}"
        # 使用 tail 同时监控两个文件
        tail -f "$PROJECT_ROOT/backend.log" "$PROJECT_ROOT/frontend.log"
        ;;
    *)
        echo "用法: bash logs-dev.sh [backend|frontend|all]"
        echo ""
        echo "示例:"
        echo "  bash logs-dev.sh backend    # 查看后端日志"
        echo "  bash logs-dev.sh frontend   # 查看前端日志"
        echo "  bash logs-dev.sh all        # 查看所有日志"
        ;;
esac
