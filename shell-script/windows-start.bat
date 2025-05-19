@echo off
:: 设置代码页为UTF-8以正确显示中文
chcp 65001 > nul
:: 启用延迟变量扩展
setlocal enabledelayedexpansion

:: 设置窗口标题
title 启动 n8n...

:: 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
pushd "%~dp0"

echo 正在启动 n8n...
echo.

:: 检查fnm是否可用
where fnm >nul 2>&1
if errorlevel 1 (
    echo 错误: fnm 未找到，请确保 fnm 已正确安装并添加到PATH环境变量
    echo 按任意键退出...
    pause >nul
    exit /b 1
)

:: 检查pnpm是否可用
where pnpm >nul 2>&1
if errorlevel 1 (
    echo 错误: pnpm 未找到，请确保 pnpm 已正确安装并添加到PATH环境变量
    echo 按任意键退出...
    pause >nul
    exit /b 1
)

:: 设置Node.js版本
echo 正在设置Node.js版本...
call fnm env --use-on-cd > "%TEMP%\temp_env.bat"
if exist "%TEMP%\temp_env.bat" (
    call "%TEMP%\temp_env.bat"
    del "%TEMP%\temp_env.bat"
) else (
    echo 错误: 无法生成环境变量文件
    echo 按任意键退出...
    pause >nul
    exit /b 1
)

echo.

:: 启动n8n
echo 正在执行 pnpm start...
echo.
call pnpm start

:: 无论pnpm start是否成功，都保持窗口打开
echo.
if errorlevel 1 (
    echo pnpm start 执行时出现错误（错误代码: %errorlevel%）
) else (
    echo pnpm start 已结束
)

echo.
echo 按任意键退出...
pause >nul
exit /b %errorlevel%