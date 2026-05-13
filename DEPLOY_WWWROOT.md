# 生产部署规范

固定生产环境：

- 项目目录：`/www/wwwroot/camp-pk-system`
- PM2 进程：`camp-pk-system`
- 服务用户：`game`
- 端口：`3004`
- 域名：`https://camp.codebn.cn`

## 固定更新方式

以后不要再把 zip 直接解压覆盖到项目根目录。

固定流程改成：

1. 上传补丁包到服务器临时目录，例如：`/tmp`
2. 解压到临时目录
3. 运行补丁包里的 `deploy-on-server.sh`
4. 脚本自动完成：
   - 备份 `database/data.json`、`uploads`、`.secrets.enc`、`logs`
   - 备份将被覆盖的代码文件
   - 只覆盖白名单代码文件
   - 以 `game` 用户运行宠物历史进度修复脚本
   - 以 `game` 用户重启 PM2
   - 校验服务是否可用

注意：

- 即使你用 `root` 执行安装脚本，脚本也会自动切换到 `game` 用户执行修复和 PM2 重启
- 不要再手动用 `root` 直接 `pm2 start/restart camp-pk-system`

## 一条命令更新

假设你上传的补丁包是：

`/tmp/camp-pk-pet-stage-fix-20260513-v6.tar.gz`

固定执行：

```bash
export PATH=/www/server/nodejs/v20.19.6/bin:$PATH
cd /www/wwwroot/camp-pk-system
bash scripts/deploy/production-install-patch.sh /tmp/camp-pk-pet-stage-fix-20260513-v6.tar.gz
```

## 数据安全边界

更新脚本不会直接覆盖以下数据目录或文件：

- `database/`
- `uploads/`
- `logs/`
- `.secrets.enc`

注意：

- `server/repairLegacyPetProgress.js` 会修改 `database/data.json`
- 但它会先自动生成一份：
  `database/data.json.legacy-pet-progress-backup-<timestamp>`
- 此外，部署脚本还会额外生成一份总备份：
  `/tmp/camp-pk-data-backup-<timestamp>.tar.gz`

## 覆盖策略

更新脚本只覆盖这些白名单代码文件：

- `scripts/deploy/production-install-patch.sh`
- `scripts/deploy/production-apply-update.sh`
- `scripts/deploy/production-rollback.sh`
- `server/index.js`
- `server/repairLegacyPetProgress.js`
- `server/tugOfWarQuestionBank.js`
- `DEPLOY_WWWROOT.md`
- `UPDATE_GUIDE.md`
- `index.html`
- `ui-hotfix.js`
- `ui-hotfix.css`
- `pk-entry.js`
- `client/dist/index.html`
- `client/dist/ui-hotfix.js`
- `client/dist/ui-hotfix.css`
- `client/dist/pk-entry.js`
- `public/pk-game/index.html`
- `public/pk-game/pk-game.css`
- `public/pk-game/pk-game.js`

## 更新后必须检查

```bash
curl -s http://127.0.0.1:3004/api/version
curl -s http://127.0.0.1:3004/api/classes | head
curl -s https://camp.codebn.cn/api/version
grep -n "pk-entry.js" /www/wwwroot/camp-pk-system/client/dist/index.html
ls -l /www/wwwroot/camp-pk-system/public/pk-game
```

确认线上域名和本地端口拿到的是同一套后端：

```bash
node -e "Promise.all([fetch('http://127.0.0.1:3004/api/version').then(r=>r.text()),fetch('https://camp.codebn.cn/api/version').then(r=>r.text())]).then(([local,prod])=>console.log(JSON.stringify({local:JSON.parse(local),prod:JSON.parse(prod)},null,2)))"
```

如果本次更新涉及宠物阶段修复，再额外检查一个学生：

```bash
curl -s https://camp.codebn.cn/api/classes/1/students | grep -n '"id":209'
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
ls -lt /www/wwwroot/camp-pk-system/update-backups | head
cd /www/wwwroot/camp-pk-system
bash scripts/deploy/production-rollback.sh /www/wwwroot/camp-pk-system/update-backups/<timestamp>
```

数据回滚不要只回滚代码，还要结合：

- `/tmp/camp-pk-data-backup-*.tar.gz`
- `database/data.json.legacy-pet-progress-backup-*`

一起判断是否需要恢复数据文件。
