"""Shared configuration for CDC pipeline components."""
import os
from dataclasses import dataclass, field


@dataclass
class Config:
    # Ingestion mode: 'cdc' or 'direct'
    ingest_mode: str = os.getenv('INGEST_MODE', 'cdc')

    # MySQL settings
    mysql_host: str = os.getenv('MYSQL_HOST', 'mysql')
    mysql_port: int = int(os.getenv('MYSQL_PORT', '3306'))
    mysql_user: str = os.getenv('MYSQL_USER', 'root')
    mysql_password: str = os.getenv('MYSQL_PASSWORD', 'rootpass')
    mysql_database: str = os.getenv('MYSQL_DATABASE', 'cloudgate')

    # ClickHouse settings
    clickhouse_host: str = os.getenv('CLICKHOUSE_HOST', 'clickhouse')
    clickhouse_port: int = int(os.getenv('CLICKHOUSE_PORT', '8123'))
    clickhouse_database: str = os.getenv('CLICKHOUSE_DATABASE', 'piam')

    # Kafka/Redpanda settings
    kafka_bootstrap: str = os.getenv('KAFKA_BOOTSTRAP', 'redpanda:29092')
    kafka_group_id: str = os.getenv('KAFKA_GROUP_ID', 'cdc-consumer-group')

    # Generator settings
    event_rate_per_second: float = float(os.getenv('EVENT_RATE_PER_SECOND', '10'))
    health_interval_seconds: int = int(os.getenv('HEALTH_INTERVAL_SECONDS', '10'))

    # Consumer settings
    flush_interval_seconds: int = int(os.getenv('FLUSH_INTERVAL_SECONDS', '4'))
    max_batch_events: int = int(os.getenv('MAX_BATCH_EVENTS', '200'))
    max_batch_health: int = int(os.getenv('MAX_BATCH_HEALTH', '10'))

    # Demo tenants (must match dashboard tenant_id values)
    tenants: list[str] = field(default_factory=lambda: ['acme-corp', 'buildright-construction'])


config = Config()
