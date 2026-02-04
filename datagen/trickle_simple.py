#!/usr/bin/env python3
"""
PIAM Dashboard - Simple Trickle Data Generator

Generates and inserts realistic access events and access requests into ClickHouse.
Works with the current schema (dim_person, dim_location, fact_access_requests).

This is a simplified version of trickle.py that also generates access request
workflow data, simulating the full lifecycle of access requests from submission
through approval/rejection to provisioning.

Key Features:
    - Access event generation with configurable deny rates
    - Access request creation with realistic justifications
    - Request workflow progression (submitted -> approved -> provisioned)
    - SLA tracking for request processing times

Usage:
    python trickle_simple.py --host localhost --port 8123
    python trickle_simple.py --events-per-batch 10 --deny-rate 0.15
    python trickle_simple.py --no-requests  # Events only, no workflow requests

Dependencies:
    - clickhouse-connect: ClickHouse Python driver
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

# Access request constants
REQUEST_TYPES = ["new_access", "modification", "removal", "temporary"]
REQUEST_TYPE_WEIGHTS = [0.50, 0.25, 0.10, 0.15]
ACCESS_LEVELS = ["standard", "elevated", "temporary", "visitor"]
ACCESS_LEVEL_WEIGHTS = [0.60, 0.20, 0.15, 0.05]

JUSTIFICATIONS = [
    "New hire onboarding - requires access to team areas",
    "Project assignment requires additional access",
    "Role change - updated access requirements",
    "Contractor engagement for current project",
    "Temporary access for maintenance window",
    "Cross-team collaboration initiative",
    "Security clearance upgrade approved",
    "Emergency access for incident response",
    "Visitor escort access needed",
    "Training room access for workshop",
]

REJECTION_REASONS = [
    "Insufficient justification provided",
    "Manager approval not obtained",
    "Background check pending",
    "Security clearance required",
    "Access level exceeds role requirements",
]

APPROVAL_NOTES = [
    "Approved per standard policy",
    "Manager verified business need",
    "Approved with 90-day review",
    "Approved - temporary access only",
    "Verified with security team",
]


def signal_handler(signum: int, frame: Any) -> None:
    """
    Handle shutdown signals gracefully.

    Sets the global running flag to False, allowing the main loop to
    complete its current batch before exiting cleanly.

    Args:
        signum: The signal number received (e.g., SIGINT, SIGTERM).
        frame: The current stack frame (unused but required by signal API).
    """
    global running
    print("\nShutdown signal received. Finishing current batch...")
    running = False


def get_client(host: str, port: int) -> clickhouse_connect.driver.Client:
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
    Fetch reference data from ClickHouse for event generation.

    Queries dim_person and dim_location tables to retrieve data needed
    for generating realistic access events and requests.

    Args:
        client: Connected ClickHouse client instance.

    Returns:
        Dictionary containing:
            - persons: List of person records with badge IDs (limited to 1000)
            - locations: List of location/door records
            - tenants: Set of unique tenant IDs found in the data

    Raises:
        clickhouse_connect.driver.exceptions.DatabaseError: If queries fail.
    """
    ref_data: dict[str, Any] = {"persons": [], "locations": [], "tenants": set()}

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
    """
    Generate a single realistic access event.

    Creates an access event by randomly selecting a person and a location
    within the same tenant. The event result is determined by the deny_rate
    parameter, with suspicious events generated at a 5% rate.

    Args:
        ref_data: Reference data dictionary from fetch_reference_data().
        deny_rate: Probability of generating a deny event (0.0-1.0, default 0.25).

    Returns:
        Dictionary containing the access event fields, or None if no valid
        person/location combination is available. Event fields include:
            - event_id: Unique UUID for the event
            - tenant_id, person_id, location_id: Foreign keys
            - event_time: UTC timestamp of the event
            - result: "grant" or "deny"
            - deny_reason/deny_code: Populated for deny events
            - suspicious_flag/suspicious_reason/suspicious_score: Anomaly indicators
    """
    if not ref_data["persons"] or not ref_data["locations"]:
        return None

    # Pick random person and a matching location (same tenant)
    person = random.choice(ref_data["persons"])
    tenant_id = person["tenant_id"]

    # Filter locations for this tenant
    tenant_locations = [loc for loc in ref_data["locations"] if loc["tenant_id"] == tenant_id]
    if not tenant_locations:
        return None

    location = random.choice(tenant_locations)

    # Determine result
    if random.random() > deny_rate:
        result = "grant"
        deny_reason = ""
        deny_code = ""
    else:
        result = "deny"
        deny_reason = random.choice([
            "no_entitlement", "expired_credential",
            "wrong_zone", "invalid_time", "revoked_access"
        ])
        deny_code = f"ERR-{random.randint(100, 199)}"

    # Suspicious events (rare)
    suspicious_flag = 1 if random.random() < 0.05 else 0
    suspicious_reason = ""
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
    """
    Insert access events into ClickHouse.

    Batch inserts access events into the piam.fact_access_events table.

    Args:
        client: Connected ClickHouse client instance.
        events: List of event dictionaries to insert. Each event must
            contain all required columns for fact_access_events.

    Raises:
        clickhouse_connect.driver.exceptions.DatabaseError: If insert fails.
    """
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


