#!/bin/bash

echo "开始初始化 macOS 环境..."

# 检测是否安装了 Homebrew
if ! command -v brew &> /dev/null; then
    echo "检测到未安装 Homebrew，正在安装..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # 添加 Homebrew 到 PATH
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

echo
echo "[1/4] 安装 fnm..."
if command -v fnm &> /dev/null; then
    echo "fnm 已经安装"
else
    curl -fsSL https://fnm.vercel.app/install | bash

    # 添加 fnm 到 shell 配置
    export PATH=$HOME/.fnm:$PATH
    eval "$(fnm env --use-on-cd)"

    # 添加到 shell 配置文件
    echo 'export PATH=$HOME/.fnm:$PATH' >> ~/.zshrc
    echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
fi

echo
echo "[2/4] 安装 Node.js v20..."
fnm install 20
fnm use 20

echo
echo "[3/4] 启用 pnpm..."
corepack enable pnpm

echo
echo "[4/4] 安装依赖包..."
pnpm install

echo
echo "✅ 初始化完成！"
echo "验证安装:"
node -v
pnpm -v

echo
echo "按回车键退出..."
read
