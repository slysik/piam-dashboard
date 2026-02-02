#!/bin/bash
# =============================================================================
# Load Data - Import CSV Data into ClickHouse Tables
# =============================================================================
#
# Purpose:
#   Loads dimension and fact table data from CSV files into ClickHouse.
#   Truncates existing data before loading to ensure clean state.
#   Displays row counts after successful import.
#
# Prerequisites:
#   - Docker must be running
#   - ClickHouse container (piam-clickhouse) must be up and healthy
#   - CSV files must exist in clickhouse/data/ directory
#   - Tables must already be created in ClickHouse (piam database)
#
# Usage:
#   ./scripts/load-data.sh
#
# Examples:
#   ./scripts/load-data.sh
#
# Data Files Expected:
#   Dimensions:
#     - clickhouse/data/dim_tenant.csv
#     - clickhouse/data/dim_site.csv
#     - clickhouse/data/dim_location.csv
#     - clickhouse/data/dim_person.csv
#     - clickhouse/data/dim_entitlement.csv
#   Facts:
#     - clickhouse/data/fact_access_events.csv
#     - clickhouse/data/fact_connector_health.csv
#     - clickhouse/data/fact_compliance_status.csv
#     - clickhouse/data/fact_access_requests.csv
#
# Exit Codes:
#   0 - Data loaded successfully
#   1 - Error during data load (set -e causes immediate exit)
#
# Notes:
#   - Missing CSV files are skipped with a warning message
#   - Existing table data is truncated before loading
#   - CSV files must include headers (CSVWithNames format)
# =============================================================================
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
