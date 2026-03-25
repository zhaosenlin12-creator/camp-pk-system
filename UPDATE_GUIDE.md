# 乐享宠物更新与维护指南

这份文档只针对当前线上环境：

- 项目目录：`/www/wwwroot/camp-pk-system`
- 运行用户：`game`
- PM2 进程：`camp-pk-system`
- 服务端口：`3004`
- 域名：`https://camp.codebn.cn`

## 标准更新流程

### 1. 切换到运行用户

```bash
su - game
cd /www/wwwroot/camp-pk-system
```

### 2. 拉取最新代码

```bash
git fetch origin
git pull --ff-only origin main
```

### 3. 更新依赖并重新构建

```bash
npm install
cd client
npm install
npm run build
cd ..
```

### 4. 重启应用

```bash
pm2 restart camp-pk-system --update-env
pm2 save
```

### 5. 验证更新结果

```bash
curl -s http://127.0.0.1:3004/ | grep -E 'title|assets/index-'
curl -s http://127.0.0.1:3004/admin | grep -E 'title|assets/index-'
curl -s https://camp.codebn.cn/ | grep -E 'title|assets/index-'
curl -s https://camp.codebn.cn/admin | grep -E 'title|assets/index-'
curl -s https://camp.codebn.cn/api/version
```

## 如果首页还是旧版

这是宝塔代理缓存问题，不是前端包没更新。清理缓存并 reload：

```bash
rm -rf /www/server/nginx/proxy_cache_dir/*
nginx -t && systemctl reload nginx
```

然后重新验证：

```bash
curl -s https://camp.codebn.cn/ | grep -E 'title|assets/index-'
curl -I -s https://camp.codebn.cn/ | grep -iE 'cache-control|content-length|etag'
```

## 数据备份

更新前建议备份：

```bash
su - game
cd /www/wwwroot/camp-pk-system
tar -czf /tmp/lexiang-pet-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  database/data.json \
  uploads/photos \
  .secrets.enc
```

## 查看运行状态

```bash
su - game
pm2 list
pm2 logs camp-pk-system --lines 100
```

## 常见维护操作

### 重启服务

```bash
su - game
cd /www/wwwroot/camp-pk-system
pm2 restart camp-pk-system --update-env
pm2 save
```

### 查看当前线上前端版本

```bash
curl -s https://camp.codebn.cn/api/version
```

### 检查反代缓存配置

```bash
nginx -T 2>&1 | grep -n "proxy_cache"
```

### 验证本机和公网是否同版

```bash
curl -s http://127.0.0.1:3004/ | grep -E 'title|assets/index-'
curl -s https://camp.codebn.cn/ | grep -E 'title|assets/index-'
```

## 一次性转换为 Git 部署

如果服务器目录不是 Git 仓库，先备份生产数据，再重建为 Git clone：

```bash
su - game
cd /www/wwwroot
mv camp-pk-system camp-pk-system.backup-$(date +%Y%m%d-%H%M%S)
git clone https://github.com/zhaosenlin12-creator/camp-pk-system.git
```

恢复这些生产数据：

- `database/data.json`
- `uploads/photos/`
- `.secrets.enc`

恢复后重新安装依赖、构建并重启 PM2。
