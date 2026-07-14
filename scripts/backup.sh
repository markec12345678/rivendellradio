#!/bin/sh
# ============================================================================
# backup.sh — Automatic SQLite database backup for Rock 88.7
#
# Runs daily via docker-compose.production.yml backup service.
# Keeps 30 days of backups by default.
#
# Manual run:
#   docker compose -f docker-compose.production.yml run --rm backup
# ============================================================================

set -e

DB_PATH="/data/custom.db"
BACKUP_DIR="/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/rock887_${TIMESTAMP}.db"

echo "[$(date)] Starting backup..."

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
  echo "[$(date)] ERROR: Database file not found at $DB_PATH"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Copy the database (SQLite files can be safely copied when not in active write)
cp "$DB_PATH" "$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"
echo "[$(date)] Backup created: ${BACKUP_FILE}.gz"

# Clean up old backups
find "$BACKUP_DIR" -name "rock887_*.db.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Cleaned up backups older than $RETENTION_DAYS days"

# List remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "rock887_*.db.gz" | wc -l)
echo "[$(date)] Total backups: $BACKUP_COUNT"

echo "[$(date)] Backup complete."

# If running in cron mode (BACKUP_SCHEDULE is set), sleep and repeat
if [ -n "$BACKUP_SCHEDULE" ]; then
  echo "[$(date)] Cron mode enabled. Schedule: $BACKUP_SCHEDULE"

  # Install crond if not present
  if ! command -v crond >/dev/null 2>&1; then
    apk add --no-cache busybox-suid
  fi

  # Set up cron job
  echo "$BACKUP_SCHEDULE /bin/sh /backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root
  crond -f -l 2
fi
