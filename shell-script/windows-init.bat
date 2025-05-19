@echo off
:: 设置代码页为UTF-8以正确显示中文
chcp 65001 > nul
:: 启用延迟变量扩展
setlocal enabledelayedexpansion

echo 开始初始化 Windows 环境...

echo.
echo [1/4] 安装 fnm...
winget source remove winget
winget source add winget https://mirrors.ustc.edu.cn/winget-source
winget install Schniz.fnm --source winget --silent --accept-source-agreements --accept-package-agreements 
if errorlevel 1 (
    echo 错误: 无法安装 fnm
    echo 按任意键退出...
    pause > nul
    exit /b 1
)

echo.
echo [2/4] 设置 fnm 环境变量并安装 Node.js v20...
:: 设置 fnm 的环境变量

if not defined FNM_AUTORUN_GUARD (
    set "FNM_AUTORUN_GUARD=AutorunGuard"
    FOR /f "tokens=*" %%z IN ('fnm env --use-on-cd') DO CALL %%z
)

:: 使用 where 查找 fnm 的路径
for /f "delims=" %%a in ('where fnm') do set "FNM_PATH=%%a"

:: 直接使用完整路径安装 Node.js
call "%FNM_PATH%" install 20
if errorlevel 1 (
    echo 错误: 无法安装 Node.js v20
    echo 按任意键退出...
    pause > nul
    exit /b 1
)

:: 将Node.js添加到系统PATH
for /f "tokens=*" %%z in ('"%FNM_PATH%" env --use-on-cd') do (
    set "line=%%z"
    if "!line:~0,4!"=="set " (
        set "var=!line:~4!"
        for /f "tokens=1* delims==" %%a in ("!var!") do (
            setx %%a "%%b" > nul
        )
    )
    if "!line:~0,7!"=="set PATH" (
        set "path_part=!line:~8!"
        setx PATH "!path_part!;%PATH%" > nul
    )
)

echo.
echo [3/4] 启用 pnpm...
call corepack enable pnpm
if errorlevel 1 (
    echo 错误: 无法启用 pnpm
    echo 按任意键退出...
    pause > nul
    exit /b 1
)

:: 将pnpm添加到系统PATH
where pnpm >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%p in ('where pnpm') do (
        set "pnpm_dir=%%~dp"
        setx PATH "!pnpm_dir!;%PATH%" > nul
    )
)

call pnpm config set registry https://registry.npmmirror.com/
if errorlevel 1 (
    echo 错误: 无法设置 pnpm 镜像源
    echo 按任意键退出...
    pause > nul
    exit /b 1
)

echo.
echo [4/4] 安装依赖包...
echo.
echo 检查当前目录: "%~dp0"

pushd "%~dp0"
call pnpm install
if errorlevel 1 (
    echo 错误: 无法安装依赖包
    echo 按任意键退出...
    popd
    pause > nul
    exit /b 1
)

echo.
echo ✅ 初始化完成！
echo 验证安装:
echo node -v
call node -v

echo pnpm -v
call pnpm -v

echo 按任意键退出...
pause > nul