#!/bin/bash
# =============================================================================
# Export Dashboard - Backup Superset Dashboards to ZIP Archive
# =============================================================================
#
# Purpose:
#   Exports all Superset dashboards to a ZIP archive for backup or migration.
#   The export includes dashboard definitions, charts, and related metadata.
#
# Prerequisites:
#   - Docker must be running
#   - Superset container (piam-superset) must be up and healthy
#   - Dashboards must exist in Superset to export
#
# Usage:
#   ./scripts/export-dashboard.sh [output_file]
#
# Arguments:
#   output_file - Optional. Name of the output ZIP file.
#                 Defaults to "dashboards_backup.zip"
#
# Examples:
#   ./scripts/export-dashboard.sh
#   ./scripts/export-dashboard.sh my_backup.zip
#   ./scripts/export-dashboard.sh backups/dashboard_$(date +%Y%m%d).zip
#
# Exit Codes:
#   0 - Export completed successfully
#   1 - Error during export (container issue, permission error, etc.)
#
# Notes:
#   - Output file is created in the current working directory
#   - Existing files with the same name will be overwritten
# =============================================================================
set -e

OUTPUT_FILE="${1:-dashboards_backup.zip}"

echo "Exporting Superset dashboards..."

# Export inside container
docker exec piam-superset superset export-dashboards -f /app/superset_home/dashboards_backup.zip

# Copy to host
docker cp piam-superset:/app/superset_home/dashboards_backup.zip "./$OUTPUT_FILE"

echo ""
echo "✅ Exported to ./$OUTPUT_FILE"
