@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   🎮 创赛营积分PK系统 - 生产模式
echo ========================================
echo.

:: 检查dist目录
if not exist "client\dist\index.html" (
    echo 📦 正在构建前端...
    cd client
    call npm run build
    cd ..
)

echo.
echo ✅ 启动服务...
echo.

:: 启动后端服务
node server\index.js
