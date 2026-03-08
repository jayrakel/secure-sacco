# Database Backup & Restore Runbook

**System:** Secure SACCO Management System  
**Database:** PostgreSQL 16  
**Storage:** AWS S3 (Standard-IA storage class)

---

## Recovery Objectives

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point Objective) | ≤ 24 hours (daily backup) |
| **RTO** (Recovery Time Objective) | ≤ 2 hours for full restore |

To reduce RPO to near-zero, enable PostgreSQL WAL archiving to S3 (see *Point-in-Time Recovery* section below).

---

## Backup Schedule

| Frequency | Retention | S3 Prefix |
|-----------|-----------|-----------|
| Daily (2am EAT) | 30 days | `postgres/daily/` |
| Weekly (Sunday 2am EAT) | 12 weeks | `postgres/weekly/` |
| Monthly (1st of month) | 12 months | `postgres/monthly/` |

### Crontab Configuration (on the application server)

```cron
# Daily backup — every day at 23:00 UTC (2:00 AM EAT)
0 23 * * * /opt/sacco/scripts/backup-db.sh >> /var/log/sacco-backup.log 2>&1

# Weekly backup — every Sunday at 22:00 UTC
0 22 * * 0 S3_PREFIX=postgres/weekly /opt/sacco/scripts/backup-db.sh >> /var/log/sacco-backup.log 2>&1

# Monthly backup — 1st of month at 21:00 UTC
0 21 1 * * S3_PREFIX=postgres/monthly /opt/sacco/scripts/backup-db.sh >> /var/log/sacco-backup.log 2>&1
```

---

## Required Environment Variables

Set these in `/etc/sacco/backup.env` (mode 600, owned by the deploy user):

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sacco_db
DB_USERNAME=sacco_user
DB_PASSWORD=<database_password>
S3_BUCKET=<your-sacco-backups-bucket>
S3_PREFIX=postgres/daily
SLACK_WEBHOOK_URL=<slack_webhook_for_alerts>   # optional
```

Load in crontab:

```cron
BASH_ENV=/etc/sacco/backup.env
```

---

## Performing a Restore

### Prerequisites
- AWS CLI configured with access to the S3 bucket
- `pg_dump`, `psql`, `gunzip` installed
- Target database server accessible

### Step 1 — List available backups

```bash
aws s3 ls s3://<bucket>/postgres/daily/ --recursive | sort | tail -10
```

### Step 2 — Run the restore script

```bash
# Set environment variables (or source /etc/sacco/backup.env)
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=sacco_db
export DB_USERNAME=sacco_user
export DB_PASSWORD=<password>

# Restore from a specific backup
./scripts/restore-db.sh s3://<bucket>/postgres/daily/sacco_backup_20260308_230000.sql.gz
```

The script will:
1. Download the backup from S3
2. Ask for confirmation (type `RESTORE`)
3. Terminate all database connections
4. Drop and recreate the database
5. Restore from the backup file

### Step 3 — Validate the restore

```bash
# Check row counts in critical tables
psql -h $DB_HOST -U $DB_USERNAME -d $DB_NAME -c "
SELECT 
    'members'           AS table_name, COUNT(*) FROM members
UNION ALL SELECT 'users',             COUNT(*) FROM users
UNION ALL SELECT 'loan_applications', COUNT(*) FROM loan_applications
UNION ALL SELECT 'savings_transactions', COUNT(*) FROM savings_transactions
UNION ALL SELECT 'journal_entries',   COUNT(*) FROM journal_entries;
"
```

### Step 4 — Run Flyway validation

Start the application in validation-only mode:

```bash
mvn flyway:validate \
    -Dflyway.url=jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME \
    -Dflyway.user=$DB_USERNAME \
    -Dflyway.password=$DB_PASSWORD
```

### Step 5 — Test the application

Start the application and verify:
- Admin login works
- Dashboard loads
- Recent transactions are visible

---

## Monthly Test Restore Procedure

A test restore must be performed on the **staging environment** on the first Monday of each month.

```bash
# On staging server:
1. Run restore-db.sh with last week's backup against staging DB
2. Run Flyway validation
3. Start application on staging profile
4. Log in as admin and verify a recent loan/transaction appears
5. Record the result in the RESTORE_LOG.md
```

---

## Point-in-Time Recovery (PITR)

For near-zero RPO, configure WAL archiving. If using a managed database (AWS RDS / Supabase / Neon), enable automated backups and PITR in the provider's settings.

For self-hosted PostgreSQL, add to `postgresql.conf`:

```conf
archive_mode = on
archive_command = 'aws s3 cp %p s3://<bucket>/postgres/wal/%f'
wal_level = replica
```

This allows recovery to any point in time, not just the last daily backup.

---

## Backup Monitoring

- The backup script sends a Slack alert on failure.
- Set up a CloudWatch alarm on the S3 bucket: if no new object is created in the `postgres/daily/` prefix within 26 hours, fire a PagerDuty/SNS alert.
- Review `/var/log/sacco-backup.log` weekly.

---

## Contacts

| Role | Contact |
|------|---------|
| Database Admin | Update with your DBA contact |
| DevOps Lead | Update with your DevOps contact |