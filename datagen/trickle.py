#!/usr/bin/env python3
"""
PIAM Dashboard - Trickle Data Generator

Continuously generates and inserts realistic access events into ClickHouse
to simulate live data streaming.
"""
from __future__ import annotations

import argparse
import random
import signal
import sys
import time
from datetime import datetime
from typing import Any
from uuid import uuid4

import clickhouse_connect
import yaml


# Global flag for graceful shutdown
running = True


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global running
    print("\nShutdown signal received. Finishing current batch...")
    running = False


def load_config(config_path: str) -> dict[str, Any]:
    """Load configuration from YAML file."""
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def get_clickhouse_client(host: str, port: int) -> clickhouse_connect.driver.Client:
    """Create ClickHouse client connection."""
    return clickhouse_connect.get_client(host=host, port=port)


def fetch_reference_data(client: clickhouse_connect.driver.Client) -> dict[str, Any]:
    """Fetch reference data from ClickHouse for event generation."""
    ref_data = {"persons": [], "locations": [], "tenants": {}}

    # Fetch active persons
    persons_result = client.query(
        """
        SELECT person_id, tenant_id, badge_number, person_type, department
        FROM piam.dim_persons
        WHERE status = 'active'
        """
    )
    for row in persons_result.result_rows:
        ref_data["persons"].append(
            {
                "person_id": row[0],
                "tenant_id": row[1],
                "badge_number": row[2],
                "person_type": row[3],
                "department": row[4],
            }
        )

    # Fetch locations
    locations_result = client.query(
        """
        SELECT location_id, tenant_id, site_id, door_name, security_level
        FROM piam.dim_locations
        """
    )
    for row in locations_result.result_rows:
        ref_data["locations"].append(
            {
                "location_id": row[0],
                "tenant_id": row[1],
                "site_id": row[2],
                "door_name": row[3],
                "security_level": row[4],
            }
        )

    # Fetch entitlements for access checking
    entitlements_result = client.query(
        """
        SELECT person_id, location_id
        FROM piam.dim_entitlements
        WHERE end_date = '' OR end_date > now()
        """
    )
    ref_data["entitlements"] = set()
    for row in entitlements_result.result_rows:
        ref_data["entitlements"].add((row[0], row[1]))

    # Group by tenant for weighted selection
    for person in ref_data["persons"]:
        tenant_id = person["tenant_id"]
        if tenant_id not in ref_data["tenants"]:
            ref_data["tenants"][tenant_id] = {"persons": [], "locations": []}
        ref_data["tenants"][tenant_id]["persons"].append(person)

    for location in ref_data["locations"]:
        tenant_id = location["tenant_id"]
        if tenant_id in ref_data["tenants"]:
            ref_data["tenants"][tenant_id]["locations"].append(location)

    return ref_data


def generate_event(
    ref_data: dict[str, Any], config: dict[str, Any]
) -> dict[str, Any] | None:
    """Generate a single realistic access event."""
    if not ref_data["tenants"]:
        return None

    # Pick a random tenant (weighted by person count)
    tenant_weights = [
        len(data["persons"]) for data in ref_data["tenants"].values()
    ]
    tenant_id = random.choices(
        list(ref_data["tenants"].keys()), weights=tenant_weights
    )[0]

    tenant_data = ref_data["tenants"][tenant_id]

    if not tenant_data["persons"] or not tenant_data["locations"]:
        return None

    # Pick random person and location
    person = random.choice(tenant_data["persons"])
    location = random.choice(tenant_data["locations"])

    # Get tenant config for deny rate
    deny_rate = 0.03  # Default 3%
    for tenant_config in config.get("tenants", []):
        if tenant_config["id"] == tenant_id:
            deny_rate = tenant_config.get("deny_rate", 0.03)
            break

    # Determine result based on entitlements and deny rate
    has_entitlement = (person["person_id"], location["location_id"]) in ref_data[
        "entitlements"
    ]

    deny_reasons = config.get("deny_reasons", [])
    deny_reason_codes = [r["code"] for r in deny_reasons]
    deny_reason_weights = [r["weight"] for r in deny_reasons]

    if has_entitlement and random.random() > deny_rate:
        result = "grant"
        deny_reason = ""
    else:
        result = "deny"
        if deny_reason_codes:
            deny_reason = random.choices(deny_reason_codes, weights=deny_reason_weights)[0]
        else:
            deny_reason = "NO_ACCESS"

    # Rare suspicious events
    suspicious = random.random() < 0.003  # 0.3% chance

    event_time = datetime.utcnow()

    return {
        "event_id": str(uuid4()),
        "tenant_id": tenant_id,
        "person_id": person["person_id"],
        "location_id": location["location_id"],
        "event_time": event_time,
        "event_type": "badge_read",
        "result": result,
        "deny_reason": deny_reason,
        "suspicious": suspicious,
        "badge_number": person["badge_number"],
        "created_at": event_time,
    }