# =============================================================================
# Access Request Functions
# =============================================================================


def generate_access_request(ref_data: dict[str, Any]) -> dict[str, Any] | None:
    """
    Generate a new access request.

    Creates an access request record simulating a user requesting access
    to a location. The request is initialized with "submitted" status
    and assigned a random SLA (24, 48, or 72 hours).

    Args:
        ref_data: Reference data dictionary from fetch_reference_data().

    Returns:
        Dictionary containing the access request fields, or None if no valid
        person/location combination is available. Request fields include:
            - request_id: Unique UUID for the request
            - person_id: The person requesting access
            - requester_id: Who submitted the request (70% self, 30% other)
            - location_id: Target location for access
            - request_type: Type from REQUEST_TYPES (new_access, modification, etc.)
            - status: Always "submitted" for new requests
            - sla_hours: Target completion time (24, 48, or 72 hours)
    """
    if not ref_data["persons"] or not ref_data["locations"]:
        return None

    # Pick random person and matching location
    person = random.choice(ref_data["persons"])
    tenant_id = person["tenant_id"]

    tenant_locations = [loc for loc in ref_data["locations"] if loc["tenant_id"] == tenant_id]
    if not tenant_locations:
        return None

    location = random.choice(tenant_locations)

    # Requester is sometimes the person, sometimes someone else
    if random.random() < 0.7:
        requester = person
    else:
        tenant_persons = [p for p in ref_data["persons"] if p["tenant_id"] == tenant_id]
        requester = random.choice(tenant_persons) if tenant_persons else person

    now = datetime.utcnow()

    return {
        "request_id": str(uuid4()),
        "tenant_id": tenant_id,
        "person_id": person["person_id"],
        "requester_id": requester["person_id"],
        "location_id": location["location_id"],
        "request_type": random.choices(REQUEST_TYPES, weights=REQUEST_TYPE_WEIGHTS)[0],
        "access_level": random.choices(ACCESS_LEVELS, weights=ACCESS_LEVEL_WEIGHTS)[0],
        "justification": random.choice(JUSTIFICATIONS),
        "status": "submitted",
        "submitted_at": now,
        "approved_at": None,
        "provisioned_at": None,
        "rejected_at": None,
        "sla_hours": random.choice([24, 48, 72]),
        "within_sla": 1,
        "approver_id": "",
        "approval_notes": "",
        "rejection_reason": "",
        "created_at": now,
        "updated_at": now,
    }


def insert_access_request(client: clickhouse_connect.driver.Client, request: dict[str, Any]) -> None:
    """
    Insert a new access request into ClickHouse.

    Args:
        client: Connected ClickHouse client instance.
        request: Access request dictionary from generate_access_request().

    Raises:
        clickhouse_connect.driver.exceptions.DatabaseError: If insert fails.
    """
    column_names = [
        "request_id", "tenant_id", "person_id", "requester_id", "location_id",
        "request_type", "access_level", "justification", "status",
        "submitted_at", "approved_at", "provisioned_at", "rejected_at",
        "sla_hours", "within_sla", "approver_id", "approval_notes", "rejection_reason",
        "created_at", "updated_at"
    ]

    row = [[request[col] for col in column_names]]
    client.insert("piam.fact_access_requests", row, column_names=column_names)


