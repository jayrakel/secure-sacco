#!/usr/bin/env bash
# =============================================================================
# scripts/backup-db.sh — Secure SACCO PostgreSQL Backup Script
#
# Usage: ./backup-db.sh
#
# Required environment variables:
#   DB_HOST          PostgreSQL host (default: localhost)
#   DB_PORT          PostgreSQL port (default: 5432)
#   DB_NAME          Database name   (default: sacco_db)
#   DB_USERNAME      Database user
#   DB_PASSWORD      Database password (set via PGPASSWORD)
#   S3_BUCKET        S3 bucket name (e.g. my-sacco-backups)
#   S3_PREFIX        S3 key prefix  (e.g. postgres/daily)
#   SLACK_WEBHOOK_URL  Optional Slack webhook for failure alerts
#
# Cron example (daily at 2am EAT = 23:00 UTC):
#   0 23 * * * /opt/sacco/scripts/backup-db.sh >> /var/log/sacco-backup.log 2>&1
# =============================================================================

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-sacco_db}"
DB_USERNAME="${DB_USERNAME:?DB_USERNAME must be set}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD must be set}"
S3_BUCKET="${S3_BUCKET:?S3_BUCKET must be set}"
S3_PREFIX="${S3_PREFIX:-postgres/daily}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

BACKUP_DIR="/tmp/sacco-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/sacco_backup_${TIMESTAMP}.sql.gz"
LOG_PREFIX="[SACCO-BACKUP ${TIMESTAMP}]"

# ─── Helpers ─────────────────────────────────────────────────────────────────

log() { echo "${LOG_PREFIX} $*"; }

notify_failure() {
    local message="$1"
    log "ERROR: ${message}"

    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -s -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-type: application/json' \
            --data "{\"text\":\":rotating_light: *SACCO DB Backup FAILED* on \`$(hostname)\`\\n${message}\"}" \
            || true
    fi
}

cleanup() {
    if [ -f "${BACKUP_FILE}" ]; then
        rm -f "${BACKUP_FILE}"
        log "Cleaned up local backup file."
    fi
}

trap 'notify_failure "Backup script failed at line ${LINENO}. Exit code: $?"; cleanup' ERR

# ─── Pre-flight checks ────────────────────────────────────────────────────────

log "Starting backup of database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"

command -v pg_dump >/dev/null 2>&1 || { notify_failure "pg_dump not found."; exit 1; }
command -v aws     >/dev/null 2>&1 || { notify_failure "aws CLI not found."; exit 1; }

mkdir -p "${BACKUP_DIR}"

# ─── Dump ────────────────────────────────────────────────────────────────────

log "Running pg_dump..."

export PGPASSWORD="${DB_PASSWORD}"

pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USERNAME}" \
    --dbname="${DB_NAME}" \
    --format=plain \
    --no-password \
    --verbose \
    | gzip -9 > "${BACKUP_FILE}"

unset PGPASSWORD

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
log "Dump complete. File: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ─── Upload to S3 ─────────────────────────────────────────────────────────────

S3_KEY="${S3_PREFIX}/sacco_backup_${TIMESTAMP}.sql.gz"
S3_URI="s3://${S3_BUCKET}/${S3_KEY}"

log "Uploading to ${S3_URI}..."

aws s3 cp "${BACKUP_FILE}" "${S3_URI}" \
    --storage-class STANDARD_IA \
    --metadata "db=${DB_NAME},timestamp=${TIMESTAMP},host=$(hostname)"

log "Upload successful: ${S3_URI}"

# ─── Verify upload ────────────────────────────────────────────────────────────

aws s3 ls "${S3_URI}" >/dev/null 2>&1 || {
    notify_failure "Backup uploaded but verification check failed for ${S3_URI}"
    exit 1
}

log "Verification passed."

# ─── Retention: delete backups older than 30 days ────────────────────────────

log "Pruning daily backups older than 30 days from s3://${S3_BUCKET}/${S3_PREFIX}/..."

aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" \
    | awk '{print $4}' \
    | while read -r key; do
        # Extract date from filename: sacco_backup_YYYYMMDD_HHMMSS.sql.gz
        file_date=$(echo "${key}" | grep -oP '\d{8}' | head -1)
        if [ -n "${file_date}" ]; then
            file_epoch=$(date -d "${file_date}" +%s 2>/dev/null || date -j -f "%Y%m%d" "${file_date}" +%s 2>/dev/null)
            cutoff_epoch=$(date -d "30 days ago" +%s 2>/dev/null || date -v-30d +%s 2>/dev/null)
            if [ -n "${file_epoch}" ] && [ "${file_epoch}" -lt "${cutoff_epoch}" ]; then
                log "Deleting old backup: ${key}"
                aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${key}"
            fi
        fi
    done

# ─── Cleanup ─────────────────────────────────────────────────────────────────

cleanup

log "Backup completed successfully. Size: ${BACKUP_SIZE}, S3: ${S3_URI}"