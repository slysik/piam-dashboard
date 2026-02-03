#!/usr/bin/env python3
"""PACS Event Generator for CDC Pipeline Demo.

Simulates Physical Access Control System (PACS) events from multiple connectors,
writing to either MySQL (for CDC) or directly to ClickHouse based on config.
"""

import signal
import sys
import time
import uuid
import json
import random
import logging
from datetime import datetime
from typing import Optional

import mysql.connector
import clickhouse_connect

from config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Graceful shutdown flag
shutdown_requested = False


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_requested = True


# Register signal handlers
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)


# =============================================================================
# Connector Definitions (matching existing dashboard data)
# =============================================================================

CONNECTORS = [
    {
        'connector_id': 'lenel-primary',
        'connector_name': 'Lenel Primary',
        'pacs_type': 'LENEL',
        'pacs_version': '7.8',
        'endpoint_url': 'https://lenel-primary.local:443/api',
    },
    {
        'connector_id': 'ccure-satellite',
        'connector_name': 'C-CURE Satellite',
        'pacs_type': 'CCURE',
        'pacs_version': '2.90',
        'endpoint_url': 'https://ccure-satellite.local:443/api',
    },
    {
        'connector_id': 's2-building-b',
        'connector_name': 'S2 Building B',
        'pacs_type': 'S2',
        'pacs_version': '4.1',
        'endpoint_url': 'https://s2-building-b.local:443/api',
    },
    {
        'connector_id': 'genetec-campus',
        'connector_name': 'Genetec Campus',
        'pacs_type': 'GENETEC',
        'pacs_version': '11.3',
        'endpoint_url': 'https://genetec-campus.local:443/api',
    },
]

# Event generation constants
SITES = ['site-hq', 'site-east', 'site-west']
LOCATIONS = ['lobby-main', 'lobby-east', 'floor-2', 'floor-3', 'datacenter', 'parking-a', 'parking-b']
DIRECTIONS = ['IN', 'OUT']
EVENT_TYPES = ['BADGE_SWIPE', 'BADGE_SWIPE', 'BADGE_SWIPE', 'BADGE_SWIPE', 'PIN_ENTRY', 'BIOMETRIC']  # Weighted
DENY_REASONS = [
    ('INVALID_BADGE', 'INV_BADGE'),
    ('EXPIRED_BADGE', 'EXP_BADGE'),
    ('NO_ENTITLEMENT', 'NO_ENT'),
    ('ANTIPASSBACK', 'APB'),
    ('SCHEDULE_VIOLATION', 'SCHED_VIO'),
]
SUSPICIOUS_REASONS = ['TAILGATING', 'UNUSUAL_HOURS', 'MULTIPLE_FAILURES', 'CREDENTIAL_SHARING']


# =============================================================================
# Event Generation Functions
# =============================================================================

