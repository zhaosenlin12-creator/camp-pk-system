#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/camp-pk-system}"
WORK_ROOT="${WORK_ROOT:-/tmp/camp-pk-deploy}"
PATCH_SOURCE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPLY_SCRIPT="$APP_DIR/scripts/deploy/production-apply-update.sh"

if [ ! -f "$APPLY_SCRIPT" ]; then
  APPLY_SCRIPT="$SCRIPT_DIR/production-apply-update.sh"
fi

if [ -z "$PATCH_SOURCE" ]; then
  echo "Usage: bash production-install-patch.sh /tmp/camp-pk-update.tar.gz" >&2
  echo "   or: bash production-install-patch.sh /tmp/camp-pk-update-extracted" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
PATCH_DIR="$WORK_ROOT/$STAMP"

if [ -d "$PATCH_SOURCE" ]; then
  PATCH_DIR="$PATCH_SOURCE"
  echo "[1/4] Use extracted patch directory: $PATCH_DIR"
elif [ -f "$PATCH_SOURCE" ]; then
  mkdir -p "$PATCH_DIR"
  case "$PATCH_SOURCE" in
    *.tar.gz|*.tgz)
      echo "[1/4] Extract tar.gz patch into temp directory: $PATCH_DIR"
      tar -xzf "$PATCH_SOURCE" -C "$PATCH_DIR"
      ;;
    *.zip)
      echo "[1/4] Unzip patch into temp directory: $PATCH_DIR"
      unzip -oq "$PATCH_SOURCE" -d "$PATCH_DIR"
      ;;
    *)
      echo "Unsupported patch format: $PATCH_SOURCE" >&2
      echo "Supported formats: .tar.gz .tgz .zip" >&2
      exit 1
      ;;
  esac
else
  echo "Patch source not found: $PATCH_SOURCE" >&2
  exit 1
fi

echo "[2/4] Validate patch contents"
test -f "$PATCH_DIR/server/index.js"
test -f "$PATCH_DIR/index.html"
test -f "$PATCH_DIR/client/dist/index.html"
test -f "$PATCH_DIR/scripts/deploy/production-apply-update.sh"

echo "[3/4] Run deploy script"
bash "$APPLY_SCRIPT" "$PATCH_DIR"

echo "[4/4] Patch directory retained for inspection"
echo "$PATCH_DIR"
