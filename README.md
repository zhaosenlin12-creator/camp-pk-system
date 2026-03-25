# 乐享宠物

乐启享机构线下编程课堂使用的班级积分与宠物成长系统。老师在管理后台维护班级、学生、战队、积分和宠物成长；展示页负责课堂大屏展示、排行榜和宠物状态同步。

## 当前线上环境

- 展示页：`https://camp.codebn.cn/`
- 管理后台：`https://camp.codebn.cn/admin`
- 服务器项目目录：`/www/wwwroot/camp-pk-system`
- PM2 进程名：`camp-pk-system`
- PM2 运行用户：`game`
- Node 服务端口：`3004`
- 宝塔反代目标：`127.0.0.1:3004`
- Nginx 代理缓存目录：`/www/server/nginx/proxy_cache_dir`

## 主要能力

- 班级、学员、战队管理
- 课堂积分、奖励、惩罚、评分、报告、证书
- 宠物中心、宠物蛋领取、孵化、照料、成长和多宠物培养
- 管理后台和展示页的班级同步、数据同步、学生宠物展示
- 品牌化图标、乐享宠物标题和展示页资源
- 删除学员、战队时的确认交互和关联数据清理

## 项目结构

```text
camp-pk-system/
├─ client/                 # React + Vite 前端
│  ├─ public/              # 图标、宠物素材、静态资源
│  └─ src/
│     ├─ components/       # 后台和展示页组件
│     ├─ pages/            # 页面入口
│     └─ store/            # Zustand 状态管理
├─ server/                 # Express API 与 SPA 静态服务
├─ database/data.json      # 本地业务数据
├─ uploads/photos/         # 上传图片
├─ DEPLOY.md               # 全量部署说明
└─ UPDATE_GUIDE.md         # 后续 git 拉取更新说明
```

## 本地开发

### 1. 安装依赖

```bash
npm install
cd client
npm install
cd ..
```

### 2. 初始化数据

```bash
npm run init-db
```

### 3. 启动开发环境

```bash
npm run dev
```

默认访问：

- 展示页：`http://localhost:5173`
- 管理后台：`http://localhost:5173/admin`
- 本地 API：`http://localhost:3001`

说明：

- 开发模式下前端通过 Vite 代理转发到 `3001`
- 如果未配置 `ADMIN_PIN`，服务端首次启动会在控制台打印生成的管理员密码

## 生产构建

```bash
npm run build
```

构建产物输出到 `client/dist/`。生产环境由 `server/index.js` 统一托管 SPA，并为首页与 `/admin` 返回同一份入口 HTML。

## 管理员密码

- 推荐通过环境变量 `ADMIN_PIN` 初始化
- 首次未设置时，系统会自动生成密码并写入 `.secrets.enc`
- 后续密码以哈希形式保存在 `.secrets.enc` 中
- 不要再去改 `server/index.js` 里的硬编码 PIN，当前版本已经不再使用这种方式

## 数据与备份

需要备份的关键文件：

- `database/data.json`
- `uploads/photos/`
- `.secrets.enc`

## 常用命令

```bash
# 构建前端
npm run build

# 启动后端
npm start

# 初始化数据文件
npm run init-db
```

服务器常用命令：

```bash
su - game
cd /www/wwwroot/camp-pk-system
pm2 restart camp-pk-system --update-env
pm2 save
```

## 线上验收命令

```bash
curl -s https://camp.codebn.cn/ | grep -E 'title|assets/index-'
curl -s https://camp.codebn.cn/admin | grep -E 'title|assets/index-'
curl -s https://camp.codebn.cn/api/version
```

预期结果：

- `/` 和 `/admin` 都显示 `乐享宠物`
- `/` 和 `/admin` 都引用同一组前端资源

## 缓存问题排查

如果出现“首页是旧版、`/admin` 是新版”的情况，优先检查宝塔代理缓存。当前服务器的缓存目录是：

```bash
/www/server/nginx/proxy_cache_dir
```

清理缓存并重载 Nginx：

```bash
rm -rf /www/server/nginx/proxy_cache_dir/*
nginx -t && systemctl reload nginx
```

## 相关文档

- [DEPLOY.md](./DEPLOY.md)：新服务器或重建服务器时的完整部署流程
- [UPDATE_GUIDE.md](./UPDATE_GUIDE.md)：后续通过 Git 拉取更新的标准流程
- [DESIGN.md](./DESIGN.md)：视觉方向
- [PET_SYSTEM_ROADMAP.md](./PET_SYSTEM_ROADMAP.md)：宠物系统规划记录