def generate_access_event(connector: dict) -> dict:
    """Generate a single simulated access event."""
    event_id = str(uuid.uuid4())
    tenant_id = random.choice(config.tenants)
    event_time = datetime.utcnow()

    # Generate identifiers
    person_num = random.randint(1, 200)
    badge_num = random.randint(1, 500)
    person_id = f'PERSON-{tenant_id}-{person_num}'
    badge_id = f'BADGE-{tenant_id}-{badge_num}'

    # Location info
    site_id = random.choice(SITES)
    location_id = random.choice(LOCATIONS)

    # Direction (50/50)
    direction = random.choice(DIRECTIONS)

    # Result: 75% grant, 25% deny (lowercase to match ClickHouse views)
    result = 'grant' if random.random() < 0.75 else 'deny'

    # Event type (weighted toward BADGE_SWIPE)
    event_type = random.choice(EVENT_TYPES)

    # Deny details
    deny_reason: Optional[str] = None
    deny_code: Optional[str] = None
    if result == 'deny':
        reason_tuple = random.choice(DENY_REASONS)
        deny_reason = reason_tuple[0]
        deny_code = reason_tuple[1]

    # PACS source info
    pacs_source = connector['pacs_type']
    pacs_event_id = f"{pacs_source}-{event_id[:8]}"

    # Suspicious flag (~5% of events)
    suspicious_flag = 1 if random.random() < 0.05 else 0
    suspicious_reason: Optional[str] = None
    suspicious_score: Optional[float] = None
    if suspicious_flag:
        suspicious_reason = random.choice(SUSPICIOUS_REASONS)
        suspicious_score = round(random.uniform(0.5, 1.0), 2)

    # Raw payload (keep under 2KB)
    raw_payload = json.dumps({
        'source': connector['connector_id'],
        'originalEventId': pacs_event_id,
        'reader': f'{location_id}-reader-{random.randint(1, 4)}',
        'cardFormat': random.choice(['26-bit Wiegand', '34-bit HID', 'MIFARE', 'iCLASS']),
        'timestamp': event_time.isoformat(),
        'facilityCode': random.randint(100, 999),
    })

    return {
        'event_id': event_id,
        'tenant_id': tenant_id,
        'event_time': event_time,
        'person_id': person_id,
        'badge_id': badge_id,
        'site_id': site_id,
        'location_id': location_id,
        'direction': direction,
        'result': result,
        'event_type': event_type,
        'deny_reason': deny_reason,
        'deny_code': deny_code,
        'pacs_source': pacs_source,
        'pacs_event_id': pacs_event_id,
        'raw_payload': raw_payload,
        'suspicious_flag': suspicious_flag,
        'suspicious_reason': suspicious_reason,
        'suspicious_score': suspicious_score,
    }


def generate_connector_health(connector: dict, events_generated: int, elapsed_seconds: float) -> dict:
    """Generate a connector health check record."""
    tenant_id = random.choice(config.tenants)
    check_time = datetime.utcnow()

    # Status distribution: 85% healthy, 10% degraded, 5% offline
    status_roll = random.random()
    if status_roll < 0.85:
        status = 'healthy'
        latency_ms = random.randint(50, 200)
        error_message = None
        error_code = None
    elif status_roll < 0.95:
        status = 'degraded'
        latency_ms = random.randint(500, 2000)
        error_message = random.choice([
            'High latency detected',
            'Connection pool exhaustion warning',
            'Slow response from PACS server',
        ])
        error_code = 'WARN_LATENCY'
    else:
        status = 'offline'
        latency_ms = 30000  # Timeout
        error_message = random.choice([
            'Connection timeout',
            'PACS server unreachable',
            'Authentication failed',
        ])
        error_code = 'ERR_TIMEOUT'

    # Calculate events per minute based on actual rate
    events_per_minute = int((events_generated / max(elapsed_seconds, 1)) * 60) if elapsed_seconds > 0 else 0

    # Error count in last hour (more errors for unhealthy connectors)
    error_count_1h = 0 if status == 'healthy' else random.randint(1, 10) if status == 'degraded' else random.randint(10, 50)

    return {
        'tenant_id': tenant_id,
        'connector_id': connector['connector_id'],
        'connector_name': connector['connector_name'],
        'pacs_type': connector['pacs_type'],
        'pacs_version': connector['pacs_version'],
        'check_time': check_time,
        'status': status,
        'latency_ms': latency_ms,
        'events_per_minute': events_per_minute,
        'error_count_1h': error_count_1h,
        'last_event_time': check_time,
        'error_message': error_message,
        'error_code': error_code,
        'endpoint_url': connector['endpoint_url'],
        'last_successful_sync': check_time if status != 'offline' else None,
    }


# =============================================================================
# Database Writers
# =============================================================================

