#!/bin/sh
# Browser login once (Cloudflare-hosted callback — works on Cloud Agent)
# then create tunnel + DNS + write NAS credentials and start compose.
#
# Usage (Cloud Agent or any machine with network):
#   sh ticket-queue-api/scripts/login-and-provision-cloudflare-tunnel.sh
#
# Optional env:
#   CF_TUNNEL_NAME=ticket-queue-api-nas
#   CF_HOSTNAME=ticket-queue-api.mansejin.com
#   CF_ORIGIN_SERVICE=http://api:8787
#   NAS_REPO_PATH=/volume1/docker/tools-site
#   SKIP_NAS_APPLY=1          — only login + create locally
#   CLOUDFLARED_BIN=cloudflared

set -e

TUNNEL_NAME="${CF_TUNNEL_NAME:-ticket-queue-api-nas}"
HOSTNAME="${CF_HOSTNAME:-ticket-queue-api.mansejin.com}"
ORIGIN="${CF_ORIGIN_SERVICE:-http://api:8787}"
REPO_DIR="${NAS_REPO_PATH:-/volume1/docker/tools-site}"
COMPOSE_DIR="$REPO_DIR/ticket-queue-api"
CF_DIR="${HOME}/.cloudflared"
WAIT_SECS="${CF_LOGIN_TIMEOUT_SECS:-600}"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

resolve_cloudflared() {
  if [ -n "$CLOUDFLARED_BIN" ] && [ -x "$CLOUDFLARED_BIN" ]; then
    echo "$CLOUDFLARED_BIN"
    return
  fi
  if command -v cloudflared >/dev/null 2>&1; then
    command -v cloudflared
    return
  fi
  if [ -x /tmp/cloudflared ]; then
    echo /tmp/cloudflared
    return
  fi
  echo "==> downloading cloudflared…" >&2
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" \
    -o /tmp/cloudflared
  chmod +x /tmp/cloudflared
  echo /tmp/cloudflared
}

CF=$(resolve_cloudflared)
echo "==> using $CF ($($CF version 2>/dev/null | head -1))"

ensure_cert() {
  if [ -f "$CF_DIR/cert.pem" ]; then
    echo "==> already logged in ($CF_DIR/cert.pem)"
    return
  fi

  mkdir -p "$CF_DIR"
  LOG=$(mktemp)
  echo "==> starting Cloudflare login (open the URL in your browser)…"
  "$CF" tunnel login >"$LOG" 2>&1 &
  LOGIN_PID=$!

  URL=""
  i=0
  while [ "$i" -lt 60 ]; do
    if grep -q 'https://dash.cloudflare.com/argotunnel' "$LOG" 2>/dev/null; then
      URL=$(grep -oE 'https://dash\.cloudflare\.com/argotunnel[^ ]*' "$LOG" | head -1)
      break
    fi
    if ! kill -0 "$LOGIN_PID" 2>/dev/null; then
      cat "$LOG" >&2 || true
      echo "ERROR: cloudflared login exited before printing URL" >&2
      exit 1
    fi
    i=$((i + 1))
    sleep 1
  done

  if [ -z "$URL" ]; then
    kill "$LOGIN_PID" 2>/dev/null || true
    cat "$LOG" >&2 || true
    echo "ERROR: could not find login URL" >&2
    exit 1
  fi

  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  Cloudflare 로그인 (한 번)                                    ║"
  echo "║  브라우저에서 아래 URL을 열고 존(mansejin.com)을 선택하세요   ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  $URL"
  echo ""
  echo "대기 중… (최대 ${WAIT_SECS}s, cert.pem 생성까지)"
  echo ""

  elapsed=0
  while [ "$elapsed" -lt "$WAIT_SECS" ]; do
    if [ -f "$CF_DIR/cert.pem" ]; then
      echo "==> login OK: $CF_DIR/cert.pem"
      wait "$LOGIN_PID" 2>/dev/null || true
      rm -f "$LOG"
      return
    fi
    if ! kill -0 "$LOGIN_PID" 2>/dev/null; then
      # process ended — check cert again
      if [ -f "$CF_DIR/cert.pem" ]; then
        echo "==> login OK: $CF_DIR/cert.pem"
        rm -f "$LOG"
        return
      fi
      cat "$LOG" >&2 || true
      echo "ERROR: login finished without cert.pem" >&2
      exit 1
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  kill "$LOGIN_PID" 2>/dev/null || true
  echo "ERROR: timed out waiting for browser login" >&2
  exit 1
}

ensure_cert

