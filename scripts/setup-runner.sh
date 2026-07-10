#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-runner.sh — Install GitHub Actions self-hosted runner on tw-core-01
#
# Why self-hosted runner?
#   Your ISP uses CGNAT — GitHub cannot SSH into your server.
#   The runner POLLS GitHub for jobs (outbound only), bypassing CGNAT entirely.
#
# Prerequisites:
#   - Run as the 'techwave' user (NOT with sudo)
#   - Docker is installed and running
#   - Registration token from: Repo → Settings → Actions → Runners → New runner
#
# Usage:
#   chmod +x setup-runner.sh
#   ./setup-runner.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RUNNER_DIR="/srv/techwave-core/actions-runner"
REPO_URL="${REPO_URL:-https://github.com/jayrakel/secure-sacco}"
RUNNER_NAME=$(hostname)

# Fallback version used when the GitHub API is rate-limited (HTTP 403).
# Update this to the latest stable release if needed:
# https://github.com/actions/runner/releases
FALLBACK_RUNNER_VERSION="2.335.1"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GitHub Actions Self-Hosted Runner Setup"
echo "  Repository: ${REPO_URL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Add user to the docker group ─────────────────────────────────────
echo "▶ Step 1: Ensuring '${USER}' is in the docker group..."
if groups "${USER}" | grep -q docker; then
  echo "   Already in docker group."
else
  sudo usermod -aG docker "${USER}"
  echo "   Added. (A re-login is needed for interactive docker use;"
  echo "   the systemd service picks it up automatically.)"
fi
echo ""

# ── Step 2: Create runner directory ──────────────────────────────────────────
echo "▶ Step 2: Creating runner directory at ${RUNNER_DIR}..."
sudo mkdir -p "${RUNNER_DIR}"
sudo chown -R "${USER}:${USER}" "${RUNNER_DIR}"
cd "${RUNNER_DIR}"
echo ""

# ── Step 3: Download runner ───────────────────────────────────────────────────
echo "▶ Step 3: Downloading GitHub Actions runner..."

# Try the GitHub API with a proper User-Agent header (GitHub requires it).
# If the IP is rate-limited (HTTP 403 / empty response), fall back gracefully.
RUNNER_VERSION=$(
  curl -fsSL \
    -H "Accept: application/vnd.github.v3+json" \
    -H "User-Agent: setup-runner-script/1.0 (${REPO_URL})" \
    "https://api.github.com/repos/actions/runner/releases/latest" 2>/dev/null \
  | python3 -c \
      "import sys,json; print(json.load(sys.stdin)['tag_name'].lstrip('v'))" 2>/dev/null
) || true   # do NOT exit on failure — we have a fallback

if [ -z "${RUNNER_VERSION}" ]; then
  RUNNER_VERSION="${FALLBACK_RUNNER_VERSION}"
  echo "   ⚠️  GitHub API unavailable (rate-limited?) — using fallback v${RUNNER_VERSION}"
else
  echo "   Latest runner version: ${RUNNER_VERSION}"
fi

RUNNER_ARCHIVE="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_ARCHIVE}"

if [ -f "${RUNNER_ARCHIVE}" ]; then
  echo "   Archive already present — skipping download."
else
  echo "   Downloading from: ${RUNNER_URL}"
  curl -fsSL -o "${RUNNER_ARCHIVE}" "${RUNNER_URL}"
  echo "   Downloaded ${RUNNER_ARCHIVE}"
fi

if [ -f "./config.sh" ]; then
  echo "   Runner already extracted — skipping."
else
  tar xzf "${RUNNER_ARCHIVE}"
  echo "   Extracted."
fi
echo ""

# ── Step 4: Registration token ────────────────────────────────────────────────
echo "▶ Step 4: Registration token"
echo ""
echo "   Open this URL in a browser:"
echo "   ${REPO_URL}/settings/actions/runners/new?runnerOs=linux"
echo ""
echo "   In the 'Configure' section you will see:"
echo "     ./config.sh --url ${REPO_URL} --token AXXXXXXXXXXXXXXXXXX"
echo ""
echo "   Paste ONLY the token (the part after --token, ~29 characters):"
printf "   > "
read -r RUNNER_TOKEN
echo ""

if [ -z "${RUNNER_TOKEN}" ]; then
  echo "❌ Token cannot be empty. Exiting."
  exit 1
fi

# ── Step 5: Configure the runner ─────────────────────────────────────────────
echo "▶ Step 5: Configuring runner as '${RUNNER_NAME}'..."

if [ -f ".runner" ]; then
  echo "   Runner already configured. (Delete .runner to reconfigure.)"
else
  ./config.sh \
    --url "${REPO_URL}" \
    --token "${RUNNER_TOKEN}" \
    --name "${RUNNER_NAME}" \
    --labels "self-hosted,linux,x64,production" \
    --work "_work" \
    --unattended \
    --replace
fi
echo ""

# ── Step 6: Install as systemd service ────────────────────────────────────────
echo "▶ Step 6: Installing as systemd service (runs on every boot)..."
sudo ./svc.sh install "${USER}"
sudo ./svc.sh start

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  GitHub Actions Runner is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Runner name:  ${RUNNER_NAME}"
echo "  Labels:       self-hosted, linux, x64, production"
echo "  Working dir:  ${RUNNER_DIR}/_work"
echo ""
echo "  Check status:   sudo systemctl status 'actions.runner.*'"
echo "  View logs:      sudo journalctl -u 'actions.runner.*' -f"
echo ""
echo "  Verify on GitHub → should show as 'Idle' (green dot):"
echo "  ${REPO_URL}/settings/actions/runners"
echo ""
