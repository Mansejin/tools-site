#!/bin/sh
# Cloud Agent helper: browser Cloudflare login → upload credentials to NAS → compose up.
#
# Prerequisites: Tailscale SOCKS SSH already working (see docs/nas-ssh-via-tailscale.md)
#   Host alias `nas` in ~/.ssh/config, SSHPASS or key auth.
#
#   sh ticket-queue-api/scripts/login-and-apply-cloudflare-via-ssh.sh

set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
REPO_DIR="${NAS_REPO_PATH:-/volume1/docker/tools-site}"
COMPOSE_DIR="$REPO_DIR/ticket-queue-api"
SSH_HOST_ALIAS="${NAS_SSH_ALIAS:-nas}"

export SKIP_NAS_APPLY=1
sh "$SCRIPT_DIR/login-and-provision-cloudflare-tunnel.sh"

BUNDLE="$ROOT_DIR/cloudflared"
if [ ! -f "$BUNDLE/credentials.json" ] || [ ! -f "$BUNDLE/config.yml" ]; then
  echo "ERROR: missing $BUNDLE/{config.yml,credentials.json}"
  exit 1
fi

echo "==> uploading cloudflared bundle to $SSH_HOST_ALIAS:$COMPOSE_DIR/cloudflared/"
ssh -T -o RequestTTY=no "$SSH_HOST_ALIAS" "mkdir -p $COMPOSE_DIR/cloudflared"
# Avoid scp PTY issues on some Cloud Agent environments
tar -C "$BUNDLE" -czf - config.yml credentials.json \
  | ssh -T -o RequestTTY=no "$SSH_HOST_ALIAS" \
    "tar -xzf - -C $COMPOSE_DIR/cloudflared && chmod 644 $COMPOSE_DIR/cloudflared/config.yml $COMPOSE_DIR/cloudflared/credentials.json"

echo "==> starting tunnel compose on NAS"
ssh -T -o RequestTTY=no "$SSH_HOST_ALIAS" "bash -s" <<REMOTE
set -e
export PATH="/usr/local/bin:\$PATH"
cd $COMPOSE_DIR
DOCKER=docker
if ! docker info >/dev/null 2>&1; then
  DOCKER="sudo -n docker"
fi
\$DOCKER compose -f docker-compose.yml -f docker-compose.cloudflare-login.yml up -d --build --remove-orphans
sleep 5
\$DOCKER ps --filter name=ticket-queue --format 'table {{.Names}}\t{{.Status}}'
curl -sf https://ticket-queue-api.mansejin.com/health && echo || echo 'WARN: public health pending'
REMOTE

echo "Done. https://ticket-queue-api.mansejin.com/health"
