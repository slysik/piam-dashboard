#!/bin/bash

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
