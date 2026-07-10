#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-cloudflared.sh — Install & configure Cloudflare Tunnel on tw-core-01
#
# What this does:
#   1. Installs cloudflared (the Cloudflare Tunnel daemon)
#   2. Authenticates with your Cloudflare account
#   3. Creates a named tunnel: "secure-sacco-prod"
#   4. Writes a tunnel config routing your two hostnames to local Nginx
#   5. Installs cloudflared as a systemd service so it auto-starts on reboot
#
# Prerequisites:
#   - Your domain betterlinkventureslimited.co.ke is on Cloudflare
#   - You are running as the 'techwave' user (or a user with sudo)
#   - Nginx is running on localhost:80 (your techwave-core stack)
#
# Usage:
#   chmod +x setup-cloudflared.sh
#   ./setup-cloudflared.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TUNNEL_NAME="secure-sacco-prod"
CLOUDFLARED_CONFIG_DIR="/etc/cloudflared"
DOMAIN="betterlinkventureslimited.co.ke"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Cloudflare Tunnel Setup — Secure SACCO Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Install cloudflared ───────────────────────────────────────────────
echo "▶ Step 1: Installing cloudflared..."

# Add Cloudflare GPG key and repo (Debian)
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null

echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt-get update -q
sudo apt-get install -y cloudflared

echo "   cloudflared $(cloudflared --version) installed."
echo ""

# ── Step 2: Authenticate with Cloudflare ─────────────────────────────────────
echo "▶ Step 2: Authenticating with Cloudflare..."
echo "   A browser window will open (or a URL will be printed)."
echo "   Log in to your Cloudflare account and select the zone:"
echo "   → ${DOMAIN}"
echo ""
cloudflared tunnel login
echo ""

# ── Step 3: Create the tunnel ─────────────────────────────────────────────────
echo "▶ Step 3: Creating tunnel '${TUNNEL_NAME}'..."

# Check if it already exists
if cloudflared tunnel list | grep -q "${TUNNEL_NAME}"; then
  echo "   Tunnel '${TUNNEL_NAME}' already exists — skipping creation."
else
  cloudflared tunnel create "${TUNNEL_NAME}"
fi

# Get the tunnel ID (UUID)
TUNNEL_ID=$(cloudflared tunnel list --output json | \
  python3 -c "import sys,json; \
    tunnels=[t for t in json.load(sys.stdin) if t['name']=='${TUNNEL_NAME}']; \
    print(tunnels[0]['id'])" 2>/dev/null)

echo "   Tunnel ID: ${TUNNEL_ID}"
echo ""

# ── Step 4: Write the tunnel config ──────────────────────────────────────────
echo "▶ Step 4: Writing tunnel config to ${CLOUDFLARED_CONFIG_DIR}/config.yml..."
sudo mkdir -p "${CLOUDFLARED_CONFIG_DIR}"

sudo tee "${CLOUDFLARED_CONFIG_DIR}/config.yml" > /dev/null <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

# Cloudflared routes these hostnames → your local Nginx (which then proxies
# to the correct container port based on the Host header).
ingress:
  - hostname: ${DOMAIN}
    service: http://localhost:80
  - hostname: www.${DOMAIN}
    service: http://localhost:80
  - hostname: api.${DOMAIN}
    service: http://localhost:80
  # Catch-all — reject any other tunnel requests
  - service: http_status:404
EOF

echo "   Config written."
echo ""

# ── Step 5: Create DNS records in Cloudflare ─────────────────────────────────
echo "▶ Step 5: Creating DNS CNAME records in Cloudflare..."
echo "   (These will point your hostnames through the tunnel)"
echo ""

cloudflared tunnel route dns "${TUNNEL_NAME}" "${DOMAIN}"           || echo "   (skipped — record may already exist)"
cloudflared tunnel route dns "${TUNNEL_NAME}" "www.${DOMAIN}"       || echo "   (skipped — record may already exist)"
cloudflared tunnel route dns "${TUNNEL_NAME}" "api.${DOMAIN}"       || echo "   (skipped — record may already exist)"

echo ""

# ── Step 6: Install as systemd service ────────────────────────────────────────
echo "▶ Step 6: Installing cloudflared as a systemd service..."
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Cloudflare Tunnel is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Tunnel name:  ${TUNNEL_NAME}"
echo "  Tunnel ID:    ${TUNNEL_ID}"
echo ""
echo "  Routes:"
echo "    https://${DOMAIN}          → localhost:80 (Nginx → frontend :3000)"
echo "    https://www.${DOMAIN}      → localhost:80"
echo "    https://api.${DOMAIN}      → localhost:80 (Nginx → backend  :8080)"
echo ""
echo "  Check status:  sudo systemctl status cloudflared"
echo "  View logs:     sudo journalctl -u cloudflared -f"
echo ""
echo "  ⚠️  Next step: copy nginx-sacco.conf to Nginx and reload:"
echo "     sudo cp nginx-sacco.conf /srv/infrastructure/configs/nginx/sacco.conf"
echo "     docker compose -f /srv/techwave-core/compose/compose.yml exec nginx nginx -s reload"
echo ""
