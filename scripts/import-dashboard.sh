#!/bin/bash
set -e

BACKUP_FILE="${1:-dashboards_backup.zip}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: $BACKUP_FILE not found"
    echo "Usage: ./scripts/import-dashboard.sh [backup_file.zip]"
    exit 1
fi

echo "Importing Superset dashboards from $BACKUP_FILE..."

# Copy backup to container
docker cp "$BACKUP_FILE" piam-superset:/app/superset_home/dashboards_backup.zip

# Import dashboards
docker exec piam-superset superset import-dashboards -p /app/superset_home/dashboards_backup.zip

echo ""
echo "✅ Dashboards imported successfully"
