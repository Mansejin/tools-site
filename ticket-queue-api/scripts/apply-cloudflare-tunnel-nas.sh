#!/bin/sh
# Apply Cloudflare Tunnel token to NAS ticket-queue-api and (re)start overlay compose.
#
# On a machine that can reach Cloudflare API + (optionally) NAS:
#   export CLOUDFLARE_API_TOKEN=...
#   # optional: CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_ZONE_ID
#   sh ticket-queue-api/scripts/apply-cloudflare-tunnel-nas.sh
#
# Or run provision locally, then copy token into NAS .env manually.

set -e

REPO_DIR="${NAS_REPO_PATH:-/volume1/docker/tools-site}"
COMPOSE_DIR="$REPO_DIR/ticket-queue-api"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROVISION="$SCRIPT_DIR/provision-cloudflare-tunnel.mjs"

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

if [ ! -f "$PROVISION" ]; then
  echo "ERROR: missing $PROVISION"
  exit 1
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ] && [ -z "$CF_API_TOKEN" ]; then
  echo "ERROR: set CLOUDFLARE_API_TOKEN first"
  echo "  https://dash.cloudflare.com/profile/api-tokens"
  echo "  Permissions: Cloudflare Tunnel Edit + DNS Edit"
  exit 1
fi

TMP_ENV=$(mktemp)
trap 'rm -f "$TMP_ENV"' EXIT INT TERM

# Provision against Cloudflare; write token into temp env fragment
node "$PROVISION" --write-env "$TMP_ENV"

TOKEN_LINE=$(grep -E '^CLOUDFLARE_TUNNEL_TOKEN=' "$TMP_ENV" | tail -n 1)
if [ -z "$TOKEN_LINE" ]; then
  echo "ERROR: provision did not write CLOUDFLARE_TUNNEL_TOKEN"
  exit 1
fi

# If we are already on the NAS compose dir layout, apply locally
if [ -d "$COMPOSE_DIR" ] && [ -f "$COMPOSE_DIR/docker-compose.yml" ]; then
  ENV_FILE="$COMPOSE_DIR/.env"
  touch "$ENV_FILE"
  if grep -qE '^CLOUDFLARE_TUNNEL_TOKEN=' "$ENV_FILE"; then
    # portable in-place replace
    TMP2=$(mktemp)
    grep -vE '^CLOUDFLARE_TUNNEL_TOKEN=' "$ENV_FILE" > "$TMP2"
    echo "$TOKEN_LINE" >> "$TMP2"
    cat "$TMP2" > "$ENV_FILE"
    rm -f "$TMP2"
  else
    echo "$TOKEN_LINE" >> "$ENV_FILE"
  fi
  echo "==> updated $ENV_FILE"

  DOCKER=""
  for c in /usr/local/bin/docker /var/packages/ContainerManager/target/usr/bin/docker docker; do
    if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then
      DOCKER=$c
      break
    fi
  done
  if [ -z "$DOCKER" ]; then
    echo "ERROR: docker not found"
    exit 127
  fi
  if ! $DOCKER info >/dev/null 2>&1; then
    DOCKER="sudo -n $DOCKER"
  fi

  cd "$COMPOSE_DIR"
  echo "==> docker compose with Cloudflare overlay"
  $DOCKER compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d --build --remove-orphans
  sleep 3
  curl -sf "https://ticket-queue-api.mansejin.com/health" && echo || \
    echo "WARN: public health not ready yet (DNS/tunnel may need a minute)"
  exit 0
fi

echo "Not on NAS path ($COMPOSE_DIR)."
echo "Token was written to temp; re-run this script ON the NAS, or:"
echo "  node ticket-queue-api/scripts/provision-cloudflare-tunnel.mjs --write-env /volume1/docker/tools-site/ticket-queue-api/.env"
exit 2