def insert_events(
    client: clickhouse_connect.driver.Client, events: list[dict[str, Any]]
) -> None:
    """Insert events into ClickHouse."""
    if not events:
        return

    column_names = [
        "event_id",
        "tenant_id",
        "person_id",
        "location_id",
        "event_time",
        "event_type",
        "result",
        "deny_reason",
        "suspicious",
        "badge_number",
        "created_at",
    ]

    rows = []
    for event in events:
        rows.append(
            [
                event["event_id"],
                event["tenant_id"],
                event["person_id"],
                event["location_id"],
                event["event_time"],
                event["event_type"],
                event["result"],
                event["deny_reason"],
                event["suspicious"],
                event["badge_number"],
                event["created_at"],
            ]
        )

    client.insert("piam.fact_access_events", rows, column_names=column_names)


def main():
    parser = argparse.ArgumentParser(
        description="Trickle synthetic access events into ClickHouse"
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
        "--interval",
        type=int,
        default=5,
        help="Seconds between batches (default: 5)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=10,
        help="Events per batch (default: 10)",
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config.yaml",
        help="Path to configuration file",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducibility",
    )
    args = parser.parse_args()

    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

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
        # Test connection
        client.query("SELECT 1")
        print("Connected successfully!")
    except Exception as e:
        print(f"Failed to connect to ClickHouse: {e}")
        sys.exit(1)

    # Fetch reference data
    print("Fetching reference data...")
    try:
        ref_data = fetch_reference_data(client)
        print(f"  Loaded {len(ref_data['persons'])} persons")
        print(f"  Loaded {len(ref_data['locations'])} locations")
        print(f"  Loaded {len(ref_data['entitlements'])} entitlements")
        print(f"  Found {len(ref_data['tenants'])} tenants")
    except Exception as e:
        print(f"Failed to fetch reference data: {e}")
        print("Make sure the schema exists and data is loaded.")
        sys.exit(1)

    if not ref_data["persons"]:
        print("No active persons found. Run generate.py first to create base data.")
        sys.exit(1)

    # Start trickle loop
    print(f"\nStarting trickle mode:")
    print(f"  Batch size: {args.batch_size} events")
    print(f"  Interval: {args.interval} seconds")
    print("Press Ctrl+C to stop.\n")

    total_events = 0
    total_grants = 0
    total_denies = 0

    while running:
        try:
            # Generate batch of events
            events = []
            for _ in range(args.batch_size):
                event = generate_event(ref_data, config)
                if event:
                    events.append(event)
                    if event["result"] == "grant":
                        total_grants += 1
                    else:
                        total_denies += 1

            # Insert batch
            if events:
                insert_events(client, events)
                total_events += len(events)

                # Progress output
                timestamp = datetime.utcnow().strftime("%H:%M:%S")
                grants_in_batch = sum(1 for e in events if e["result"] == "grant")
                denies_in_batch = len(events) - grants_in_batch

                print(
                    f"[{timestamp}] Inserted {len(events)} events "
                    f"(grants: {grants_in_batch}, denies: {denies_in_batch}) | "
                    f"Total: {total_events} (G:{total_grants}/D:{total_denies})"
                )

            # Wait for next interval
            time.sleep(args.interval)

        except Exception as e:
            print(f"Error during event generation/insertion: {e}")
            time.sleep(args.interval)

    print(f"\n--- Final Summary ---")
    print(f"Total events inserted: {total_events}")
    print(f"Total grants: {total_grants}")
    print(f"Total denies: {total_denies}")
    print("Trickle generator stopped.")


if __name__ == "__main__":
    main()