def fetch_pending_requests(client: clickhouse_connect.driver.Client, limit: int = 50) -> list[dict[str, Any]]:
    """
    Fetch pending access requests that can be updated.

    Queries for requests in transitional states (submitted, pending_approval,
    approved) that are eligible for workflow progression.

    Args:
        client: Connected ClickHouse client instance.
        limit: Maximum number of requests to fetch (default 50).

    Returns:
        List of request dictionaries containing request_id, tenant_id,
        person_id, status, submitted_at, and sla_hours.

    Raises:
        clickhouse_connect.driver.exceptions.DatabaseError: If query fails.
    """
    result = client.query(f"""
        SELECT request_id, tenant_id, person_id, status, submitted_at, sla_hours
        FROM piam.fact_access_requests FINAL
        WHERE status IN ('submitted', 'pending_approval', 'approved')
        ORDER BY submitted_at ASC
        LIMIT {limit}
    """)

    requests = []
    for row in result.result_rows:
        requests.append({
            "request_id": row[0],
            "tenant_id": row[1],
            "person_id": row[2],
            "status": row[3],
            "submitted_at": row[4],
            "sla_hours": row[5],
        })
    return requests


def update_access_request(
    client: clickhouse_connect.driver.Client,
    request: dict[str, Any],
    ref_data: dict[str, Any]
) -> str | None:
    """
    Progress a pending request through the workflow.

    Advances a request to its next state based on probabilistic transitions:
        - submitted -> pending_approval (80% chance)
        - pending_approval -> approved (70%) or rejected (15%)
        - approved -> provisioned (85%)

    Uses INSERT with SELECT to update the ReplacingMergeTree table,
    which handles deduplication by request_id.

    Args:
        client: Connected ClickHouse client instance.
        request: Request dictionary from fetch_pending_requests().
        ref_data: Reference data for selecting approvers.

    Returns:
        New status string if the request was updated, None if no change.

    Raises:
        clickhouse_connect.driver.exceptions.DatabaseError: If update fails.
    """
    current_status = request["status"]
    now = datetime.utcnow()

    # Calculate time since submission for SLA
    submitted_at = request["submitted_at"]
    if isinstance(submitted_at, str):
        submitted_at = datetime.fromisoformat(submitted_at.replace("Z", "").replace("+00:00", ""))
    elif hasattr(submitted_at, 'replace'):
        # Convert timezone-aware to naive UTC
        submitted_at = submitted_at.replace(tzinfo=None)

    hours_elapsed = (now - submitted_at).total_seconds() / 3600
    within_sla = 1 if hours_elapsed <= request["sla_hours"] else 0

    # Find an approver from same tenant
    tenant_persons = [p for p in ref_data["persons"] if p["tenant_id"] == request["tenant_id"]]
    approver_id = random.choice(tenant_persons)["person_id"] if tenant_persons else ""

    new_status = None
    approved_at = None
    provisioned_at = None
    rejected_at = None
    approval_notes = ""
    rejection_reason = ""

    if current_status == "submitted":
        # Move to pending_approval (80%) or stay submitted (20%)
        if random.random() < 0.8:
            new_status = "pending_approval"

    elif current_status == "pending_approval":
        # Approve (70%), reject (15%), or stay pending (15%)
        roll = random.random()
        if roll < 0.70:
            new_status = "approved"
            approved_at = now
            approval_notes = random.choice(APPROVAL_NOTES)
        elif roll < 0.85:
            new_status = "rejected"
            rejected_at = now
            rejection_reason = random.choice(REJECTION_REASONS)

    elif current_status == "approved":
        # Provision (85%) or stay approved (15%)
        if random.random() < 0.85:
            new_status = "provisioned"
            provisioned_at = now

    if new_status is None:
        return None

    # Insert updated record (ReplacingMergeTree will handle dedup)
    client.command(f"""
        INSERT INTO piam.fact_access_requests
        SELECT
            request_id,
            tenant_id,
            person_id,
            requester_id,
            location_id,
            request_type,
            access_level,
            justification,
            '{new_status}' as status,
            submitted_at,
            {f"toDateTime64('{approved_at.isoformat()}', 3)" if approved_at else "approved_at"} as approved_at,
            {f"toDateTime64('{provisioned_at.isoformat()}', 3)" if provisioned_at else "provisioned_at"} as provisioned_at,
            {f"toDateTime64('{rejected_at.isoformat()}', 3)" if rejected_at else "rejected_at"} as rejected_at,
            sla_hours,
            {within_sla} as within_sla,
            {f"'{approver_id}'" if approver_id else "approver_id"} as approver_id,
            {f"'{approval_notes}'" if approval_notes else "approval_notes"} as approval_notes,
            {f"'{rejection_reason}'" if rejection_reason else "rejection_reason"} as rejection_reason,
            created_at,
            now64(3) as updated_at
        FROM piam.fact_access_requests FINAL
        WHERE request_id = '{request["request_id"]}'
    """)

    return new_status


