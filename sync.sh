#!/bin/bash

# 1. 自动添加所有变更
git add .

# 2. 自动抓取当前时间，组合成自动化注释
current_time=$(date "+%Y-%m-%d %H:%M:%S")
commit_message="Auto-Deploy Sync: $current_time"

echo "🚀 正在本地提交，注释为: $commit_message"
git commit -m "$commit_message"

# 3. 推送到 GitHub
echo "📡 正在同步推送至 GitHub..."
git push origin main

echo "✅ 全自动同步已完成！"
