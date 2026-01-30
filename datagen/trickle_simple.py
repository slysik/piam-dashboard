#!/usr/bin/env python3
"""
PIAM Dashboard - Simple Trickle Data Generator

Generates and inserts realistic access events into ClickHouse.
Works with the current schema (dim_person, dim_location).
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

# Global flag for graceful shutdown
running = True


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global running
    print("\nShutdown signal received. Finishing current batch...")
    running = False


def get_client(host: str, port: int) -> clickhouse_connect.driver.Client:
    """Create ClickHouse client connection."""
    return clickhouse_connect.get_client(host=host, port=port)


def fetch_reference_data(client: clickhouse_connect.driver.Client) -> dict[str, Any]:
    """Fetch reference data from ClickHouse for event generation."""
    ref_data = {"persons": [], "locations": [], "tenants": set()}

    # Fetch persons with their badges
    persons_result = client.query("""
        SELECT person_id, tenant_id, badge_id, department, person_type
        FROM piam.dim_person
        LIMIT 1000
    """)
    for row in persons_result.result_rows:
        ref_data["persons"].append({
            "person_id": row[0],
            "tenant_id": row[1],
            "badge_id": row[2],
            "department": row[3],
            "person_type": row[4],
        })
        ref_data["tenants"].add(row[1])

    # Fetch locations
    locations_result = client.query("""
        SELECT location_id, tenant_id, site_id, door_type, is_high_risk
        FROM piam.dim_location
    """)
    for row in locations_result.result_rows:
        ref_data["locations"].append({
            "location_id": row[0],
            "tenant_id": row[1],
            "site_id": row[2],
            "door_type": row[3],
            "is_high_risk": row[4],
        })

    return ref_data


def generate_event(ref_data: dict[str, Any], deny_rate: float = 0.25) -> dict[str, Any] | None:
    """Generate a single realistic access event."""
    if not ref_data["persons"] or not ref_data["locations"]:
        return None

    # Pick random person and a matching location (same tenant)
    person = random.choice(ref_data["persons"])
    tenant_id = person["tenant_id"]

    # Filter locations for this tenant
    tenant_locations = [l for l in ref_data["locations"] if l["tenant_id"] == tenant_id]
    if not tenant_locations:
        return None

    location = random.choice(tenant_locations)

    # Determine result
    if random.random() > deny_rate:
        result = "grant"
        deny_reason = None
        deny_code = None
    else:
        result = "deny"
        deny_reason = random.choice([
            "no_entitlement", "expired_credential",
            "wrong_zone", "invalid_time", "revoked_access"
        ])
        deny_code = f"ERR-{random.randint(100, 199)}"

    # Suspicious events (rare)
    suspicious_flag = 1 if random.random() < 0.05 else 0
    suspicious_reason = None
    suspicious_score = 0.0
    if suspicious_flag:
        suspicious_reason = random.choice([
            "unusual_time", "rapid_badge", "failed_sequence", "tailgate_detected"
        ])
        suspicious_score = round(0.5 + random.random() * 0.5, 2)

    event_time = datetime.utcnow()

    return {
        "event_id": str(uuid4()),
        "tenant_id": tenant_id,
        "event_time": event_time,
        "person_id": person["person_id"],
        "badge_id": person["badge_id"],
        "site_id": location["site_id"],
        "location_id": location["location_id"],
        "direction": random.choice(["entry", "exit"]),
        "result": result,
        "event_type": "access_attempt",
        "deny_reason": deny_reason,
        "deny_code": deny_code,
        "pacs_source": random.choice(["genetec", "lenel", "ccure"]),
        "pacs_event_id": str(uuid4()),
        "raw_payload": "{}",
        "suspicious_flag": suspicious_flag,
        "suspicious_reason": suspicious_reason,
        "suspicious_score": suspicious_score,
    }


def insert_events(client: clickhouse_connect.driver.Client, events: list[dict[str, Any]]) -> None:
    """Insert events into ClickHouse."""
    if not events:
        return

    column_names = [
        "event_id", "tenant_id", "event_time", "person_id", "badge_id",
        "site_id", "location_id", "direction", "result", "event_type",
        "deny_reason", "deny_code", "pacs_source", "pacs_event_id",
        "raw_payload", "suspicious_flag", "suspicious_reason", "suspicious_score"
    ]

    rows = [[event[col] for col in column_names] for event in events]
    client.insert("piam.fact_access_events", rows, column_names=column_names)


def main():
    parser = argparse.ArgumentParser(description="Trickle synthetic access events into ClickHouse")
    parser.add_argument("--host", type=str, default="localhost", help="ClickHouse host")
    parser.add_argument("--port", type=int, default=8123, help="ClickHouse HTTP port")
    parser.add_argument("--interval", type=int, default=5, help="Seconds between batches")
    parser.add_argument("--events-per-batch", type=int, default=10, help="Events per batch")
    parser.add_argument("--deny-rate", type=float, default=0.25, help="Deny rate (0.0-1.0)")
    args = parser.parse_args()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print(f"Connecting to ClickHouse at {args.host}:{args.port}...")
    try:
        client = get_client(args.host, args.port)
        client.query("SELECT 1")
        print("Connected!")
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)

    print("Fetching reference data...")
    try:
        ref_data = fetch_reference_data(client)
        print(f"  Loaded {len(ref_data['persons'])} persons")
        print(f"  Loaded {len(ref_data['locations'])} locations")
        print(f"  Found {len(ref_data['tenants'])} tenants: {ref_data['tenants']}")
    except Exception as e:
        print(f"Failed to fetch reference data: {e}")
        sys.exit(1)

    if not ref_data["persons"]:
        print("No persons found. Run 'make generate' first.")
        sys.exit(1)

    print(f"\nStarting trickle mode:")
    print(f"  Batch size: {args.events_per_batch} events")
    print(f"  Interval: {args.interval}s")
    print(f"  Deny rate: {args.deny_rate:.0%}")
    print("Press Ctrl+C to stop.\n")

    total_events = 0
    total_grants = 0
    total_denies = 0

    while running:
        try:
            events = []
            for _ in range(args.events_per_batch):
                event = generate_event(ref_data, args.deny_rate)
                if event:
                    events.append(event)
                    if event["result"] == "grant":
                        total_grants += 1
                    else:
                        total_denies += 1

            if events:
                insert_events(client, events)
                total_events += len(events)

                timestamp = datetime.utcnow().strftime("%H:%M:%S")
                grants = sum(1 for e in events if e["result"] == "grant")
                denies = len(events) - grants
                suspicious = sum(1 for e in events if e["suspicious_flag"])

                print(f"[{timestamp}] +{len(events)} events (G:{grants} D:{denies} S:{suspicious}) | Total: {total_events}")

            time.sleep(args.interval)

        except Exception as e:
            print(f"Error: {e}")
            time.sleep(args.interval)

    print(f"\n--- Summary ---")
    print(f"Total: {total_events} | Grants: {total_grants} | Denies: {total_denies}")


if __name__ == "__main__":
    main()
