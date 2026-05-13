#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/camp-pk-system}"
ROLLBACK_FROM="${1:-}"
PORT="${PORT:-3004}"
PM2_NAME="${PM2_NAME:-camp-pk-system}"
PM2_CONFIG="${PM2_CONFIG:-ecosystem.config.js}"

if [ -z "$ROLLBACK_FROM" ]; then
  echo "用法: bash production-rollback.sh /www/wwwroot/camp-pk-system/update-backups/<timestamp>" >&2
  exit 1
fi

echo "[1/5] 检查目录"
test -d "$APP_DIR"
test -d "$ROLLBACK_FROM"

echo "[2/5] 按备份目录回滚代码"
cd "$ROLLBACK_FROM"
find . -type f | while read -r rel; do
  target="$APP_DIR/${rel#./}"
  mkdir -p "$(dirname "$target")"
  cp -af "$rel" "$target"
done

echo "[3/5] 重启 PM2"
cd "$APP_DIR"
pm2 reload "$PM2_CONFIG" --env production || pm2 restart "$PM2_NAME" --update-env
pm2 save

echo "[4/5] 基础验证"
for i in {1..12}; do
  if curl -fsS "http://127.0.0.1:${PORT}/api/classes" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[5/5] 完成"
echo "已按代码备份目录回滚: $ROLLBACK_FROM"
