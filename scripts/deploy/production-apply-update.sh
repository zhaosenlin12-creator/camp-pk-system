#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/camp-pk-system}"
PATCH_DIR="${1:-$(pwd)}"
PORT="${PORT:-3004}"
PM2_NAME="${PM2_NAME:-camp-pk-system}"
PM2_CONFIG="${PM2_CONFIG:-ecosystem.config.js}"
SERVICE_USER="${SERVICE_USER:-game}"
STAMP="$(date +%Y%m%d-%H%M%S)"
CODE_BACKUP_DIR="$APP_DIR/update-backups/$STAMP"
DATA_BACKUP_FILE="/tmp/camp-pk-data-backup-$STAMP.tar.gz"

ensure_pm2_in_path() {
  if command -v pm2 >/dev/null 2>&1; then
    return 0
  fi

  for candidate in /www/server/nodejs/v20.19.6/bin /www/server/nodejs/v18.19.1/bin; do
    if [ -d "$candidate" ]; then
      export PATH="$candidate:$PATH"
      if command -v pm2 >/dev/null 2>&1; then
        return 0
      fi
    fi
  done

  local discovered
  discovered="$(find /www/server/nodejs -path '*/bin/pm2' -type f 2>/dev/null | head -n 1 || true)"
  if [ -n "$discovered" ]; then
    export PATH="$(dirname "$discovered"):$PATH"
    if command -v pm2 >/dev/null 2>&1; then
      return 0
    fi
  fi

  return 1
}

ensure_service_user() {
  if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
    echo "Service user not found: $SERVICE_USER" >&2
    exit 1
  fi
}

run_as_service_user() {
  local command="$1"

  if [ "$(id -un)" = "$SERVICE_USER" ]; then
    bash -lc "export PATH=\"$PATH\"; cd \"$APP_DIR\"; $command"
    return
  fi

  su - "$SERVICE_USER" -s /bin/bash -c "export PATH=\"$PATH\"; cd \"$APP_DIR\"; $command"
}

normalize_runtime_ownership() {
  if [ "$(id -u)" -ne 0 ]; then
    return
  fi

  chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR/database" "$APP_DIR/uploads" "$APP_DIR/logs"
  if [ -e "$APP_DIR/.secrets.enc" ]; then
    chown "$SERVICE_USER:$SERVICE_USER" "$APP_DIR/.secrets.enc"
  fi
}

echo "[1/9] Check directories"
test -d "$APP_DIR"
test -d "$PATCH_DIR"
mkdir -p "$CODE_BACKUP_DIR"
ensure_service_user

FILES=(
  "deploy-on-server.sh"
  "scripts/deploy/production-install-patch.sh"
  "scripts/deploy/production-apply-update.sh"
  "scripts/deploy/production-rollback.sh"
  "server/index.js"
  "server/repairLegacyPetProgress.js"
  "server/tugOfWarQuestionBank.js"
  "DEPLOY_WWWROOT.md"
  "UPDATE_GUIDE.md"
  "index.html"
  "ui-hotfix.js"
  "ui-hotfix.css"
  "pk-entry.js"
  "client/dist/index.html"
  "client/dist/ui-hotfix.js"
  "client/dist/ui-hotfix.css"
  "client/dist/pk-entry.js"
  "public/pk-game/index.html"
  "public/pk-game/pk-game.css"
  "public/pk-game/pk-game.js"
)

echo "[2/9] Backup data files"
cd "$APP_DIR"
tar -czf "$DATA_BACKUP_FILE" \
  database/data.json \
  uploads \
  .secrets.enc \
  logs

echo "[3/9] Backup existing code files"
for file in "${FILES[@]}"; do
  if [ -f "$APP_DIR/$file" ]; then
    mkdir -p "$CODE_BACKUP_DIR/$(dirname "$file")"
    command cp -af "$APP_DIR/$file" "$CODE_BACKUP_DIR/$file"
  fi
done

echo "[4/9] Validate patch contents"
for file in "${FILES[@]}"; do
  if [ ! -f "$PATCH_DIR/$file" ]; then
    echo "Missing patch file: $PATCH_DIR/$file" >&2
    exit 1
  fi
done

echo "[5/9] Copy patch files"
mkdir -p "$APP_DIR/server" "$APP_DIR/client/dist" "$APP_DIR/public/pk-game" "$APP_DIR/scripts/deploy"
for file in "${FILES[@]}"; do
  mkdir -p "$APP_DIR/$(dirname "$file")"
  command cp -af "$PATCH_DIR/$file" "$APP_DIR/$file"
done

echo "[6/9] Run syntax checks"
bash -n "$APP_DIR/scripts/deploy/production-install-patch.sh"
bash -n "$APP_DIR/scripts/deploy/production-apply-update.sh"
bash -n "$APP_DIR/scripts/deploy/production-rollback.sh"
node --check "$APP_DIR/server/index.js"
node --check "$APP_DIR/server/repairLegacyPetProgress.js"

echo "[7/9] Repair legacy pet progress"
normalize_runtime_ownership
run_as_service_user "node server/repairLegacyPetProgress.js"

echo "[8/9] Resolve pm2 path"
ensure_pm2_in_path || {
  echo "pm2 not found. Try: export PATH=/www/server/nodejs/v20.19.6/bin:\$PATH" >&2
  exit 1
}
echo "Using pm2: $(command -v pm2)"
echo "Service user: $SERVICE_USER"

echo "[9/10] Restart service"
run_as_service_user "pm2 reload \"$PM2_CONFIG\" --env production || pm2 restart \"$PM2_NAME\" --update-env"
run_as_service_user "pm2 save"

echo "[10/10] Verify service"
for i in {1..12}; do
  if curl -fsS "http://127.0.0.1:${PORT}/api/classes" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo
echo "Deploy completed."
echo "Data backup: $DATA_BACKUP_FILE"
echo "Code backup: $CODE_BACKUP_DIR"
echo "Data directories were not directly overwritten:"
echo " - $APP_DIR/database"
echo " - $APP_DIR/uploads"
echo " - $APP_DIR/logs"
echo " - $APP_DIR/.secrets.enc"
echo
echo "Follow-up checks:"
echo "grep -n 'pk-entry.js' $APP_DIR/client/dist/index.html"
echo "ls -l $APP_DIR/public/pk-game"
echo "curl -s http://127.0.0.1:${PORT}/api/classes | head"
