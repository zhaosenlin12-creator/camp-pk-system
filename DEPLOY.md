# 🚀 创赛营积分PK系统 - 部署指南

## 域名配置

- **展示页面**：`https://show.codebn.cn/`
- **管理后台**：`https://show.codebn.cn/admin`

## 服务器要求

- Node.js 18+ 
- 内存：512MB+
- 磁盘：1GB+

---

## 一、服务器部署步骤

### 1. 上传项目文件

```bash
# 上传整个 camp-pk-system 目录到服务器
scp -r camp-pk-system user@your-server:/var/www/
```

### 2. 安装依赖

```bash
cd /var/www/camp-pk-system
npm install --production
```

### 3. 构建前端（如果需要）

```bash
cd client
npm install
npm run build
cd ..
```

### 4. 使用 PM2 启动（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js --env production

# 设置开机自启
pm2 startup
pm2 save
```

### 5. 直接启动（测试用）

```bash
NODE_ENV=production node server/index.js
```

---

## 二、Nginx 反向代理配置

创建 `/etc/nginx/sites-available/show.codebn.cn`：

```nginx
server {
    listen 80;
    server_name show.codebn.cn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name show.codebn.cn;

    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/show.codebn.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/show.codebn.cn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 视频文件缓存
    location /videos/ {
        proxy_pass http://127.0.0.1:3001/videos/;
        proxy_cache_valid 200 7d;
        add_header Cache-Control "public, max-age=604800";
    }
}
```

启用配置：
```bash
ln -s /etc/nginx/sites-available/show.codebn.cn /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 三、HTTPS 配置

使用 Let's Encrypt 免费证书：

```bash
# 安装 certbot
apt install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d show.codebn.cn

# 自动续期测试
certbot renew --dry-run
```

---

## 四、环境变量配置

可以通过环境变量自定义配置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3001 |
| NODE_ENV | 环境模式 | development |
| ADMIN_PIN | 管理员密码 | 生产环境必须显式配置，不再提供默认密码 |
| ALLOWED_ORIGIN | 允许的跨域来源 | * |

示例：
```bash
ADMIN_PIN=your_secure_password PORT=3001 pm2 start ecosystem.config.js --env production
```

---

## 五、数据备份

数据存储在 `database/data.json`，建议定期备份：

```bash
# 创建备份脚本 /var/www/camp-pk-system/backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/www/camp-pk-system/database/data.json /var/backups/camp-pk/data_$DATE.json

# 添加到 crontab（每天凌晨2点备份）
0 2 * * * /var/www/camp-pk-system/backup.sh
```

---

## 六、访问地址

部署完成后：

- **展示页面**：`https://show.codebn.cn/`（学生/家长查看）
- **管理后台**：`https://show.codebn.cn/admin`（老师管理，请使用部署时设置的 `ADMIN_PIN` 登录）

---

## 七、在教学系统中添加入口

在你的教学系统中添加跳转链接：

```html
<a href="https://show.codebn.cn" target="_blank" class="btn">
  🏆 查看创赛营积分PK
</a>
```

或使用 iframe 嵌入（需要同源或配置CORS）：

```html
<iframe 
  src="https://show.codebn.cn" 
  width="100%" 
  height="600" 
  frameborder="0"
  allow="autoplay"
></iframe>
```

---

## 八、常见问题

### Q: 视频无法播放？
A: 检查 `public/videos/` 目录下的视频文件是否存在，格式是否为 MP4。

### Q: 忘记管理员密码？
A: 修改环境变量 `ADMIN_PIN` 或直接修改 `server/index.js` 中的默认密码。

### Q: 数据丢失？
A: 从备份恢复 `database/data.json` 文件。

---

## 九、安全检查清单

- [x] 输入验证和过滤
- [x] API 请求频率限制
- [x] 管理员登录防暴力破解
- [x] 安全响应头 (Helmet)
- [x] 请求体大小限制
- [ ] HTTPS（部署时配置）
- [ ] 定期数据备份（部署时配置）

---

*最后更新：2026年1月*
