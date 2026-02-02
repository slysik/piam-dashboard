#!/bin/bash
# =============================================================================
# Health Check - Verify PIAM Dashboard Services Status
# =============================================================================
#
# Purpose:
#   Checks the health status of all PIAM dashboard infrastructure services
#   including ClickHouse database and Apache Superset. Also displays the
#   current state of ClickHouse tables with row counts.
#
# Prerequisites:
#   - Docker must be running
#   - ClickHouse container (piam-clickhouse) must be up
#   - Superset container (piam-superset) should be up for full check
#
# Usage:
#   ./scripts/health-check.sh
#
# Examples:
#   ./scripts/health-check.sh
#
# Exit Codes:
#   0 - All critical services are healthy
#   1 - ClickHouse is not responding (critical failure)
#
# Notes:
#   - Superset may take up to 60 seconds to start on first run
#   - Tables with no data will show "(no data loaded yet)"
# =============================================================================

echo "Checking services..."

# Check ClickHouse
echo -n "  ClickHouse: "
if curl -sf http://localhost:8123/ping > /dev/null 2>&1; then
    echo "✅ healthy"
else
    echo "❌ not responding"
    exit 1
fi

# Check Superset
echo -n "  Superset:   "
if curl -sf http://localhost:8088/health > /dev/null 2>&1; then
    echo "✅ healthy"
else
    echo "⚠️  starting (may take 60s on first run)"
fi

# Check ClickHouse tables
echo ""
echo "ClickHouse tables:"
docker exec piam-clickhouse clickhouse-client --database=piam --query="SELECT name, total_rows FROM system.tables WHERE database='piam' AND total_rows > 0 ORDER BY name" 2>/dev/null || echo "  (no data loaded yet)"
