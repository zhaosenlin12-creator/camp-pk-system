@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   🎮 创赛营积分PK系统 启动脚本
echo ========================================
echo.

:: 检查是否已安装依赖
if not exist "node_modules" (
    echo 📦 首次运行，正在安装后端依赖...
    call npm install
)

if not exist "client\node_modules" (
    echo 📦 正在安装前端依赖...
    cd client
    call npm install
    cd ..
)

:: 检查数据库是否存在
if not exist "database\camp.db" (
    echo 🗄️ 正在初始化数据库...
    call npm run init-db
)

echo.
echo ✅ 准备就绪！正在启动系统...
echo.
echo 📺 展示页面: http://localhost:5173
echo 🔧 管理后台: http://localhost:5173/admin (PIN: 8888)
echo.
echo 按 Ctrl+C 停止服务
echo.

:: 启动服务
call npm run dev
