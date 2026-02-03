"""Field mapping from MySQL cg_* tables to ClickHouse piam.* tables."""


def map_access_event(cdc_record: dict) -> dict:
    """Map cg_access_event CDC record to piam.fact_access_events row."""
    return {
        'event_id': cdc_record['event_id'],
        'tenant_id': cdc_record['tenant_id'],
        'event_time': cdc_record['event_time'],
        'person_id': cdc_record.get('person_id'),
        'badge_id': cdc_record['badge_id'],
        'site_id': cdc_record['site_id'],
        'location_id': cdc_record['location_id'],
        'direction': cdc_record['direction'],
        'result': cdc_record['result'],
        'event_type': cdc_record['event_type'],
        'deny_reason': cdc_record.get('deny_reason'),
        'deny_code': cdc_record.get('deny_code'),
        'pacs_source': cdc_record['pacs_source'],
        'pacs_event_id': cdc_record['pacs_event_id'],
        'raw_payload': cdc_record.get('raw_payload', ''),
        'suspicious_flag': cdc_record.get('suspicious_flag', 0),
        'suspicious_reason': cdc_record.get('suspicious_reason'),
        'suspicious_score': cdc_record.get('suspicious_score', 0.0),
    }


def map_connector_health(cdc_record: dict) -> dict:
    """Map cg_connector_health CDC record to piam.fact_connector_health row."""
    return {
        'tenant_id': cdc_record['tenant_id'],
        'connector_id': cdc_record['connector_id'],
        'connector_name': cdc_record['connector_name'],
        'pacs_type': cdc_record['pacs_type'],
        'pacs_version': cdc_record.get('pacs_version'),
        'check_time': cdc_record['check_time'],
        'status': cdc_record['status'],
        'latency_ms': cdc_record['latency_ms'],
        'events_per_minute': cdc_record['events_per_minute'],
        'error_count_1h': cdc_record.get('error_count_1h', 0),
        'last_event_time': cdc_record.get('last_event_time'),
        'error_message': cdc_record.get('error_message'),
        'error_code': cdc_record.get('error_code'),
        'endpoint_url': cdc_record.get('endpoint_url'),
        'last_successful_sync': cdc_record.get('last_successful_sync'),
    }