# Create or reuse tunnel
EXISTING=$("$CF" tunnel list 2>/dev/null | awk -v n="$TUNNEL_NAME" '$2==n {print $1; exit}')
if [ -n "$EXISTING" ]; then
  TUNNEL_ID="$EXISTING"
  echo "==> reusing tunnel $TUNNEL_NAME ($TUNNEL_ID)"
else
  echo "==> creating tunnel $TUNNEL_NAME"
  OUT=$("$CF" tunnel create "$TUNNEL_NAME" 2>&1) || {
    echo "$OUT" >&2
    exit 1
  }
  echo "$OUT"
  TUNNEL_ID=$("$CF" tunnel list 2>/dev/null | awk -v n="$TUNNEL_NAME" '$2==n {print $1; exit}')
  if [ -z "$TUNNEL_ID" ]; then
    # parse from create output
    TUNNEL_ID=$(echo "$OUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  fi
fi

if [ -z "$TUNNEL_ID" ]; then
  echo "ERROR: could not resolve tunnel id" >&2
  exit 1
fi

CRED_SRC="$CF_DIR/${TUNNEL_ID}.json"
if [ ! -f "$CRED_SRC" ]; then
  echo "ERROR: missing credentials $CRED_SRC" >&2
  exit 1
fi

echo "==> routing DNS $HOSTNAME → tunnel $TUNNEL_ID"
"$CF" tunnel route dns -f "$TUNNEL_NAME" "$HOSTNAME" 2>&1 || \
  "$CF" tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$HOSTNAME" 2>&1 || \
  echo "WARN: DNS route may already exist; continuing"

# Write local (repo or temp) cloudflared bundle
BUNDLE="$ROOT_DIR/cloudflared"
mkdir -p "$BUNDLE"
cp "$CRED_SRC" "$BUNDLE/credentials.json"
cat > "$BUNDLE/config.yml" <<EOF
tunnel: $TUNNEL_ID
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: $HOSTNAME
    service: $ORIGIN
  - service: http_status:404
EOF
chmod 600 "$BUNDLE/credentials.json" "$BUNDLE/config.yml"
echo "==> wrote $BUNDLE/config.yml + credentials.json"

if [ "${SKIP_NAS_APPLY:-0}" = "1" ]; then
  echo "SKIP_NAS_APPLY=1 — done (local bundle only)"
  echo "Public URL: https://$HOSTNAME/health"
  exit 0
fi

# Apply on NAS if path exists
if [ -d "$COMPOSE_DIR" ]; then
  echo "==> applying on NAS path $COMPOSE_DIR"
  mkdir -p "$COMPOSE_DIR/cloudflared"
  cp "$BUNDLE/config.yml" "$COMPOSE_DIR/cloudflared/config.yml"
  cp "$BUNDLE/credentials.json" "$COMPOSE_DIR/cloudflared/credentials.json"
  chmod 600 "$COMPOSE_DIR/cloudflared/credentials.json"

  DOCKER=""
  for c in /usr/local/bin/docker /var/packages/ContainerManager/target/usr/bin/docker docker; do
    if [ -x "$c" ] || command -v "$c" >/dev/null 2>&1; then
      DOCKER=$c
      break
    fi
  done
  if [ -z "$DOCKER" ]; then
    echo "ERROR: docker not found on this host" >&2
    exit 127
  fi
  if ! $DOCKER info >/dev/null 2>&1; then
    DOCKER="sudo -n $DOCKER"
  fi

  cd "$COMPOSE_DIR"
  # Prefer login overlay; stop token-based container name clash
  $DOCKER compose -f docker-compose.yml -f docker-compose.cloudflare-login.yml up -d --build --remove-orphans
  sleep 5
  echo "==> public health check"
  if curl -sf "https://$HOSTNAME/health"; then
    echo
    echo "OK https://$HOSTNAME/health"
  else
    echo "WARN: https://$HOSTNAME/health not ready yet (wait for DNS/tunnel)"
  fi
  exit 0
fi

echo ""
echo "Not running on NAS ($COMPOSE_DIR missing)."
echo "Bundle is ready at $BUNDLE"
echo "Copy to NAS then:"
echo "  scp -r $BUNDLE/. nas:$COMPOSE_DIR/cloudflared/"
echo "  ssh nas 'cd $COMPOSE_DIR && docker compose -f docker-compose.yml -f docker-compose.cloudflare-login.yml up -d'"
echo ""
echo "Or from Cloud Agent with SSH already set up, re-run after mounting/syncing bundle."
echo "Public URL: https://$HOSTNAME/health"
