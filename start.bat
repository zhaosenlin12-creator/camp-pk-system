@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   🐾 乐享宠物 启动脚本
echo ========================================
echo.

if not exist "node_modules" (
    echo 📦 正在安装后端依赖...
    call npm install
)

if not exist "client\node_modules" (
    echo 📦 正在安装前端依赖...
    cd client
    call npm install
    cd ..
)

if not exist "database\data.json" (
    echo 🗂️ 正在初始化数据文件...
    call npm run init-db
)

echo.
echo ✅ 准备完成，正在启动开发环境...
echo.
echo 📺 展示页面: http://localhost:5173
echo 🔧 管理后台: http://localhost:5173/admin
echo 🔑 管理员密码: 使用环境变量 ADMIN_PIN，或查看后端首次启动日志
echo.
echo 按 Ctrl+C 停止服务
echo.

call npm run dev
