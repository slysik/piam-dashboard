#!/bin/bash
set -e

DATA_DIR="clickhouse/data"
CH="docker exec -i piam-clickhouse clickhouse-client --database=piam"

echo "Loading data into ClickHouse..."

# Helper function
load_table() {
    local table=$1
    local file="$DATA_DIR/${table}.csv"
    if [ -f "$file" ]; then
        echo "  Loading $table..."
        $CH --query="TRUNCATE TABLE IF EXISTS $table"
        $CH --query="INSERT INTO $table FORMAT CSVWithNames" < "$file"
    else
        echo "  Skipping $table (file not found)"
    fi
}

# Load dimensions
load_table "dim_tenant"
load_table "dim_site"
load_table "dim_location"
load_table "dim_person"
load_table "dim_entitlement"

# Load facts
load_table "fact_access_events"
load_table "fact_connector_health"
load_table "fact_compliance_status"
load_table "fact_access_requests"

# Show counts
echo ""
echo "Row counts:"
$CH --query="
SELECT 'dim_tenant' as t, count() as c FROM dim_tenant
UNION ALL SELECT 'dim_site', count() FROM dim_site
UNION ALL SELECT 'dim_location', count() FROM dim_location
UNION ALL SELECT 'dim_person', count() FROM dim_person
UNION ALL SELECT 'fact_access_events', count() FROM fact_access_events
UNION ALL SELECT 'fact_access_requests', count() FROM fact_access_requests
FORMAT PrettyCompact
"

echo ""
echo "✅ Data loaded successfully"
