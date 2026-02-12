#!/bin/bash
# 营地PK系统一键重启脚本

echo "🎮 开始重启营地PK系统..."
echo "================================================"

# ===== 第一步：设置Node环境 =====
echo "🔧 设置Node.js环境..."
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
node --version
npm --version
pm2 --version

# ===== 第二步：进入项目目录 =====
cd /www/wwwroot/camp-pk-system

# ===== 第三步：停止旧进程 =====
echo ""
echo "⏹️  停止旧进程..."
pm2 stop camp-pk-system 2>/dev/null
pm2 delete camp-pk-system 2>/dev/null

# ===== 第四步：启动服务（端口3004）=====
echo ""
echo "🚀 启动营地PK系统..."
pm2 start ecosystem.config.js --env production

# 等待启动
echo "   等待服务启动..."
sleep 3

# ===== 第五步：验证服务 =====
echo ""
echo "🔍 验证服务..."
if curl -s http://localhost:3004 > /dev/null; then
  echo "   ✅ 服务启动成功"
else
  echo "   ⚠️  服务启动失败，请查看日志: pm2 logs camp-pk-system"
fi

# ===== 第六步：保存PM2配置 =====
echo ""
echo "💾 保存PM2配置..."
pm2 save

# ===== 第七步：显示状态 =====
echo ""
echo "================================================"
echo "✅ 营地PK系统重启完成！"
echo "================================================"
echo ""
pm2 list
echo ""
echo "📊 查看日志："
echo "  pm2 logs camp-pk-system"
echo ""
echo "🌐 访问地址："
echo "  展示页面: https://camp.codebn.cn"
echo "  管理后台: https://camp.codebn.cn/admin"
echo ""
echo "🔍 验证命令："
echo "  curl http://localhost:3004"
