#!/usr/bin/env python3
"""
PIAM Dashboard - Historical Data Generator

Generates synthetic dimension and fact data for the PIAM dashboard.
Outputs CSV files for ClickHouse bulk loading.
"""

import argparse
import csv
import os
import random
import sys
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

import numpy as np
import yaml
from dateutil import tz
from faker import Faker

# Initialize Faker
fake = Faker()


def load_config(config_path: str) -> dict[str, Any]:
    """Load configuration from YAML file."""
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def ensure_output_dir(output_dir: str) -> None:
    """Create output directory if it doesn't exist."""
    os.makedirs(output_dir, exist_ok=True)


def write_csv(filepath: str, rows: list[dict], fieldnames: list[str]) -> int:
    """Write rows to CSV file and return count."""
    with open(filepath, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


# =============================================================================
# Dimension Generators
# =============================================================================


def generate_tenants(config: dict) -> list[dict]:
    """Generate tenant dimension records."""
    tenants = []
    for tenant in config["tenants"]:
        tenants.append(
            {
                "tenant_id": tenant["id"],
                "tenant_name": tenant["name"],
                "industry": tenant["industry"],
                "created_at": fake.date_time_between(
                    start_date="-2y", end_date="-1y"
                ).isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
        )
    return tenants


def generate_sites(config: dict) -> list[dict]:
    """Generate site dimension records."""
    sites = []
    for tenant in config["tenants"]:
        for site in tenant["sites"]:
            sites.append(
                {
                    "site_id": site["id"],
                    "tenant_id": tenant["id"],
                    "site_name": site["name"],
                    "city": site["city"],
                    "state": site["state"],
                    "country": site["country"],
                    "timezone": site["timezone"],
                    "created_at": fake.date_time_between(
                        start_date="-2y", end_date="-1y"
                    ).isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
    return sites


def generate_locations(config: dict) -> list[dict]:
    """Generate location (door) dimension records."""
    locations = []
    for tenant in config["tenants"]:
        for site in tenant["sites"]:
            for building in site["buildings"]:
                for floor in building["floors"]:
                    for door in floor["doors"]:
                        locations.append(
                            {
                                "location_id": door["id"],
                                "tenant_id": tenant["id"],
                                "site_id": site["id"],
                                "building_name": building["name"],
                                "floor_number": floor["floor_number"],
                                "door_name": door["name"],
                                "door_type": door["door_type"],
                                "security_level": door["security_level"],
                                "created_at": fake.date_time_between(
                                    start_date="-2y", end_date="-1y"
                                ).isoformat(),
                                "updated_at": datetime.utcnow().isoformat(),
                            }
                        )
    return locations


def generate_connectors(config: dict) -> list[dict]:
    """Generate connector dimension records."""
    connectors = []
    for tenant in config["tenants"]:
        for site in tenant["sites"]:
            for building in site["buildings"]:
                for connector in building.get("connectors", []):
                    connectors.append(
                        {
                            "connector_id": connector["id"],
                            "tenant_id": tenant["id"],
                            "site_id": site["id"],
                            "connector_name": connector["name"],
                            "connector_type": connector["type"],
                            "profile": connector["profile"],
                            "created_at": fake.date_time_between(
                                start_date="-2y", end_date="-1y"
                            ).isoformat(),
                            "updated_at": datetime.utcnow().isoformat(),
                        }
                    )
    return connectors


def generate_persons(config: dict) -> list[dict]:
    """Generate person dimension records."""
    persons = []

    for tenant in config["tenants"]:
        departments = tenant["departments"]
        total_employees = tenant["employee_count"]
        total_contractors = tenant["contractor_count"]

        # Generate employees
        for i in range(total_employees):
            # Assign to department based on headcount percentage
            dept = random.choices(
                departments, weights=[d["headcount_pct"] for d in departments]
            )[0]

            first_name = fake.first_name()
            last_name = fake.last_name()

            persons.append(
                {
                    "person_id": f"{tenant['id']}-emp-{i:04d}",
                    "tenant_id": tenant["id"],
                    "badge_number": f"B{random.randint(100000, 999999)}",
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": f"{first_name.lower()}.{last_name.lower()}@{tenant['id']}.com",
                    "department": dept["name"],
                    "job_title": fake.job(),
                    "person_type": "employee",
                    "status": random.choices(
                        ["active", "inactive"], weights=[0.95, 0.05]
                    )[0],
                    "hire_date": fake.date_between(
                        start_date="-5y", end_date="-30d"
                    ).isoformat(),
                    "termination_date": "",
                    "created_at": fake.date_time_between(
                        start_date="-2y", end_date="-1y"
                    ).isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )

        # Generate contractors
        for i in range(total_contractors):
            first_name = fake.first_name()
            last_name = fake.last_name()

            # Contractors more likely to be inactive
            status = random.choices(["active", "inactive"], weights=[0.80, 0.20])[0]
            hire_date = fake.date_between(start_date="-2y", end_date="-7d")
            term_date = ""
            if status == "inactive":
                term_date = fake.date_between(
                    start_date=hire_date, end_date="today"
                ).isoformat()

            persons.append(
                {
                    "person_id": f"{tenant['id']}-con-{i:04d}",
                    "tenant_id": tenant["id"],
                    "badge_number": f"C{random.randint(100000, 999999)}",
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": f"{first_name.lower()}.{last_name.lower()}@contractor.com",
                    "department": "Contractor",
                    "job_title": "Contractor",
                    "person_type": "contractor",
                    "status": status,
                    "hire_date": hire_date.isoformat(),
                    "termination_date": term_date,
                    "created_at": fake.date_time_between(
                        start_date="-2y", end_date="-1y"
                    ).isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )

    return persons


def generate_entitlements(config: dict, persons: list[dict], locations: list[dict]) -> list[dict]:
    """Generate entitlement (access rights) records."""
    entitlements = []

    # Build location lookup by tenant
    locations_by_tenant: dict[str, list[dict]] = {}
    for loc in locations:
        tenant_id = loc["tenant_id"]
        if tenant_id not in locations_by_tenant:
            locations_by_tenant[tenant_id] = []
        locations_by_tenant[tenant_id].append(loc)

    for person in persons:
        if person["status"] != "active":
            continue

        tenant_id = person["tenant_id"]
        tenant_locations = locations_by_tenant.get(tenant_id, [])

        if not tenant_locations:
            continue

        # Determine access level based on person type and department
        if person["person_type"] == "contractor":
            # Contractors get limited access (low security only)
            accessible_locs = [
                loc for loc in tenant_locations if loc["security_level"] == "low"
            ]
        else:
            # Employees get access based on security level
            if "Executive" in person["job_title"] or "Director" in person["job_title"]:
                # Executives get all access
                accessible_locs = tenant_locations
            elif "Manager" in person["job_title"]:
                # Managers get medium and below
                accessible_locs = [
                    loc
                    for loc in tenant_locations
                    if loc["security_level"] in ["low", "medium", "high"]
                ]
            else:
                # Regular employees get low and medium
                accessible_locs = [
                    loc
                    for loc in tenant_locations
                    if loc["security_level"] in ["low", "medium"]
                ]

        # Create entitlements for accessible locations
        for loc in accessible_locs:
            entitlements.append(
                {
                    "entitlement_id": str(uuid4()),
                    "tenant_id": tenant_id,
                    "person_id": person["person_id"],
                    "location_id": loc["location_id"],
                    "access_level": "standard",
                    "start_date": person["hire_date"],
                    "end_date": "",
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )

    return entitlements


# =============================================================================
# Fact Generators
# =============================================================================


def generate_access_events(
    config: dict,
    persons: list[dict],
    locations: list[dict],
    entitlements: list[dict],
    days: int,
) -> list[dict]:
    """Generate access event fact records."""
    events = []
    deny_reasons = config["deny_reasons"]

    # Build lookups
    persons_by_tenant: dict[str, list[dict]] = {}
    for person in persons:
        if person["status"] == "active":
            tenant_id = person["tenant_id"]
            if tenant_id not in persons_by_tenant:
                persons_by_tenant[tenant_id] = []
            persons_by_tenant[tenant_id].append(person)

    locations_by_tenant: dict[str, list[dict]] = {}
    for loc in locations:
        tenant_id = loc["tenant_id"]
        if tenant_id not in locations_by_tenant:
            locations_by_tenant[tenant_id] = []
        locations_by_tenant[tenant_id].append(loc)

    # Build entitlement set for quick lookup
    entitlement_set = set()
    for ent in entitlements:
        entitlement_set.add((ent["person_id"], ent["location_id"]))

    # Generate events for each day
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    for tenant in config["tenants"]:
        tenant_id = tenant["id"]
        deny_rate = tenant["deny_rate"]
        tenant_persons = persons_by_tenant.get(tenant_id, [])
        tenant_locations = locations_by_tenant.get(tenant_id, [])

        if not tenant_persons or not tenant_locations:
            continue

        # Calculate events per day (roughly 5-10 events per active person per day)
        events_per_day = len(tenant_persons) * random.randint(5, 10)

        current_date = start_date
        while current_date < end_date:
            # Add some daily variation
            daily_events = int(events_per_day * random.uniform(0.7, 1.3))

            # Peak hours distribution (more events during business hours)
            for _ in range(daily_events):
                person = random.choice(tenant_persons)
                location = random.choice(tenant_locations)

                # Generate time with business hour bias
                if random.random() < 0.85:
                    # Business hours (7am - 7pm)
                    hour = random.randint(7, 19)
                else:
                    # Off hours
                    hour = random.choice(list(range(0, 7)) + list(range(20, 24)))

                minute = random.randint(0, 59)
                second = random.randint(0, 59)

                event_time = current_date.replace(
                    hour=hour, minute=minute, second=second, microsecond=0
                )

                # Determine if grant or deny
                has_entitlement = (person["person_id"], location["location_id"]) in entitlement_set

                if has_entitlement and random.random() > deny_rate:
                    result = "grant"
                    deny_reason = ""
                else:
                    result = "deny"
                    # Pick deny reason based on weights
                    deny_reason = random.choices(
                        [r["code"] for r in deny_reasons],
                        weights=[r["weight"] for r in deny_reasons],
                    )[0]

                # Suspicious flag (rare)
                suspicious = random.random() < 0.005  # 0.5% of events

                events.append(
                    {
                        "event_id": str(uuid4()),
                        "tenant_id": tenant_id,
                        "person_id": person["person_id"],
                        "location_id": location["location_id"],
                        "event_time": event_time.isoformat(),
                        "event_type": "badge_read",
                        "result": result,
                        "deny_reason": deny_reason,
                        "suspicious": suspicious,
                        "badge_number": person["badge_number"],
                        "created_at": event_time.isoformat(),
                    }
                )

            current_date += timedelta(days=1)

    # Sort by event time
    events.sort(key=lambda x: x["event_time"])
    return events


def generate_connector_health(config: dict, days: int) -> list[dict]:
    """Generate connector health fact records."""
    health_records = []

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Health check interval (every 5 minutes)
    interval = timedelta(minutes=5)

    for tenant in config["tenants"]:
        tenant_id = tenant["id"]
        for site in tenant["sites"]:
            for building in site["buildings"]:
                for connector in building.get("connectors", []):
                    profile = connector["profile"]

                    current_time = start_date
                    while current_time < end_date:
                        # Determine health based on profile
                        if profile == "stable":
                            # 99% healthy
                            if random.random() < 0.99:
                                status = "healthy"
                                latency = random.randint(10, 50)
                            else:
                                status = random.choice(["degraded", "offline"])
                                latency = random.randint(100, 500) if status == "degraded" else 0
                        elif profile == "degraded":
                            # 85% healthy, 10% degraded, 5% offline
                            roll = random.random()
                            if roll < 0.85:
                                status = "healthy"
                                latency = random.randint(20, 80)
                            elif roll < 0.95:
                                status = "degraded"
                                latency = random.randint(200, 800)
                            else:
                                status = "offline"
                                latency = 0
                        else:  # flaky
                            # 70% healthy, 15% degraded, 15% offline
                            roll = random.random()
                            if roll < 0.70:
                                status = "healthy"
                                latency = random.randint(30, 100)
                            elif roll < 0.85:
                                status = "degraded"
                                latency = random.randint(300, 1000)
                            else:
                                status = "offline"
                                latency = 0

                        health_records.append(
                            {
                                "record_id": str(uuid4()),
                                "tenant_id": tenant_id,
                                "connector_id": connector["id"],
                                "check_time": current_time.isoformat(),
                                "status": status,
                                "latency_ms": latency,
                                "error_message": "" if status == "healthy" else f"{status.upper()}: Connection issue",
                                "created_at": current_time.isoformat(),
                            }
                        )

                        current_time += interval

    # Sort by check time
    health_records.sort(key=lambda x: x["check_time"])
    return health_records


def generate_compliance_status(config: dict, days: int) -> list[dict]:
    """Generate compliance status fact records."""
    compliance_records = []

    requirements = config["compliance_requirements"]
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Weekly compliance checks
    interval = timedelta(days=7)

    for tenant in config["tenants"]:
        tenant_id = tenant["id"]

        current_date = start_date
        while current_date < end_date:
            for req in requirements:
                # Compliance status (mostly compliant)
                roll = random.random()
                if roll < 0.85:
                    status = "compliant"
                    findings = 0
                elif roll < 0.95:
                    status = "non_compliant"
                    findings = random.randint(1, 5)
                else:
                    status = "pending_review"
                    findings = random.randint(0, 2)

                compliance_records.append(
                    {
                        "record_id": str(uuid4()),
                        "tenant_id": tenant_id,
                        "requirement_id": req["id"],
                        "requirement_name": req["name"],
                        "category": req["category"],
                        "check_date": current_date.date().isoformat(),
                        "status": status,
                        "findings_count": findings,
                        "notes": "" if status == "compliant" else f"Review needed for {req['name']}",
                        "created_at": current_date.isoformat(),
                    }
                )

            current_date += interval

    # Sort by check date
    compliance_records.sort(key=lambda x: x["check_date"])
    return compliance_records


# =============================================================================
# Main
# =============================================================================


def main():
    parser = argparse.ArgumentParser(
        description="Generate synthetic PIAM dashboard data"
    )
    parser.add_argument(
        "--days",
        type=int,
        default=None,
        help="Number of days of historical data (overrides config)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducibility (overrides config)",
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config.yaml",
        help="Path to configuration file",
    )
    args = parser.parse_args()

    # Load config
    print(f"Loading configuration from {args.config}...")
    config = load_config(args.config)

    # Apply overrides
    days = args.days or config["general"]["history_days"]
    seed = args.seed or config["general"]["random_seed"]
    output_dir = config["general"]["output_dir"]

    # Set random seeds
    random.seed(seed)
    np.random.seed(seed)
    Faker.seed(seed)

    print(f"Generating {days} days of data with seed {seed}")
    print(f"Output directory: {output_dir}")

    # Ensure output directory exists
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, output_dir)
    ensure_output_dir(output_path)

    # Generate dimensions
    print("\n--- Generating Dimensions ---")

    tenants = generate_tenants(config)
    count = write_csv(
        os.path.join(output_path, "dim_tenants.csv"),
        tenants,
        ["tenant_id", "tenant_name", "industry", "created_at", "updated_at"],
    )
    print(f"  Tenants: {count}")

    sites = generate_sites(config)
    count = write_csv(
        os.path.join(output_path, "dim_sites.csv"),
        sites,
        [
            "site_id",
            "tenant_id",
            "site_name",
            "city",
            "state",
            "country",
            "timezone",
            "created_at",
            "updated_at",
        ],
    )
    print(f"  Sites: {count}")

    locations = generate_locations(config)
    count = write_csv(
        os.path.join(output_path, "dim_locations.csv"),
        locations,
        [
            "location_id",
            "tenant_id",
            "site_id",
            "building_name",
            "floor_number",
            "door_name",
            "door_type",
            "security_level",
            "created_at",
            "updated_at",
        ],
    )
    print(f"  Locations: {count}")

    connectors = generate_connectors(config)
    count = write_csv(
        os.path.join(output_path, "dim_connectors.csv"),
        connectors,
        [
            "connector_id",
            "tenant_id",
            "site_id",
            "connector_name",
            "connector_type",
            "profile",
            "created_at",
            "updated_at",
        ],
    )
    print(f"  Connectors: {count}")

    persons = generate_persons(config)
    count = write_csv(
        os.path.join(output_path, "dim_persons.csv"),
        persons,
        [
            "person_id",
            "tenant_id",
            "badge_number",
            "first_name",
            "last_name",
            "email",
            "department",
            "job_title",
            "person_type",
            "status",
            "hire_date",
            "termination_date",
            "created_at",
            "updated_at",
        ],
    )
    print(f"  Persons: {count}")

    entitlements = generate_entitlements(config, persons, locations)
    count = write_csv(
        os.path.join(output_path, "dim_entitlements.csv"),
        entitlements,
        [
            "entitlement_id",
            "tenant_id",
            "person_id",
            "location_id",
            "access_level",
            "start_date",
            "end_date",
            "created_at",
            "updated_at",
        ],
    )
    print(f"  Entitlements: {count}")

    # Generate facts
    print("\n--- Generating Facts ---")

    access_events = generate_access_events(config, persons, locations, entitlements, days)
    count = write_csv(
        os.path.join(output_path, "fact_access_events.csv"),
        access_events,
        [
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
        ],
    )
    print(f"  Access Events: {count}")

    connector_health = generate_connector_health(config, days)
    count = write_csv(
        os.path.join(output_path, "fact_connector_health.csv"),
        connector_health,
        [
            "record_id",
            "tenant_id",
            "connector_id",
            "check_time",
            "status",
            "latency_ms",
            "error_message",
            "created_at",
        ],
    )
    print(f"  Connector Health: {count}")

    compliance_status = generate_compliance_status(config, days)
    count = write_csv(
        os.path.join(output_path, "fact_compliance_status.csv"),
        compliance_status,
        [
            "record_id",
            "tenant_id",
            "requirement_id",
            "requirement_name",
            "category",
            "check_date",
            "status",
            "findings_count",
            "notes",
            "created_at",
        ],
    )
    print(f"  Compliance Status: {count}")

    print("\n--- Summary ---")
    print(f"Generated data for {len(config['tenants'])} tenants")
    print(f"Date range: {days} days")
    print(f"Output directory: {output_path}")
    print("\nData generation complete!")


if __name__ == "__main__":
    main()
