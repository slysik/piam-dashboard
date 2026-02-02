#!/usr/bin/env python3
"""
PIAM Dashboard - Replay Script

Injects specific anomaly scenarios into ClickHouse for testing
and demonstration purposes. This script is designed to create
realistic anomaly patterns that can be detected by monitoring
and alerting systems.

Supported Scenarios:
    - Deny Spike: Many denies at one door in a short time window,
      simulating a broken reader or credential issue.
    - Suspicious Cluster: Rapid denies by the same badge at multiple
      locations, simulating a stolen/cloned badge attempt.
    - Connector Degradation: Health records showing a connector going
      from healthy to degraded to offline and back.

Usage:
    python replay.py --scenario all                    # Run all scenarios
    python replay.py --scenario deny-spike --deny-count 30
    python replay.py --scenario suspicious --suspicious-count 10
    python replay.py --scenario degradation
    python replay.py --host localhost --port 8123 --seed 42

Dependencies:
    - clickhouse-connect: ClickHouse Python driver
    - PyYAML: Configuration file parsing
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
    """
    Load configuration from YAML file.

    Args:
        config_path: Path to the YAML configuration file.

    Returns:
        Dictionary containing the parsed configuration with tenant settings
        and deny reasons for scenario generation.

    Raises:
        FileNotFoundError: If the configuration file does not exist.
        yaml.YAMLError: If the YAML file is malformed.
    """
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def get_clickhouse_client(host: str, port: int) -> clickhouse_connect.driver.Client:
    """
    Create ClickHouse client connection.

    Args:
        host: ClickHouse server hostname or IP address.
        port: ClickHouse HTTP interface port (typically 8123).

    Returns:
        Connected ClickHouse client instance.

    Raises:
        clickhouse_connect.driver.exceptions.DatabaseError: If connection fails.
    """
    return clickhouse_connect.get_client(host=host, port=port)


def fetch_reference_data(client: clickhouse_connect.driver.Client) -> dict[str, Any]:
    """
    Fetch reference data for scenario generation.

    Queries dimension tables to retrieve sample locations, persons, and
    connectors that can be used as targets for anomaly injection.

    Args:
        client: Connected ClickHouse client instance.

    Returns:
        Dictionary containing:
            - locations: List of up to 10 location records
            - persons: List of up to 50 active person records
            - connectors: List of up to 10 connector records

    Raises:
        clickhouse_connect.driver.exceptions.DatabaseError: If queries fail.
    """
    ref_data: dict[str, Any] = {}

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
    Inject a deny spike scenario.

    Creates many deny events at a single door within a 10-minute window,
    simulating a broken reader, credential system issue, or misconfigured
    access policy. All events use the same deny reason code.

    Args:
        client: Connected ClickHouse client instance.
        ref_data: Reference data dictionary from fetch_reference_data().
        config: Configuration dictionary with deny reason codes.
        count: Number of deny events to inject (default 20).

    Returns:
        Number of events successfully injected.

    Raises:
        clickhouse_connect.driver.exceptions.DatabaseError: If insert fails.
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
    Inject a suspicious activity cluster.

    Creates rapid deny events by the same badge at multiple locations
    within a 2-minute window. Events are spaced 10-30 seconds apart,
    making it physically impossible for one person to reach all locations.
    All events are marked with suspicious=True.

    This scenario simulates:
        - Stolen or cloned badge being used
        - Credential sharing attempt
        - Coordinated unauthorized access attempt

    Args:
        client: Connected ClickHouse client instance.
        ref_data: Reference data dictionary from fetch_reference_data().
        config: Configuration dictionary (used for consistency with other inject functions).
        count: Number of suspicious events to inject (default 5).

    Returns:
        Number of events successfully injected.

    Raises:
        clickhouse_connect.driver.exceptions.DatabaseError: If insert fails.
    """
    if not ref_data["locations"] or not ref_data["persons"]:
        print("  No reference data available for suspicious cluster")
        return 0

    # Pick a single person (the "suspicious" actor)
    suspect = random.choice(ref_data["persons"])
    tenant_id = suspect["tenant_id"]

    # Filter locations to same tenant
    tenant_locations = [loc for loc in ref_data["locations"] if loc["tenant_id"] == tenant_id]
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
    Inject connector degradation records.

    Creates a sequence of health records showing a connector going through
    a degradation cycle: healthy -> degraded -> offline -> recovery -> healthy.
    Records are spaced 5 minutes apart.

    This scenario simulates:
        - Network connectivity issues
        - PACS system overload or failure
        - Scheduled or unscheduled maintenance events

    Args:
        client: Connected ClickHouse client instance.
        ref_data: Reference data dictionary from fetch_reference_data().
        duration_minutes: Total duration of the degradation sequence (default 30).

    Returns:
        Number of health records successfully injected.

    Raises:
        clickhouse_connect.driver.exceptions.DatabaseError: If insert fails.
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
    print("  Degradation sequence: healthy -> degraded -> offline -> recovery")
    print(f"  Duration: {duration_minutes} minutes")

    return len(records)


def main() -> None:
    """
    Main entry point for the replay script.

    Parses command-line arguments, establishes ClickHouse connection,
    fetches reference data, and executes the selected anomaly scenario(s).

    Supports running individual scenarios or all scenarios at once,
    with configurable event counts and optional random seed for
    reproducible results.
    """
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
