#!/usr/bin/env python3
"""
PIAM Dashboard - Replay Script

Injects specific anomaly scenarios into ClickHouse for testing
and demonstration purposes:
- Deny spike at a specific door
- Suspicious rapid denies by same badge
- Connector degradation events
"""

import argparse
import random
import sys
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

import clickhouse_connect
import yaml


def load_config(config_path: str) -> dict[str, Any]:
    """Load configuration from YAML file."""
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def get_clickhouse_client(host: str, port: int) -> clickhouse_connect.driver.Client:
    """Create ClickHouse client connection."""
    return clickhouse_connect.get_client(host=host, port=port)


def fetch_reference_data(client: clickhouse_connect.driver.Client) -> dict[str, Any]:
    """Fetch reference data for scenario generation."""
    ref_data = {}

    # Get a sample door for deny spike
    locations_result = client.query(
        """
        SELECT location_id, tenant_id, door_name
        FROM piam.dim_locations
        LIMIT 10
        """
    )
    ref_data["locations"] = [
        {"location_id": row[0], "tenant_id": row[1], "door_name": row[2]}
        for row in locations_result.result_rows
    ]

    # Get some persons for suspicious activity
    persons_result = client.query(
        """
        SELECT person_id, tenant_id, badge_number
        FROM piam.dim_persons
        WHERE status = 'active'
        LIMIT 50
        """
    )
    ref_data["persons"] = [
        {"person_id": row[0], "tenant_id": row[1], "badge_number": row[2]}
        for row in persons_result.result_rows
    ]

    # Get connectors for degradation scenario
    connectors_result = client.query(
        """
        SELECT connector_id, tenant_id, connector_name
        FROM piam.dim_connectors
        LIMIT 10
        """
    )
    ref_data["connectors"] = [
        {"connector_id": row[0], "tenant_id": row[1], "connector_name": row[2]}
        for row in connectors_result.result_rows
    ]

    return ref_data


def inject_deny_spike(
    client: clickhouse_connect.driver.Client,
    ref_data: dict[str, Any],
    config: dict[str, Any],
    count: int = 20,
) -> int:
    """
    Inject a deny spike scenario: many denies at one door in a short time window.
    This simulates a broken reader or credential issue.
    """
    if not ref_data["locations"] or not ref_data["persons"]:
        print("  No reference data available for deny spike")
        return 0

    # Pick a random door for the spike
    target_door = random.choice(ref_data["locations"])
    tenant_id = target_door["tenant_id"]

    # Filter persons to same tenant
    tenant_persons = [p for p in ref_data["persons"] if p["tenant_id"] == tenant_id]
    if not tenant_persons:
        tenant_persons = ref_data["persons"]

    # Get deny reasons from config
    deny_reasons = config.get("deny_reasons", [])
    if deny_reasons:
        # Use a consistent deny reason for the spike (simulates reader issue)
        spike_reason = random.choice(["INVALID_TIME", "NO_ACCESS", "EXPIRED_BADGE"])
    else:
        spike_reason = "NO_ACCESS"

    # Generate events in a 10-minute window
    base_time = datetime.utcnow() - timedelta(minutes=5)
    events = []

    for i in range(count):
        person = random.choice(tenant_persons)
        event_time = base_time + timedelta(seconds=random.randint(0, 600))

        events.append(
            {
                "event_id": str(uuid4()),
                "tenant_id": tenant_id,
                "person_id": person["person_id"],
                "location_id": target_door["location_id"],
                "event_time": event_time,
                "event_type": "badge_read",
                "result": "deny",
                "deny_reason": spike_reason,
                "suspicious": False,
                "badge_number": person["badge_number"],
                "created_at": event_time,
            }
        )

    # Insert events
    column_names = [
        "event_id", "tenant_id", "person_id", "location_id", "event_time",
        "event_type", "result", "deny_reason", "suspicious", "badge_number", "created_at"
    ]
    rows = [[e[col] for col in column_names] for e in events]
    client.insert("piam.fact_access_events", rows, column_names=column_names)

    print(f"  Injected {count} deny events at door '{target_door['door_name']}'")
    print(f"  Deny reason: {spike_reason}")
    print(f"  Time window: {base_time.strftime('%H:%M:%S')} - {(base_time + timedelta(minutes=10)).strftime('%H:%M:%S')}")

    return count


def inject_suspicious_cluster(
    client: clickhouse_connect.driver.Client,
    ref_data: dict[str, Any],
    config: dict[str, Any],
    count: int = 5,
) -> int:
    """
    Inject a suspicious activity cluster: rapid denies by the same badge
    at multiple locations. This simulates a stolen/cloned badge.
    """
    if not ref_data["locations"] or not ref_data["persons"]:
        print("  No reference data available for suspicious cluster")
        return 0

    # Pick a single person (the "suspicious" actor)
    suspect = random.choice(ref_data["persons"])
    tenant_id = suspect["tenant_id"]

    # Filter locations to same tenant
    tenant_locations = [l for l in ref_data["locations"] if l["tenant_id"] == tenant_id]
    if len(tenant_locations) < 2:
        tenant_locations = ref_data["locations"]

    # Generate rapid events (within 2 minutes, impossible to physically do)
    base_time = datetime.utcnow() - timedelta(minutes=2)
    events = []

    for i in range(count):
        location = random.choice(tenant_locations)
        # Events very close together (10-30 seconds apart)
        event_time = base_time + timedelta(seconds=i * random.randint(10, 30))

        events.append(
            {
                "event_id": str(uuid4()),
                "tenant_id": tenant_id,
                "person_id": suspect["person_id"],
                "location_id": location["location_id"],
                "event_time": event_time,
                "event_type": "badge_read",
                "result": "deny",
                "deny_reason": "NO_ACCESS",
                "suspicious": True,  # Mark as suspicious
                "badge_number": suspect["badge_number"],
                "created_at": event_time,
            }
        )

    # Insert events
    column_names = [
        "event_id", "tenant_id", "person_id", "location_id", "event_time",
        "event_type", "result", "deny_reason", "suspicious", "badge_number", "created_at"
    ]
    rows = [[e[col] for col in column_names] for e in events]
    client.insert("piam.fact_access_events", rows, column_names=column_names)

    print(f"  Injected {count} suspicious events for badge '{suspect['badge_number']}'")
    print(f"  Locations accessed: {len(set(e['location_id'] for e in events))}")
    print(f"  Time span: ~{count * 20} seconds (physically impossible)")

    return count


