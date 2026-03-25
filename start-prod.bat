@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   🐾 乐享宠物 - 生产模式
echo ========================================
echo.

if not exist "client\dist\index.html" (
    echo 📦 正在构建前端...
    cd client
    call npm run build
    cd ..
)

echo.
echo ✅ 启动生产服务...
echo.

node server\index.js
