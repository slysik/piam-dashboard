"""CDC Consumer: Reads from Kafka topics and writes to ClickHouse."""
import json
import logging
import signal
import sys
import time
from typing import Optional

import clickhouse_connect
from clickhouse_connect.driver import Client as ClickHouseClient
from kafka import KafkaConsumer
from kafka.errors import KafkaError

from config import config
from mapping import map_access_event, map_connector_health

# Configure logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Kafka topics (Debezium naming: <server>.<database>.<table>)
TOPIC_ACCESS_EVENT = 'cg.cloudgate.cg_access_event'
TOPIC_CONNECTOR_HEALTH = 'cg.cloudgate.cg_connector_health'

# Buffer limits to prevent runaway memory usage
MAX_BUFFER_SIZE = 5000


class CDCConsumer:
    """Consumes CDC events from Kafka and writes to ClickHouse."""

    def __init__(self):
        self.running = True
        self.consumer: Optional[KafkaConsumer] = None
        self.clickhouse_client: Optional[ClickHouseClient] = None

        # Buffers for batching
        self.event_buffer: list[dict] = []
        self.health_buffer: list[dict] = []
        self.last_flush_time = time.time()

        # Statistics
        self.total_events_processed = 0
        self.total_health_processed = 0

    def setup_signal_handlers(self):
        """Setup graceful shutdown handlers."""
        signal.signal(signal.SIGTERM, self._shutdown_handler)
        signal.signal(signal.SIGINT, self._shutdown_handler)

    def _shutdown_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.running = False

    def connect_kafka(self) -> bool:
        """Connect to Kafka broker."""
        try:
            logger.info(f"Connecting to Kafka at {config.kafka_bootstrap}...")
            self.consumer = KafkaConsumer(
                TOPIC_ACCESS_EVENT,
                TOPIC_CONNECTOR_HEALTH,
                bootstrap_servers=config.kafka_bootstrap,
                group_id=config.kafka_group_id,
                auto_offset_reset='earliest',
                enable_auto_commit=False,  # Manual commit after ClickHouse insert
                value_deserializer=lambda m: json.loads(m.decode('utf-8')) if m else None,
                consumer_timeout_ms=1000,  # Return from poll after 1 second
            )
            logger.info(f"Connected to Kafka, subscribed to topics: {TOPIC_ACCESS_EVENT}, {TOPIC_CONNECTOR_HEALTH}")
            return True
        except KafkaError as e:
            logger.error(f"Failed to connect to Kafka: {e}")
            return False

    def connect_clickhouse(self) -> bool:
        """Connect to ClickHouse."""
        try:
            logger.info(f"Connecting to ClickHouse at {config.clickhouse_host}:{config.clickhouse_port}...")
            self.clickhouse_client = clickhouse_connect.get_client(
                host=config.clickhouse_host,
                port=config.clickhouse_port,
                database=config.clickhouse_database,
            )
            # Test connection
            self.clickhouse_client.query("SELECT 1")
            logger.info("Connected to ClickHouse successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to ClickHouse: {e}")
            return False

    def process_message(self, topic: str, message: dict):
        """Process a single CDC message and add to appropriate buffer."""
        if message is None:
            return

        # Debezium SMT already unwraps, so message is the record directly
        # But we still need to check for CDC operation type if present
        op = message.get('__op') or message.get('op')

        # Handle only creates and updates, ignore deletes
        if op and op not in ('c', 'u', 'r'):  # 'r' is snapshot read
            logger.debug(f"Skipping operation '{op}' for topic {topic}")
            return

        # Remove CDC metadata fields if present
        record = {k: v for k, v in message.items() if not k.startswith('__')}

        if topic == TOPIC_ACCESS_EVENT:
            try:
                mapped = map_access_event(record)
                self.event_buffer.append(mapped)
            except KeyError as e:
                logger.warning(f"Missing required field in access event: {e}")

        elif topic == TOPIC_CONNECTOR_HEALTH:
            try:
                mapped = map_connector_health(record)
                self.health_buffer.append(mapped)
            except KeyError as e:
                logger.warning(f"Missing required field in health record: {e}")

    def should_flush(self) -> bool:
        """Check if buffers should be flushed."""
        elapsed = time.time() - self.last_flush_time

        # Flush on time interval
        if elapsed >= config.flush_interval_seconds:
            return True

        # Flush on batch size limits
        if len(self.event_buffer) >= config.max_batch_events:
            return True
        if len(self.health_buffer) >= config.max_batch_health:
            return True

        # Emergency flush if buffer too large
        total_buffered = len(self.event_buffer) + len(self.health_buffer)
        if total_buffered >= MAX_BUFFER_SIZE:
            logger.warning(f"Buffer size {total_buffered} exceeds max {MAX_BUFFER_SIZE}, forcing flush")
            return True

        return False

    def flush_to_clickhouse(self) -> bool:
        """Flush buffered records to ClickHouse."""
        if not self.event_buffer and not self.health_buffer:
            self.last_flush_time = time.time()
            return True

        if self.clickhouse_client is None:
            logger.error("ClickHouse client not connected")
            return False

        try:
            # Insert access events
            if self.event_buffer:
                columns = list(self.event_buffer[0].keys())
                data = [[row[col] for col in columns] for row in self.event_buffer]
                self.clickhouse_client.insert(
                    'fact_access_events',
                    data,
                    column_names=columns
                )
                self.total_events_processed += len(self.event_buffer)
                logger.info(f"Flushed {len(self.event_buffer)} access events to ClickHouse "
                           f"(total: {self.total_events_processed})")
                self.event_buffer.clear()

            # Insert connector health records
            if self.health_buffer:
                columns = list(self.health_buffer[0].keys())
                data = [[row[col] for col in columns] for row in self.health_buffer]
                self.clickhouse_client.insert(
                    'fact_connector_health',
                    data,
                    column_names=columns
                )
                self.total_health_processed += len(self.health_buffer)
                logger.info(f"Flushed {len(self.health_buffer)} health records to ClickHouse "
                           f"(total: {self.total_health_processed})")
                self.health_buffer.clear()

            self.last_flush_time = time.time()
            return True

        except Exception as e:
            logger.error(f"Failed to flush to ClickHouse: {e}")
            return False

    def run(self):
        """Main consumer loop."""
        self.setup_signal_handlers()

        # Connect to services with retry
        max_retries = 10
        retry_delay = 5

        for attempt in range(max_retries):
            if self.connect_kafka() and self.connect_clickhouse():
                break
            logger.warning(f"Connection attempt {attempt + 1}/{max_retries} failed, retrying in {retry_delay}s...")
            time.sleep(retry_delay)
        else:
            logger.error("Failed to connect after maximum retries, exiting")
            sys.exit(1)

        logger.info("CDC Consumer started, beginning message processing...")

        # At this point consumer is guaranteed to be set (or we exited above)
        consumer = self.consumer
        assert consumer is not None

        try:
            while self.running:
                # Poll for messages (returns after consumer_timeout_ms)
                try:
                    for message in consumer:
                        if not self.running:
                            break

                        self.process_message(message.topic, message.value)

                        # Check if we should flush
                        if self.should_flush():
                            if self.flush_to_clickhouse():
                                # Commit offsets after successful insert
                                consumer.commit()
                            else:
                                logger.error("Flush failed, will retry on next cycle")

                except StopIteration:
                    # consumer_timeout_ms reached, no messages
                    pass

                # Periodic flush even without new messages
                if self.should_flush() and (self.event_buffer or self.health_buffer):
                    if self.flush_to_clickhouse():
                        consumer.commit()

        except Exception as e:
            logger.error(f"Unexpected error in consumer loop: {e}")

        finally:
            # Graceful shutdown: flush remaining and commit
            logger.info("Shutting down, flushing remaining buffers...")
            if self.event_buffer or self.health_buffer:
                if self.flush_to_clickhouse():
                    consumer.commit()
                    logger.info("Final flush and commit completed")
                else:
                    logger.error("Final flush failed, some records may be lost")

            consumer.close()
            logger.info("Kafka consumer closed")

            logger.info(f"CDC Consumer stopped. Total processed: {self.total_events_processed} events, "
                       f"{self.total_health_processed} health records")


def main():
    """Entry point."""
    logger.info("="*60)
    logger.info("CDC Consumer starting...")
    logger.info(f"  Kafka bootstrap: {config.kafka_bootstrap}")
    logger.info(f"  Consumer group: {config.kafka_group_id}")
    logger.info(f"  ClickHouse: {config.clickhouse_host}:{config.clickhouse_port}/{config.clickhouse_database}")
    logger.info(f"  Flush interval: {config.flush_interval_seconds}s")
    logger.info(f"  Max batch (events): {config.max_batch_events}")
    logger.info(f"  Max batch (health): {config.max_batch_health}")
    logger.info("="*60)

    consumer = CDCConsumer()
    consumer.run()


if __name__ == '__main__':
    main()
