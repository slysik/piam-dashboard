#!/bin/bash
set -e

OUTPUT_FILE="${1:-dashboards_backup.zip}"

echo "Exporting Superset dashboards..."

# Export inside container
docker exec piam-superset superset export-dashboards -f /app/superset_home/dashboards_backup.zip

# Copy to host
docker cp piam-superset:/app/superset_home/dashboards_backup.zip "./$OUTPUT_FILE"

echo ""
echo "✅ Exported to ./$OUTPUT_FILE"
