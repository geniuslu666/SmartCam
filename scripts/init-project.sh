#!/bin/bash
# SmartCam 项目结构初始化脚本
# 为 Go 后端和 React 前端创建完整的项目目录和配置

set -e

PROJECT_DIR=${1:-.}

echo "=========================================="
echo "SmartCam MVP 项目初始化"
echo "=========================================="
echo ""
echo "项目路径: $PROJECT_DIR"
echo ""

if [ -d "$PROJECT_DIR/backend" ] && [ -d "$PROJECT_DIR/frontend" ]; then
    echo "ℹ️  项目已存在，跳过目录创建"
else
    echo "[1/3] 创建项目目录结构..."
    mkdir -p $PROJECT_DIR/{backend,frontend,ops}
    echo "✓ 目录创建完成"
fi

# ===== 后端项目结构 =====

echo ""
echo "[2/3] 初始化 Go 后端项目..."

BACKEND_DIR="$PROJECT_DIR/backend"

# 创建后端目录结构
mkdir -p \
    $BACKEND_DIR/cmd/server \
    $BACKEND_DIR/internal/models \
    $BACKEND_DIR/internal/repository \
    $BACKEND_DIR/internal/service \
    $BACKEND_DIR/internal/handler \
    $BACKEND_DIR/internal/middleware \
    $BACKEND_DIR/pkg/config \
    $BACKEND_DIR/pkg/logger \
    $BACKEND_DIR/pkg/errors \
    $BACKEND_DIR/pkg/utils \
    $BACKEND_DIR/migrations \
    $BACKEND_DIR/test

# 创建 go.mod
if [ ! -f "$BACKEND_DIR/go.mod" ]; then
    cat > "$BACKEND_DIR/go.mod" << 'EOF'
module github.com/smartcam/backend

go 1.22

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/jinzhu/gorm v1.9.16
	github.com/lib/pq v1.10.9
	github.com/redis/go-redis/v9 v9.0.5
	github.com/golang-jwt/jwt/v5 v5.0.0
	github.com/spf13/viper v1.16.0
	go.uber.org/zap v1.26.0
	github.com/google/uuid v1.3.0
	golang.org/x/crypto v0.13.0
)
EOF
fi

# 创建 main.go
if [ ! -f "$BACKEND_DIR/cmd/server/main.go" ]; then
    cat > "$BACKEND_DIR/cmd/server/main.go" << 'EOF'
package main

import (
	"fmt"
	"github.com/smartcam/backend/internal/handler"
	"github.com/smartcam/backend/pkg/config"
	"github.com/smartcam/backend/pkg/logger"
)

func main() {
	// 初始化配置
	cfg := config.Load()
	
	// 初始化日志
	log := logger.New()
	defer log.Sync()

	log.Infow("Starting SmartCam Server", "version", "1.0.0")
	
	// 初始化处理器
	r := handler.Setup()
	
	// 启动服务器
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Infow("Server listening", "addr", addr)
	
	if err := r.Run(addr); err != nil {
		log.Fatalw("Server error", "error", err)
	}
}
EOF
fi

# 创建配置文件示例
if [ ! -f "$BACKEND_DIR/.env.example" ]; then
    cat > "$BACKEND_DIR/.env.example" << 'EOF'
# 服务器配置
SERVER_PORT=8081
SERVER_HOST=0.0.0.0
GIN_MODE=debug

# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=smartcam
DB_USER=smartcam
DB_PASSWORD=smartcam_dev_pass

# Redis 配置
REDIS_ADDR=127.0.0.1:6379
REDIS_PASSWORD=
REDIS_DB=0

# ZLMediaKit 配置
ZLM_API_URL=http://127.0.0.1:8081
ZLM_SECRET=035c73f7-bb6f-4a59-abf7-3a47ddf33d0e
ZLM_ENABLED=false

# JWT 配置
JWT_SECRET=your-super-secret-key-change-in-production

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json

# 播放配置
PLAY_SESSION_TIMEOUT_SECONDS=3600
MAX_CONCURRENT_STREAMS_PER_USER=4
MAX_CONCURRENT_STREAMS_PER_PROPERTY=50
STREAM_IDLE_TIMEOUT_SECONDS=30
EOF
fi

echo "✓ Go 后端项目结构创建完成"

# ===== 前端项目结构 =====

echo ""
echo "[3/3] 初始化 React 前端项目..."

FRONTEND_DIR="$PROJECT_DIR/frontend"

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    # 创建前端目录结构
    mkdir -p \
        $FRONTEND_DIR/src/{components,pages,hooks,services,types,utils,styles} \
        $FRONTEND_DIR/public
    
    # 创建 package.json
    cat > "$FRONTEND_DIR/package.json" << 'EOF'
{
  "name": "smartcam-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.0.5",
    "shadcn-ui": "latest",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.9.0",
    "axios": "^1.5.0",
    "lucide-react": "^0.290.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.2.0"
  }
}
EOF

    # 创建 vite.config.ts
    cat > "$FRONTEND_DIR/vite.config.ts" << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        pathRewrite: { '^/api': '/api' },
      },
    },
  },
})
EOF

    # 创建 index.html
    cat > "$FRONTEND_DIR/index.html" << 'EOF'
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SmartCam - NVR 集中监控</title>
  </head>
  <body class="dark">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

    # 创建 main.tsx
    cat > "$FRONTEND_DIR/src/main.tsx" << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

    # 创建 App.tsx
    cat > "$FRONTEND_DIR/src/App.tsx" << 'EOF'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import './App.css'

const queryClient = new QueryClient()

function App() {
  const [count, setCount] = useState(0)

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-900">
        <div className="text-center text-white p-8">
          <h1 className="text-4xl font-bold mb-4">SmartCam MVP</h1>
          <p className="text-lg mb-8">NVR 集中监控系统 v1.0</p>
          <button
            onClick={() => setCount((count) => count + 1)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            count is {count}
          </button>
        </div>
      </div>
    </QueryClientProvider>
  )
}

export default App
EOF

    # 创建 全局样式
    cat > "$FRONTEND_DIR/src/styles/globals.css" << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 214.3 93.3% 51.8%;
  --primary-foreground: 222.2 47.6% 11.2%;
}

body {
  color: var(--foreground);
  background-color: var(--background);
  font-family: system-ui, -apple-system, sans-serif;
}
EOF

    # 创建 tailwind.config.js
    cat > "$FRONTEND_DIR/tailwind.config.js" << 'EOF'
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

    # 创建 tsconfig.json
    cat > "$FRONTEND_DIR/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

fi

echo "✓ React 前端项目结构创建完成"

echo ""
echo "=========================================="
echo "✓ 项目初始化完成！"
echo "=========================================="
echo ""
echo "后端开发（Go）:"
echo "  cd $BACKEND_DIR"
echo "  go mod download"
echo "  go run ./cmd/server"
echo ""
echo "前端开发（React）:"
echo "  cd $FRONTEND_DIR"
echo "  npm install"
echo "  npm run dev"
echo ""
echo "访问地址:"
echo "  前端: http://127.0.0.1:5173"
echo "  API:  http://127.0.0.1:8081"
echo ""
