# 乐享宠物部署指南

本文档以当前生产环境为准，避免继续使用旧的 `show.codebn.cn`、旧端口 `3001` 和手动覆盖静态文件的旧流程。

## 生产环境基线

- 域名：`camp.codebn.cn`
- 项目目录：`/www/wwwroot/camp-pk-system`
- 运行用户：`game`
- PM2 进程名：`camp-pk-system`
- 服务端口：`3004`
- Nginx / 宝塔反代目标：`127.0.0.1:3004`

## 一次性准备

### 1. 安装运行环境

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs git
npm install -g pm2
```

### 2. 用 `game` 用户部署项目

```bash
su - game
cd /www/wwwroot
git clone https://github.com/zhaosenlin12-creator/camp-pk-system.git
cd camp-pk-system
npm install
cd client
npm install
cd ..
npm run build
```

### 3. 准备持久化数据

如果是第一次部署，直接初始化：

```bash
cd /www/wwwroot/camp-pk-system
npm run init-db
```

如果是从旧目录迁移，至少保留这 3 类文件：

- `database/data.json`
- `uploads/photos/`
- `.secrets.enc`

## PM2 启动

项目已内置 `ecosystem.config.js`，生产端口固定为 `3004`。

```bash
su - game
cd /www/wwwroot/camp-pk-system
pm2 start ecosystem.config.js --env production
pm2 save
```

确认状态：

```bash
pm2 list
pm2 logs camp-pk-system --lines 100
```

## 宝塔 / Nginx 反向代理

### 推荐配置

在站点 `camp.codebn.cn` 的反向代理配置中，使用下面的完整配置。重点是：

- 精确首页 `location = /` 单独禁止代理缓存
- 常规路由 `location ^~ /` 统一代理到 `3004`
- 不要启用宝塔的 “Set Nginx Cache” 功能

```nginx
location = / {
    proxy_pass http://127.0.0.1:3004;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header REMOTE-HOST $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_http_version 1.1;

    proxy_no_cache 1;
    proxy_cache_bypass 1;
    expires -1;
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate" always;
}

location ^~ / {
    proxy_pass http://127.0.0.1:3004;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header REMOTE-HOST $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_http_version 1.1;

    add_header X-Cache $upstream_cache_status;

    set $static_file_cache 0;
    if ($uri ~* "\\.(gif|png|jpg|css|js|woff|woff2)$") {
        set $static_file_cache 1;
        expires 1m;
    }
    if ($static_file_cache = 0) {
        add_header Cache-Control no-cache always;
    }
}
```

### 清理宝塔代理缓存

如果首页还是旧版，先清理缓存目录再 reload：

```bash
rm -rf /www/server/nginx/proxy_cache_dir/*
nginx -t && systemctl reload nginx
```

## 验证命令

### 1. 验证本机 Node 服务

```bash
curl -s http://127.0.0.1:3004/ | grep -E 'title|assets/index-'
curl -s http://127.0.0.1:3004/admin | grep -E 'title|assets/index-'
curl -I -s http://127.0.0.1:3004/ | grep -i cache-control
```

### 2. 验证公网域名

```bash
curl -s https://camp.codebn.cn/ | grep -E 'title|assets/index-'
curl -s https://camp.codebn.cn/admin | grep -E 'title|assets/index-'
curl -s https://camp.codebn.cn/api/version
curl -I -s https://camp.codebn.cn/ | grep -iE 'cache-control|content-length|etag'
```

验收通过标准：

- `/` 和 `/admin` 都返回 `乐享宠物`
- `/` 和 `/admin` 都引用同一组资源文件
- `/api/version` 返回同一组 JS/CSS 文件名

## 首次切换为 Git 更新模式

如果服务器现在还是“解压覆盖”的目录，推荐改成 Git 管理，后续直接 `git pull`：

```bash
su - game
cd /www/wwwroot
mv camp-pk-system camp-pk-system.backup-$(date +%Y%m%d-%H%M%S)
git clone https://github.com/zhaosenlin12-creator/camp-pk-system.git
cd camp-pk-system
mkdir -p database uploads/photos
```

然后把旧目录里的这几个文件复制回来：

- `database/data.json`
- `uploads/photos/`
- `.secrets.enc`

再执行：

```bash
npm install
cd client
npm install
cd ..
npm run build
pm2 restart camp-pk-system --update-env
pm2 save
```

## 运维注意事项

- 管理员密码不要写进仓库，使用 `.secrets.enc` 或 `ADMIN_PIN` 环境变量
- 构建后由 Node 服务统一托管 `client/dist`
- `database/data.json`、`uploads/photos/`、`.secrets.enc` 都属于生产数据，更新代码时不要覆盖
- 如果首页与 `/admin` 版本不一致，优先排查反代缓存，不要先怀疑前端包
