#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-runner.sh — Install GitHub Actions self-hosted runner on tw-core-01
#
# What this does:
#   1. Downloads the latest GitHub Actions runner
#   2. Configures it for your repository
#   3. Installs it as a systemd service (runs as 'techwave' user)
#   4. Adds 'techwave' to the docker group so it can run docker commands
#
# Why self-hosted runner?
#   Your ISP uses CGNAT — GitHub cannot SSH into your server.
#   The runner POLLS GitHub for jobs (outbound connection), bypassing CGNAT.
#
# Prerequisites:
#   - Run as the 'techwave' user
#   - Docker is installed and running
#   - You have a GitHub Personal Access Token OR the registration token
#     from: Repo → Settings → Actions → Runners → New self-hosted runner
#
# Usage:
#   chmod +x setup-runner.sh
#   ./setup-runner.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RUNNER_DIR="${HOME}/actions-runner"
REPO_URL="https://github.com/jayrakel/secure-sacco"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GitHub Actions Self-Hosted Runner Setup"
echo "  Repository: ${REPO_URL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Add techwave to the docker group ──────────────────────────────────
echo "▶ Step 1: Ensuring '${USER}' is in the docker group..."
if groups "${USER}" | grep -q docker; then
  echo "   Already in docker group."
else
  sudo usermod -aG docker "${USER}"
  echo "   Added to docker group. (Re-login may be needed for docker commands"
  echo "   outside this script, but the systemd service will pick it up.)"
fi
echo ""

# ── Step 2: Create runner directory ──────────────────────────────────────────
echo "▶ Step 2: Creating runner directory at ${RUNNER_DIR}..."
mkdir -p "${RUNNER_DIR}"
cd "${RUNNER_DIR}"
echo ""

# ── Step 3: Download latest runner ────────────────────────────────────────────
echo "▶ Step 3: Downloading latest GitHub Actions runner..."

# Get the latest runner version
RUNNER_VERSION=$(curl -fsSL \
  "https://api.github.com/repos/actions/runner/releases/latest" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['tag_name'].lstrip('v'))")

echo "   Latest runner version: ${RUNNER_VERSION}"

RUNNER_ARCHIVE="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_ARCHIVE}"

if [ -f "${RUNNER_ARCHIVE}" ]; then
  echo "   Archive already downloaded — skipping."
else
  curl -fsSL -o "${RUNNER_ARCHIVE}" "${RUNNER_URL}"
  echo "   Downloaded ${RUNNER_ARCHIVE}"
fi

tar xzf "${RUNNER_ARCHIVE}"
echo "   Extracted."
echo ""

# ── Step 4: Get the registration token ────────────────────────────────────────
echo "▶ Step 4: Registration token"
echo ""
echo "   You need a registration token from GitHub."
echo "   Go to: ${REPO_URL}/settings/actions/runners/new?runnerOs=linux"
echo ""
echo "   On that page, find the token in the 'Configure' section, e.g.:"
echo "     ./config.sh --url ${REPO_URL} --token AXXXXXXXXXXXXXXXXXX"
echo ""
printf "   Paste your registration token here: "
read -r RUNNER_TOKEN
echo ""

# ── Step 5: Configure the runner ─────────────────────────────────────────────
echo "▶ Step 5: Configuring runner..."
./config.sh \
  --url "${REPO_URL}" \
  --token "${RUNNER_TOKEN}" \
  --name "tw-core-01" \
  --labels "self-hosted,linux,x64,production" \
  --work "_work" \
  --unattended \
  --replace
echo ""

# ── Step 6: Install as systemd service ────────────────────────────────────────
echo "▶ Step 6: Installing as systemd service..."
sudo ./svc.sh install "${USER}"
sudo ./svc.sh start

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  GitHub Actions Runner is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Runner name:   tw-core-01"
echo "  Labels:        self-hosted, linux, x64, production"
echo "  Working dir:   ${RUNNER_DIR}/_work"
echo ""
echo "  Check status:"
echo "    sudo systemctl status actions.runner.*.tw-core-01.service"
echo ""
echo "  View logs:"
echo "    sudo journalctl -u actions.runner.*.tw-core-01.service -f"
echo ""
echo "  Verify on GitHub:"
echo "    ${REPO_URL}/settings/actions/runners"
echo "    → Runner 'tw-core-01' should show as 'Idle' (green)"
echo ""
echo "  ⚠️  Important: Make sure these GitHub Actions secrets/vars are set"
echo "     before triggering the first deploy:"
echo ""
echo "     SECRETS (Repo → Settings → Secrets and variables → Actions):"
echo "       APP_FIELD_ENCRYPTION_KEY, APP_PII_HMAC_KEY"
echo "       PROD_DB_USERNAME, PROD_DB_PASSWORD"
echo "       REDIS_PASSWORD"
echo "       APP_DEFAULT_ADMIN_PASSWORD"
echo "       RESEND_API_KEY"
echo "       CLOUDINARY_URL"
echo "       COOP_CONSUMER_KEY, COOP_CONSUMER_SECRET"
echo "       COOP_SACCO_ACCOUNT_NUMBER, COOP_BASIC_AUTH"
echo ""
echo "     VARIABLES (same page → Variables tab):"
echo "       FRONTEND_URL=https://betterlinkventureslimited.co.ke"
echo "       COOP_CALLBACK_BASE_URL=https://api.betterlinkventureslimited.co.ke"
echo "       APP_OFFICIAL_EMAIL_DOMAIN=betterlinkventureslimited.co.ke"
echo "       APP_DEFAULT_ADMIN_EMAIL=admin@betterlinkventureslimited.co.ke"
echo "       APP_DEFAULT_ADMIN_PHONE=+254700000000"
echo "       COOP_OPERATOR_CODE=BETTERLINK"
echo "       COOP_BASE_URL=https://openapi.co-opbank.co.ke"
echo "       MAIL_FROM=noreply@betterlinkventureslimited.co.ke"
echo "       COOP_ALLOWED_CALLBACK_IPS="
echo ""