class MySQLWriter:
    """Writes events to MySQL for CDC capture."""

    def __init__(self):
        self.conn = None
        self.cursor = None
        self._connect()

    def _connect(self):
        """Establish MySQL connection."""
        logger.info(f"Connecting to MySQL at {config.mysql_host}:{config.mysql_port}...")
        self.conn = mysql.connector.connect(
            host=config.mysql_host,
            port=config.mysql_port,
            user=config.mysql_user,
            password=config.mysql_password,
            database=config.mysql_database,
        )
        self.cursor = self.conn.cursor()
        logger.info("MySQL connection established")

    def write_access_event(self, event: dict):
        """Insert access event into cg_access_event table."""
        sql = """
            INSERT INTO cg_access_event (
                event_id, tenant_id, event_time, person_id, badge_id,
                site_id, location_id, direction, result, event_type,
                deny_reason, deny_code, pacs_source, pacs_event_id,
                raw_payload, suspicious_flag, suspicious_reason, suspicious_score
            ) VALUES (
                %(event_id)s, %(tenant_id)s, %(event_time)s, %(person_id)s, %(badge_id)s,
                %(site_id)s, %(location_id)s, %(direction)s, %(result)s, %(event_type)s,
                %(deny_reason)s, %(deny_code)s, %(pacs_source)s, %(pacs_event_id)s,
                %(raw_payload)s, %(suspicious_flag)s, %(suspicious_reason)s, %(suspicious_score)s
            )
        """
        self.cursor.execute(sql, event)
        self.conn.commit()

    def write_connector_health(self, health: dict):
        """Insert connector health into cg_connector_health table."""
        sql = """
            INSERT INTO cg_connector_health (
                tenant_id, connector_id, connector_name, pacs_type, pacs_version,
                check_time, status, latency_ms, events_per_minute, error_count_1h,
                last_event_time, error_message, error_code, endpoint_url, last_successful_sync
            ) VALUES (
                %(tenant_id)s, %(connector_id)s, %(connector_name)s, %(pacs_type)s, %(pacs_version)s,
                %(check_time)s, %(status)s, %(latency_ms)s, %(events_per_minute)s, %(error_count_1h)s,
                %(last_event_time)s, %(error_message)s, %(error_code)s, %(endpoint_url)s, %(last_successful_sync)s
            )
        """
        self.cursor.execute(sql, health)
        self.conn.commit()

    def close(self):
        """Close MySQL connections."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("MySQL connection closed")


class ClickHouseWriter:
    """Writes events directly to ClickHouse (bypassing CDC)."""

    def __init__(self):
        self.client = None
        self._connect()

    def _connect(self):
        """Establish ClickHouse connection."""
        logger.info(f"Connecting to ClickHouse at {config.clickhouse_host}:{config.clickhouse_port}...")
        self.client = clickhouse_connect.get_client(
            host=config.clickhouse_host,
            port=config.clickhouse_port,
            database=config.clickhouse_database,
        )
        logger.info("ClickHouse connection established")

    def write_access_event(self, event: dict):
        """Insert access event into piam.fact_access_events table."""
        # Convert datetime to proper format
        row = [
            event['event_id'],
            event['tenant_id'],
            event['event_time'],
            event['person_id'],
            event['badge_id'],
            event['site_id'],
            event['location_id'],
            event['direction'],
            event['result'],
            event['event_type'],
            event['deny_reason'] or '',
            event['deny_code'] or '',
            event['pacs_source'],
            event['pacs_event_id'],
            event['raw_payload'],
            event['suspicious_flag'],
            event['suspicious_reason'] or '',
            event['suspicious_score'] or 0.0,
        ]
        self.client.insert(
            'fact_access_events',
            [row],
            column_names=[
                'event_id', 'tenant_id', 'event_time', 'person_id', 'badge_id',
                'site_id', 'location_id', 'direction', 'result', 'event_type',
                'deny_reason', 'deny_code', 'pacs_source', 'pacs_event_id',
                'raw_payload', 'suspicious_flag', 'suspicious_reason', 'suspicious_score',
            ]
        )

    def write_connector_health(self, health: dict):
        """Insert connector health into piam.fact_connector_health table."""
        row = [
            health['tenant_id'],
            health['connector_id'],
            health['connector_name'],
            health['pacs_type'],
            health['pacs_version'] or '',
            health['check_time'],
            health['status'],
            health['latency_ms'],
            health['events_per_minute'],
            health['error_count_1h'],
            health['last_event_time'],
            health['error_message'] or '',
            health['error_code'] or '',
            health['endpoint_url'] or '',
            health['last_successful_sync'] or health['check_time'],
        ]
        self.client.insert(
            'fact_connector_health',
            [row],
            column_names=[
                'tenant_id', 'connector_id', 'connector_name', 'pacs_type', 'pacs_version',
                'check_time', 'status', 'latency_ms', 'events_per_minute', 'error_count_1h',
                'last_event_time', 'error_message', 'error_code', 'endpoint_url', 'last_successful_sync',
            ]
        )

    def close(self):
        """Close ClickHouse connection."""
        if self.client:
            self.client.close()
        logger.info("ClickHouse connection closed")


# =============================================================================
# Main Generator Loop
# =============================================================================

def main():
    """Main generator loop."""
    global shutdown_requested

    logger.info("=" * 60)
    logger.info("PACS Event Generator Starting")
    logger.info(f"Mode: {config.ingest_mode.upper()}")
    logger.info(f"Event rate: {config.event_rate_per_second} events/second")
    logger.info(f"Health check interval: {config.health_interval_seconds} seconds")
    logger.info(f"Connectors: {len(CONNECTORS)}")
    logger.info("=" * 60)

    # Initialize writer based on mode
    writer = None
    try:
        if config.ingest_mode == 'cdc':
            writer = MySQLWriter()
        elif config.ingest_mode == 'direct':
            writer = ClickHouseWriter()
        else:
            logger.error(f"Unknown ingest mode: {config.ingest_mode}")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        sys.exit(1)

    # Tracking variables
    total_events = 0
    events_since_health = 0
    start_time = time.time()
    last_health_time = start_time
    interval = 1.0 / config.event_rate_per_second

    logger.info("Starting event generation loop...")

    try:
        while not shutdown_requested:
            loop_start = time.time()

            # Select a random connector for this event
            connector = random.choice(CONNECTORS)

            # Generate and write access event
            event = generate_access_event(connector)
            try:
                writer.write_access_event(event)
                total_events += 1
                events_since_health += 1

                if total_events % 100 == 0:
                    elapsed = time.time() - start_time
                    rate = total_events / elapsed if elapsed > 0 else 0
                    logger.info(
                        f"Events generated: {total_events} | "
                        f"Rate: {rate:.1f}/s | "
                        f"Mode: {config.ingest_mode.upper()}"
                    )
            except Exception as e:
                logger.error(f"Failed to write access event: {e}")

            # Check if it's time for health updates
            current_time = time.time()
            if current_time - last_health_time >= config.health_interval_seconds:
                elapsed_since_health = current_time - last_health_time

                # Generate health for all connectors
                for conn in CONNECTORS:
                    health = generate_connector_health(conn, events_since_health // len(CONNECTORS), elapsed_since_health)
                    try:
                        writer.write_connector_health(health)
                    except Exception as e:
                        logger.error(f"Failed to write connector health: {e}")

                logger.info(
                    f"Health check completed for {len(CONNECTORS)} connectors | "
                    f"Events since last check: {events_since_health}"
                )
                events_since_health = 0
                last_health_time = current_time

            # Sleep to maintain event rate
            elapsed = time.time() - loop_start
            sleep_time = max(0, interval - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)

    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    finally:
        # Cleanup
        elapsed = time.time() - start_time
        logger.info("=" * 60)
        logger.info("Shutting down generator...")
        logger.info(f"Total events generated: {total_events}")
        logger.info(f"Total runtime: {elapsed:.1f} seconds")
        logger.info(f"Average rate: {total_events / elapsed:.1f} events/second" if elapsed > 0 else "N/A")

        if writer:
            writer.close()

        logger.info("Generator shutdown complete")
        logger.info("=" * 60)


if __name__ == '__main__':
    main()
