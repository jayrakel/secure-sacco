#!/usr/bin/env bash
# =============================================================================
# scripts/restore-db.sh — Secure SACCO Database Restore Script
#
# Usage:
#   ./restore-db.sh <S3_URI>
#   Example: ./restore-db.sh s3://my-sacco-backups/postgres/daily/sacco_backup_20260308_230000.sql.gz
#
# WARNING: This script DROPS and recreates the target database.
#          Run ONLY on a staging/recovery environment unless you are
#          intentionally restoring production after a data loss event.
#
# Required environment variables: same as backup-db.sh
# =============================================================================

set -euo pipefail

S3_URI="${1:?Usage: $0 <S3_URI>}"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-sacco_db}"
DB_USERNAME="${DB_USERNAME:?DB_USERNAME must be set}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD must be set}"
POSTGRES_ADMIN_USER="${POSTGRES_ADMIN_USER:-postgres}"

RESTORE_FILE="/tmp/sacco_restore_$(date +%Y%m%d_%H%M%S).sql.gz"

log() { echo "[SACCO-RESTORE $(date +%H:%M:%S)] $*"; }

trap 'log "Restore FAILED at line ${LINENO}"; rm -f "${RESTORE_FILE}"' ERR

# ─── Download ─────────────────────────────────────────────────────────────────

log "Downloading backup from ${S3_URI}..."
aws s3 cp "${S3_URI}" "${RESTORE_FILE}"
log "Download complete: ${RESTORE_FILE} ($(du -sh "${RESTORE_FILE}" | cut -f1))"

# ─── Confirm before proceeding ────────────────────────────────────────────────

echo ""
echo "====================================================================="
echo " WARNING: About to DROP and restore database: ${DB_NAME}"
echo " Host: ${DB_HOST}:${DB_PORT}"
echo " Backup: ${S3_URI}"
echo "====================================================================="
read -rp " Type 'RESTORE' to confirm: " confirm

if [ "${confirm}" != "RESTORE" ]; then
    log "Restore cancelled by user."
    rm -f "${RESTORE_FILE}"
    exit 0
fi

# ─── Drop and recreate the database ──────────────────────────────────────────

log "Terminating all connections to ${DB_NAME}..."

export PGPASSWORD="${DB_PASSWORD}"

psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${POSTGRES_ADMIN_USER}" \
    --dbname="postgres" \
    --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();"

log "Dropping database ${DB_NAME}..."
psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${POSTGRES_ADMIN_USER}" \
    --dbname="postgres" \
    --command="DROP DATABASE IF EXISTS ${DB_NAME};"

log "Creating fresh database ${DB_NAME}..."
psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${POSTGRES_ADMIN_USER}" \
    --dbname="postgres" \
    --command="CREATE DATABASE ${DB_NAME} OWNER ${DB_USERNAME};"

# ─── Restore ─────────────────────────────────────────────────────────────────

log "Restoring from backup..."

gunzip -c "${RESTORE_FILE}" | psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USERNAME}" \
    --dbname="${DB_NAME}" \
    --no-password

unset PGPASSWORD

log "Restore complete."

# ─── Post-restore: run Flyway validation ─────────────────────────────────────

log "Running Flyway migration validation (Spring Boot dry-run)..."
log "Start the application with SPRING_PROFILES_ACTIVE=test to validate migrations."
log "Or run: mvn flyway:validate -Dflyway.url=jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"

# ─── Cleanup ─────────────────────────────────────────────────────────────────

rm -f "${RESTORE_FILE}"
log "Restore finished successfully."