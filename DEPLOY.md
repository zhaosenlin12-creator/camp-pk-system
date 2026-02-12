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
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
cd /www/wwwroot/camp-pk-system
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
        proxy_pass http://127.0.0.1:3004;
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
        proxy_pass http://127.0.0.1:3004/videos/;
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
| DEEPSEEK_API_KEY | DeepSeek API密钥 | 加密存储 |
| ALLOWED_ORIGINS | 允许的跨域来源（逗号分隔） | * |

示例：
```bash
PORT=3001 pm2 start ecosystem.config.js --env production
```

---

## 五、🔐 安全配置说明

### 敏感信息保护

系统采用企业级安全方案保护敏感信息：

1. **加密存储**：API密钥和密码使用 AES-256-GCM 加密存储在 `.secrets.enc` 文件中
2. **机器绑定**：加密密钥基于机器指纹生成，配置文件无法在其他机器上解密
3. **密码哈希**：管理员密码使用 scrypt 算法哈希存储（N=16384），防止彩虹表攻击
4. **时序攻击防护**：密码验证使用恒定时间比较 + 随机延迟

### 首次启动

首次启动时，系统会自动：
1. 生成加密配置文件 `.secrets.enc`
2. 将明文密码升级为哈希存储
3. 显示安全模块加载状态

### 修改管理员密码

方法1：通过API修改（推荐）
```bash
curl -X POST http://localhost:3001/api/admin/change-password \
  -H "Content-Type: application/json" \
  -d '{"currentPin":"980116","newPin":"新密码"}'
```

方法2：删除 `.secrets.enc` 文件后重启服务，将使用默认密码重新初始化

### 安全文件说明

| 文件 | 说明 | 是否可删除 |
|------|------|-----------|
| `.secrets.enc` | 加密的敏感配置 | 删除后重新初始化 |
| `database/data.json` | 业务数据 | 删除后数据丢失 |

⚠️ **重要**：`.secrets.enc` 文件绑定到当前机器，迁移服务器时需要重新配置密码和API密钥。

---

## 六、数据备份

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

## 七、访问地址

部署完成后：

- **展示页面**：`https://show.codebn.cn/`（学生/家长查看）
- **管理后台**：`https://show.codebn.cn/admin`（老师管理，密码：980116）

---

## 八、在教学系统中添加入口

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

## 九、常见问题

### Q: 视频无法播放？
A: 检查 `public/videos/` 目录下的视频文件是否存在，格式是否为 MP4。

### Q: 忘记管理员密码？
A: 修改环境变量 `ADMIN_PIN` 或直接修改 `server/index.js` 中的默认密码。

### Q: 数据丢失？
A: 从备份恢复 `database/data.json` 文件。

---

## 十、安全检查清单

- [x] 敏感配置加密存储（AES-256-GCM）
- [x] 密码哈希存储（scrypt）
- [x] 机器指纹绑定（防配置文件盗用）
- [x] 时序攻击防护（恒定时间比较）
- [x] 输入验证和XSS过滤
- [x] API 请求频率限制（60次/分钟）
- [x] AI API 频率限制（10次/分钟）
- [x] 管理员登录防暴力破解（5次/30分钟）
- [x] 安全响应头 (Helmet + CSP)
- [x] 请求体大小限制（1MB）
- [x] CORS 安全配置
- [ ] HTTPS（部署时配置）
- [ ] 定期数据备份（部署时配置）

---

*最后更新：2026年1月*
