# 更新指南

这份指南适用于当前生产环境：

- 项目目录：`/www/wwwroot/camp-pk-system`
- PM2：`camp-pk-system`
- 服务用户：`game`
- 端口：`3004`

## 以后固定流程

以后统一按这个流程更新：

1. 上传补丁包到 `/tmp`
2. 执行项目里的统一安装脚本
3. 脚本自动解压、备份、覆盖、修复、重启、验证

注意：

- 即使当前登录用户是 `root`，脚本也会自动把修复和 PM2 操作切换到 `game` 用户执行
- 不要再手动用 `root` 直接启动 `camp-pk-system`

不要再手动 `cp` 文件，不要再直接把 zip 解压到项目根目录。

## 固定命令

把下面这组命令保存下来，以后直接改补丁包文件名即可：

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
cd /www/wwwroot/camp-pk-system
bash scripts/deploy/production-install-patch.sh /tmp/<补丁包文件名>.tar.gz
```

示例：

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
cd /www/wwwroot/camp-pk-system
bash scripts/deploy/production-install-patch.sh /tmp/camp-pk-pet-stage-fix-20260513-v6.tar.gz
```

## 这个流程和你以前直接覆盖的区别

这个流程不是把整个项目目录乱覆盖一遍，而是：

- 先自动备份数据库、上传文件、日志、密钥文件
- 再只覆盖固定白名单代码文件
- 不动 `database/`、`uploads/`、`logs/`、`.secrets.enc`
- 自动跑兼容修复脚本
- 自动重启并验证

## 自动生成的备份

部署脚本会自动生成两类备份：

1. 数据总备份

```bash
/tmp/camp-pk-data-backup-<timestamp>.tar.gz
```

2. 代码文件备份

```bash
/www/wwwroot/camp-pk-system/update-backups/<timestamp>
```

如果更新里涉及宠物历史阶段修复，还会自动生成：

```bash
/www/wwwroot/camp-pk-system/database/data.json.legacy-pet-progress-backup-<timestamp>
```

## 更新后验证

```bash
curl -s http://127.0.0.1:3004/api/version
curl -s http://127.0.0.1:3004/api/classes | head
curl -s https://camp.codebn.cn/api/version
```

如果是宠物阶段相关更新，再检查：

```bash
curl -s https://camp.codebn.cn/api/classes/1/students | grep -n '"id":209'
```

确认本地端口和线上域名是否命中同一套后端：

```bash
node -e "Promise.all([fetch('http://127.0.0.1:3004/api/version').then(r=>r.text()),fetch('https://camp.codebn.cn/api/version').then(r=>r.text())]).then(([local,prod])=>console.log(JSON.stringify({local:JSON.parse(local),prod:JSON.parse(prod)},null,2)))"
```

检查生产接口是否已经返回新的宠物阶段修复字段：

```bash
node -e "fetch('https://camp.codebn.cn/api/classes/1/students').then(r=>r.text()).then(t=>console.log(t.includes('pet_stage_seeded_at')))"
```

再做一次异常筛查：

```bash
node -e "fetch('https://camp.codebn.cn/api/classes/1/students').then(r=>r.json()).then(list=>{const bad=list.filter(s=>s.pet_journey&&s.pet_journey.growth_value>=500&&s.pet_journey.slot_state==='hatched'&&s.pet_journey.stage_level<=3).map(s=>({id:s.id,name:s.name,stage:s.pet_journey.stage_level,growth:s.pet_journey.growth_value,dormant:s.pet_journey.is_dormant})); console.log(JSON.stringify({count:bad.length,sample:bad.slice(0,10)},null,2));})"
```

## 回滚

代码回滚：

```bash
cd /www/wwwroot/camp-pk-system
bash scripts/deploy/production-rollback.sh /www/wwwroot/camp-pk-system/update-backups/<timestamp>
```

如果是数据问题，不要只回滚代码，要结合：

- `/tmp/camp-pk-data-backup-*.tar.gz`
- `database/data.json.legacy-pet-progress-backup-*`

一起恢复。
