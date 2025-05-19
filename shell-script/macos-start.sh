#!/bin/bash

echo "启动 n8n..."

# 确保 fnm 环境已加载
export PATH=$HOME/.fnm:$PATH
eval "$(fnm env --use-on-cd)"

echo "执行 pnpm start..."
pnpm start

echo
echo "按回车键退出..."
read

echo "启动 n8n..."

# 确保 fnm 环境已加载
export PATH=$HOME/.fnm:$PATH
eval "$(fnm env --use-on-cd)"

echo "执行 pnpm start..."
pnpm start

echo
echo "按回车键退出..."
read
