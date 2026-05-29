.PHONY: setup start restart stop status logs clean help

SHELL := /bin/bash

help:
	@echo "SmartCam 开发命令速查表"
	@echo ""
	@echo "初始化:"
	@echo "  make setup       初始化开发环境（首次运行）"
	@echo ""
	@echo "开发:"
	@echo "  make start       启动所有服务"
	@echo "  make restart     重启所有服务"
	@echo "  make stop        停止所有服务"
	@echo "  make status      查看服务状态"
	@echo "  make logs        查看实时日志"
	@echo ""
	@echo "后端命令:"
	@echo "  make backend-fmt 格式化后端代码"
	@echo "  make backend-vet 后端代码检查"
	@echo "  make backend-test 运行后端单元测试"
	@echo ""
	@echo "前端命令:"
	@echo "  make frontend-lint 前端代码检查"
	@echo "  make frontend-build 构建前端生产版本"
	@echo ""
	@echo "部署:"
	@echo "  make docker-up   启动 ZLMediaKit Docker"
	@echo "  make docker-down 停止 ZLMediaKit Docker"
	@echo "  make docker-logs ZLMediaKit Docker 日志"
	@echo ""
	@echo "清理:"
	@echo "  make clean       清理日志和临时文件"
	@echo ""

setup:
	@bash setup-dev.sh

start:
	@bash start-dev.sh

restart:
	@bash restart-dev.sh

stop:
	@bash -c 'set -a; [ -f .env ] && source .env; set +a; bash restart-dev.sh' || true
	@rm -f .backend.pid .frontend.pid
	@echo "✓ 所有服务已停止"

status:
	@bash status-dev.sh

logs:
	@bash logs-dev.sh all

logs-backend:
	@bash logs-dev.sh backend

logs-frontend:
	@bash logs-dev.sh frontend

backend-fmt:
	@echo "格式化后端代码..."
	@cd backend && go fmt ./...
	@echo "✓ 完成"

backend-vet:
	@echo "后端代码检查..."
	@cd backend && go vet ./...
	@echo "✓ 检查通过"

backend-test:
	@echo "运行后端单元测试..."
	@cd backend && go test -v ./...

frontend-lint:
	@echo "前端代码检查..."
	@cd frontend && npm run lint
	@echo "✓ 检查通过"

frontend-build:
	@echo "构建前端生产版本..."
	@cd frontend && npm run build
	@echo "✓ 构建完成，输出目录: frontend/dist"

docker-up:
	@echo "启动 ZLMediaKit..."
	@docker-compose up -d zlm
	@echo "✓ ZLMediaKit 已启动"

docker-down:
	@echo "停止 ZLMediaKit..."
	@docker-compose down zlm
	@echo "✓ ZLMediaKit 已停止"

docker-logs:
	@docker-compose logs -f zlm

clean:
	@echo "清理日志和临时文件..."
	@rm -f backend.log frontend.log .backend.pid .frontend.pid
	@echo "✓ 清理完成"

.DEFAULT_GOAL := help
