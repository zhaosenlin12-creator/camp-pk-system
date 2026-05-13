#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -d /www/server/nodejs/v20.19.6/bin ]; then
  export PATH="/www/server/nodejs/v20.19.6/bin:$PATH"
fi

bash "$SCRIPT_DIR/scripts/deploy/production-install-patch.sh" "$SCRIPT_DIR"