def inject_connector_degradation(
    client: clickhouse_connect.driver.Client,
    ref_data: dict[str, Any],
    duration_minutes: int = 30,
) -> int:
    """
    Inject connector degradation records showing a connector going from
    healthy to degraded to offline and back.
    """
    if not ref_data["connectors"]:
        print("  No connectors available for degradation scenario")
        return 0

    # Pick a connector for degradation
    target_connector = random.choice(ref_data["connectors"])

    # Generate health records over the duration
    base_time = datetime.utcnow() - timedelta(minutes=duration_minutes)
    records = []
    interval = timedelta(minutes=5)

    # Phases: healthy -> degraded -> offline -> degraded -> healthy
    phases = [
        ("healthy", 10, ""),
        ("healthy", 15, ""),
        ("degraded", 250, "High latency detected"),
        ("degraded", 400, "Connection timeouts increasing"),
        ("offline", 0, "Connection lost"),
        ("offline", 0, "Connection lost - retrying"),
        ("degraded", 350, "Connection restored - degraded"),
        ("healthy", 20, ""),
    ]

    current_time = base_time
    for status, latency, error_msg in phases:
        records.append(
            {
                "record_id": str(uuid4()),
                "tenant_id": target_connector["tenant_id"],
                "connector_id": target_connector["connector_id"],
                "check_time": current_time,
                "status": status,
                "latency_ms": latency,
                "error_message": error_msg,
                "created_at": current_time,
            }
        )
        current_time += interval

    # Insert records
    column_names = [
        "record_id", "tenant_id", "connector_id", "check_time",
        "status", "latency_ms", "error_message", "created_at"
    ]
    rows = [[r[col] for col in column_names] for r in records]
    client.insert("piam.fact_connector_health", rows, column_names=column_names)

    print(f"  Injected {len(records)} health records for '{target_connector['connector_name']}'")
    print(f"  Degradation sequence: healthy -> degraded -> offline -> recovery")
    print(f"  Duration: {duration_minutes} minutes")

    return len(records)


def main():
    parser = argparse.ArgumentParser(
        description="Inject anomaly scenarios into ClickHouse for testing"
    )
    parser.add_argument(
        "--host",
        type=str,
        default="localhost",
        help="ClickHouse host (default: localhost)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8123,
        help="ClickHouse HTTP port (default: 8123)",
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config.yaml",
        help="Path to configuration file",
    )
    parser.add_argument(
        "--scenario",
        type=str,
        choices=["all", "deny-spike", "suspicious", "degradation"],
        default="all",
        help="Which scenario to inject (default: all)",
    )
    parser.add_argument(
        "--deny-count",
        type=int,
        default=20,
        help="Number of deny events for spike scenario (default: 20)",
    )
    parser.add_argument(
        "--suspicious-count",
        type=int,
        default=5,
        help="Number of suspicious events (default: 5)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducibility",
    )
    args = parser.parse_args()

    # Set random seed if provided
    if args.seed:
        random.seed(args.seed)

    # Load config
    print(f"Loading configuration from {args.config}...")
    config = load_config(args.config)

    # Connect to ClickHouse
    print(f"Connecting to ClickHouse at {args.host}:{args.port}...")
    try:
        client = get_clickhouse_client(args.host, args.port)
        client.query("SELECT 1")
        print("Connected successfully!\n")
    except Exception as e:
        print(f"Failed to connect to ClickHouse: {e}")
        sys.exit(1)

    # Fetch reference data
    print("Fetching reference data...")
    try:
        ref_data = fetch_reference_data(client)
        print(f"  Found {len(ref_data['locations'])} locations")
        print(f"  Found {len(ref_data['persons'])} persons")
        print(f"  Found {len(ref_data['connectors'])} connectors\n")
    except Exception as e:
        print(f"Failed to fetch reference data: {e}")
        print("Make sure the schema exists and data is loaded.")
        sys.exit(1)

    total_injected = 0

    # Run selected scenarios
    if args.scenario in ["all", "deny-spike"]:
        print("--- Scenario: Deny Spike ---")
        count = inject_deny_spike(client, ref_data, config, args.deny_count)
        total_injected += count
        print()

    if args.scenario in ["all", "suspicious"]:
        print("--- Scenario: Suspicious Cluster ---")
        count = inject_suspicious_cluster(client, ref_data, config, args.suspicious_count)
        total_injected += count
        print()

    if args.scenario in ["all", "degradation"]:
        print("--- Scenario: Connector Degradation ---")
        count = inject_connector_degradation(client, ref_data)
        total_injected += count
        print()

    print("=" * 50)
    print(f"Total records injected: {total_injected}")
    print("Replay scenarios complete!")


if __name__ == "__main__":
    main()
