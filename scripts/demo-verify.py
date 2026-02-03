#!/usr/bin/env python3
"""Verify CDC pipeline health and data flow."""
import subprocess
import json
import sys
from datetime import datetime

def run_ch_query(query):
    """Run ClickHouse query and return result."""
    result = subprocess.run(
        ['docker', 'exec', 'piam-clickhouse', 'clickhouse-client',
         '--database=piam', '--format=JSON', f'--query={query}'],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return None
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return None

def check_mysql():
    """Check MySQL is accepting connections."""
    result = subprocess.run(
        ['docker', 'exec', 'piam-mysql', 'mysqladmin', 'ping', '-u', 'root', '-prootpass'],
        capture_output=True
    )
    return result.returncode == 0

def check_redpanda():
    """Check Redpanda is running."""
    result = subprocess.run(
        ['docker', 'exec', 'piam-redpanda', 'rpk', 'cluster', 'health'],
        capture_output=True
    )
    return result.returncode == 0

def check_debezium():
    """Check Debezium connector status."""
    result = subprocess.run(
        ['docker', 'exec', 'piam-debezium-connect', 'curl', '-s',
         'http://localhost:8083/connectors/cloudgate-mysql-connector/status'],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return False, "Connector not reachable"
    try:
        status = json.loads(result.stdout)
        state = status.get('connector', {}).get('state', 'UNKNOWN')
        return state == 'RUNNING', state
    except json.JSONDecodeError:
        return False, "Invalid response"

def main():
    print("=" * 50)
    print("CDC Pipeline Verification")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    # Check services
    print("\n[Services]")
    mysql_ok = check_mysql()
    print(f"  MySQL:     {'✓ OK' if mysql_ok else '✗ FAIL'}")

    redpanda_ok = check_redpanda()
    print(f"  Redpanda:  {'✓ OK' if redpanda_ok else '✗ FAIL'}")

    dbz_ok, dbz_state = check_debezium()
    print(f"  Debezium:  {'✓ ' if dbz_ok else '✗ '}{dbz_state}")

    # Check data flow
    print("\n[Data Flow - Last 10 Minutes]")

    events = run_ch_query(
        "SELECT count() as cnt, max(event_time) as latest "
        "FROM fact_access_events WHERE event_time > now() - INTERVAL 10 MINUTE"
    )
    if events and events.get('data'):
        row = events['data'][0]
        cnt = row.get('cnt', 0)
        latest = row.get('latest', 'N/A')
        print(f"  Access Events: {cnt} (latest: {latest})")
    else:
        print("  Access Events: Unable to query")

    health = run_ch_query(
        "SELECT count() as cnt, max(check_time) as latest "
        "FROM fact_connector_health WHERE check_time > now() - INTERVAL 10 MINUTE"
    )
    if health and health.get('data'):
        row = health['data'][0]
        cnt = row.get('cnt', 0)
        latest = row.get('latest', 'N/A')
        print(f"  Health Checks: {cnt} (latest: {latest})")
    else:
        print("  Health Checks: Unable to query")

    # Summary
    print("\n[Summary]")
    events_flowing = events and events.get('data') and int(events['data'][0].get('cnt', 0)) > 0
    health_flowing = health and health.get('data') and int(health['data'][0].get('cnt', 0)) > 0

    if events_flowing and health_flowing and dbz_ok and mysql_ok:
        print("  Status: ✓ HEALTHY - Data flowing through CDC pipeline")
        return 0
    elif mysql_ok and redpanda_ok:
        print("  Status: ⚠ STARTING - Services up, waiting for data flow")
        print("  Tip: Wait 30 seconds and run 'make demo-verify' again")
        return 0
    else:
        print("  Status: ✗ DEGRADED - Check component logs with 'make demo-logs'")
        return 1

if __name__ == '__main__':
    sys.exit(main())
