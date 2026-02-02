#!/bin/bash
# =============================================================================
# Import Dashboard - Restore Superset Dashboards from ZIP Archive
# =============================================================================
#
# Purpose:
#   Imports Superset dashboards from a previously exported ZIP archive.
#   Used for restoring backups or migrating dashboards between environments.
#
# Prerequisites:
#   - Docker must be running
#   - Superset container (piam-superset) must be up and healthy
#   - Valid dashboard backup ZIP file must exist
#
# Usage:
#   ./scripts/import-dashboard.sh [backup_file]
#
# Arguments:
#   backup_file - Optional. Path to the ZIP file to import.
#                 Defaults to "dashboards_backup.zip"
#
# Examples:
#   ./scripts/import-dashboard.sh
#   ./scripts/import-dashboard.sh my_backup.zip
#   ./scripts/import-dashboard.sh backups/dashboard_20240115.zip
#
# Exit Codes:
#   0 - Import completed successfully
#   1 - Backup file not found or import error
#
# Notes:
#   - Existing dashboards with same names may be overwritten
#   - Ensure database connections are configured before importing
# =============================================================================
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
