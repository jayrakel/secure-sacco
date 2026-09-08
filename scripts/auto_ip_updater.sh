#!/bin/bash
# ==============================================================================
# auto_ip_updater.sh
# 
# Monitors the local server's public IP address. If it changes, this script:
# 1. Updates DigitalOcean Cloud Firewall (adds new IP, removes old IP)
# 2. SSHes into the Proxy Droplet to update UFW and Tinyproxy
# 3. Restarts the local backend service
# 4. Sends a Telegram notification
# ==============================================================================

# ─── Configuration ────────────────────────────────────────────────────────────

# Securely load the DigitalOcean API Token from the core configs
DO_CONFIG_FILE="/srv/techwave-core/configs/digitalocean.conf"
if [ -f "$DO_CONFIG_FILE" ]; then
    source "$DO_CONFIG_FILE"
else
    echo "ERROR: DigitalOcean config file missing at $DO_CONFIG_FILE"
    exit 1
fi

if [ -z "$DO_API_TOKEN" ]; then
    echo "ERROR: DO_API_TOKEN is not set in $DO_CONFIG_FILE"
    exit 1
fi

# Load Telegram Credentials
NOTIFY_CONFIG="/srv/techwave-core/configs/notifications.conf"
if [ -f "$NOTIFY_CONFIG" ]; then
    source "$NOTIFY_CONFIG"
fi

if [ -z "$FIREWALL_ID" ] || [ -z "$PROXY_IP" ] || [ -z "$PROXY_USER" ]; then
    echo "ERROR: FIREWALL_ID, PROXY_IP, or PROXY_USER is missing from $DO_CONFIG_FILE"
    exit 1
fi

# Where to store the last known IP
STORED_IP_FILE="$HOME/.current_public_ip.txt"

# ─── 1. Check IP ──────────────────────────────────────────────────────────────

CURRENT_IP=$(curl -s ifconfig.me)
if [ -z "$CURRENT_IP" ]; then
    echo "Failed to get current IP from ifconfig.me"
    exit 1
fi

STORED_IP=$(cat "$STORED_IP_FILE" 2>/dev/null || echo "")

if [ "$CURRENT_IP" == "$STORED_IP" ]; then
    # IP hasn't changed, everything is healthy. Exit silently.
    exit 0
fi

echo "Public IP changed from '$STORED_IP' to '$CURRENT_IP'. Initiating updates..."

# Helper function for Telegram errors
send_telegram_error() {
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl --http1.1 -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d parse_mode="HTML" \
        -d text="❌ <b>CRITICAL ERROR:</b> $1" > /dev/null
    fi
}

# ─── 2. Update DigitalOcean Firewall ──────────────────────────────────────────

echo "Adding new IP to DO Firewall (Ports 8888 and 22)..."
JSON_PAYLOAD="{\"inbound_rules\":[{\"protocol\":\"tcp\",\"ports\":\"8888\",\"sources\":{\"addresses\":[\"$CURRENT_IP\"]}},{\"protocol\":\"tcp\",\"ports\":\"22\",\"sources\":{\"addresses\":[\"$CURRENT_IP\"]}}]}"
HTTP_STATUS=$(curl --http1.1 -sS -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $DO_API_TOKEN" -d "$JSON_PAYLOAD" "https://api.digitalocean.com/v2/firewalls/$FIREWALL_ID/rules")

if [ "$HTTP_STATUS" -ne 200 ] && [ "$HTTP_STATUS" -ne 202 ] && [ "$HTTP_STATUS" -ne 204 ]; then
    echo "ERROR: Failed to update DO Firewall. API returned HTTP $HTTP_STATUS."
    send_telegram_error "Failed to update DigitalOcean Firewall for new IP ($CURRENT_IP). API returned HTTP Status: $HTTP_STATUS"
    exit 1
fi

# Remove the old IP rule (if we have one)
if [ -n "$STORED_IP" ]; then
  echo "Removing old IP from DO Firewall (Ports 8888 and 22)..."
  DELETE_PAYLOAD="{\"inbound_rules\":[{\"protocol\":\"tcp\",\"ports\":\"8888\",\"sources\":{\"addresses\":[\"$STORED_IP\"]}},{\"protocol\":\"tcp\",\"ports\":\"22\",\"sources\":{\"addresses\":[\"$STORED_IP\"]}}]}"
  curl --http1.1 -sS -X DELETE -H "Content-Type: application/json" -H "Authorization: Bearer $DO_API_TOKEN" -d "$DELETE_PAYLOAD" "https://api.digitalocean.com/v2/firewalls/$FIREWALL_ID/rules" > /dev/null
fi


# ─── 3. Update UFW and Tinyproxy via SSH ──────────────────────────────────────

echo "Connecting to Proxy ($PROXY_IP) to update UFW and Tinyproxy..."
# We use a Here-Doc to run multiple commands securely over SSH
ssh -o StrictHostKeyChecking=no "$PROXY_USER@$PROXY_IP" << EOF
  # Stop immediately if a critical command fails
  set -e
  
  # UFW Updates (|| true prevents crash if rule doesn't exist)
  if [ -n "$STORED_IP" ]; then
    ufw delete allow from $STORED_IP to any port 8888 || true
    ufw delete allow from $STORED_IP to any port 22 || true
  fi
  ufw allow from $CURRENT_IP to any port 8888
  ufw allow from $CURRENT_IP to any port 22
  ufw reload

  # Tinyproxy Updates
  if [ -n "$STORED_IP" ]; then
    sed -i "s/^Allow $STORED_IP/Allow $CURRENT_IP/" /etc/tinyproxy/tinyproxy.conf
  fi
  
  # Ensure the new IP is in there just in case the sed replacement failed
  if ! grep -q "^Allow $CURRENT_IP" /etc/tinyproxy/tinyproxy.conf; then
    echo "Allow $CURRENT_IP" >> /etc/tinyproxy/tinyproxy.conf
  fi
  
  systemctl restart tinyproxy
EOF

# Check if the SSH command succeeded
if [ $? -ne 0 ]; then
    echo "ERROR: SSH connection or commands failed on $PROXY_IP."
    send_telegram_error "Failed to configure UFW or Tinyproxy on the droplet ($PROXY_IP). Please check the server manually."
    exit 1
fi


# ─── 4. Restart Backend Service ───────────────────────────────────────────────

echo "Restarting backend service..."
/srv/techwave-core/bin/techwave restart-app secure-sacco
# (Or if it is just a docker restart: /srv/techwave-core/bin/techwave restart secure-sacco-backend-1)

# ─── 5. Save New IP & Send Notification ───────────────────────────────────────

echo "$CURRENT_IP" > "$STORED_IP_FILE"

MESSAGE="✅ <b>Secure Sacco Network Updated!</b>%0A%0AISP changed your server's IP address.%0A<b>Old IP:</b> $STORED_IP%0A<b>New IP:</b> $CURRENT_IP%0A%0AThe DO Firewall, UFW, and Proxy have been automatically updated and the backend was restarted."

if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl --http1.1 -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" \
    -d parse_mode="HTML" \
    -d text="$MESSAGE" > /dev/null
fi

echo "Update complete."