def main() -> None:
    """
    Main entry point for the simple trickle data generator.

    Parses command-line arguments, establishes ClickHouse connection,
    fetches reference data, and runs the continuous generation loop
    for both access events and access requests.

    The main loop:
        1. Generates a batch of access events
        2. Optionally creates new access requests (based on request_rate)
        3. Periodically progresses pending requests through workflow
        4. Reports statistics for each batch
    """
    parser = argparse.ArgumentParser(description="Trickle synthetic access events and requests into ClickHouse")
    parser.add_argument("--host", type=str, default="localhost", help="ClickHouse host")
    parser.add_argument("--port", type=int, default=8123, help="ClickHouse HTTP port")
    parser.add_argument("--interval", type=int, default=3, help="Seconds between batches (default: 3)")
    parser.add_argument("--events-per-batch", type=int, default=5, help="Access events per batch")
    parser.add_argument("--deny-rate", type=float, default=0.25, help="Deny rate (0.0-1.0)")
    parser.add_argument("--request-rate", type=float, default=0.3, help="Chance of new request per batch (0.0-1.0)")
    parser.add_argument("--no-requests", action="store_true", help="Disable access request trickling")
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

    print("\nStarting trickle mode:")
    print(f"  Access events: {args.events_per_batch}/batch")
    print(f"  Access requests: {'disabled' if args.no_requests else f'{args.request_rate:.0%} chance/batch'}")
    print(f"  Interval: {args.interval}s")
    print(f"  Deny rate: {args.deny_rate:.0%}")
    print("Press Ctrl+C to stop.\n")

    total_events = 0
    total_grants = 0
    total_denies = 0
    total_requests_new = 0
    total_requests_updated = 0
    batch_count = 0

    while running:
        try:
            batch_count += 1

            # --- Access Events ---
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

            # --- Access Requests (if enabled) ---
            request_info = ""
            if not args.no_requests:
                # Maybe create a new request
                if random.random() < args.request_rate:
                    new_request = generate_access_request(ref_data)
                    if new_request:
                        insert_access_request(client, new_request)
                        total_requests_new += 1
                        request_info += " +1 req"

                # Update some pending requests (every 3rd batch)
                if batch_count % 3 == 0:
                    pending = fetch_pending_requests(client, limit=10)
                    updates = 0
                    for req in pending[:3]:  # Update up to 3 per cycle
                        new_status = update_access_request(client, req, ref_data)
                        if new_status:
                            updates += 1
                            total_requests_updated += 1
                    if updates:
                        request_info += f" {updates} req→"

            # --- Output ---
            timestamp = datetime.utcnow().strftime("%H:%M:%S")
            grants = sum(1 for e in events if e["result"] == "grant")
            denies = len(events) - grants
            suspicious = sum(1 for e in events if e["suspicious_flag"])

            print(f"[{timestamp}] +{len(events)} events (G:{grants} D:{denies} S:{suspicious}){request_info} | Total: {total_events} events")

            time.sleep(args.interval)

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(args.interval)

    print("\n--- Summary ---")
    print(f"Access Events: {total_events} (Grants: {total_grants}, Denies: {total_denies})")
    print(f"Access Requests: {total_requests_new} new, {total_requests_updated} updated")


if __name__ == "__main__":
    main()
