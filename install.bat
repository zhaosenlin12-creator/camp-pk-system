@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   🎮 创赛营积分PK系统 安装脚本
echo ========================================
echo.

echo 📦 正在安装后端依赖...
call npm install

echo.
echo 📦 正在安装前端依赖...
cd client
call npm install
cd ..

echo.
echo 🗄️ 正在初始化数据库...
call npm run init-db

echo.
echo ========================================
echo   ✅ 安装完成！
echo ========================================
echo.
echo 运行 start.bat 启动系统
echo 或者运行: npm run dev
echo.
pause
