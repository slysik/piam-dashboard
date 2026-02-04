-- ClearView Intelligence - ClickHouse Schema
-- Run this script to create all required tables and views for live data mode
--
-- Prerequisites:
--   1. ClickHouse running (local Docker or Cloud)
--   2. Database 'piam' created
--
-- Usage:
--   clickhouse-client --multiquery < clickhouse-schema.sql
--   OR via HTTP:
--   curl -X POST 'http://localhost:8123/' --data-binary @clickhouse-schema.sql

-- ============================================================================
-- DATABASE
-- ============================================================================
CREATE DATABASE IF NOT EXISTS piam;

-- ============================================================================
-- BASE TABLES
-- ============================================================================

-- Access Events - Core event log from all PACS systems
CREATE TABLE IF NOT EXISTS piam.access_events (
    event_id UUID DEFAULT generateUUIDv4(),
    tenant_id LowCardinality(String),
    event_time DateTime64(3) DEFAULT now64(3),
    person_id String,
    person_name String,
    badge_id String,
    location_id String,
    location_name String,
    door_id String,
    lat Float64 DEFAULT 0,
    lon Float64 DEFAULT 0,
    result Enum8('grant' = 1, 'deny' = 2),
    deny_reason String DEFAULT '',
    connector_id String,
    pacs_type LowCardinality(String),
    suspicious_flag UInt8 DEFAULT 0,
    anomaly_type String DEFAULT '',
    risk_score UInt8 DEFAULT 0,
    video_clip_url String DEFAULT '',
    raw_payload String DEFAULT '{}'
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (tenant_id, event_time, event_id);

-- Connector Health - Status of PACS connectors
CREATE TABLE IF NOT EXISTS piam.connector_health (
    tenant_id LowCardinality(String),
    connector_id String,
    connector_name String,
    pacs_type LowCardinality(String),
    status Enum8('healthy' = 1, 'degraded' = 2, 'offline' = 3),
    latency_ms UInt32 DEFAULT 0,
    events_per_minute Float32 DEFAULT 0,
    last_check DateTime64(3) DEFAULT now64(3),
    last_event_time Nullable(DateTime64(3)),
    error_message String DEFAULT ''
) ENGINE = ReplacingMergeTree(last_check)
ORDER BY (tenant_id, connector_id);

-- Persons - Identity data synced from HR/PIAM
CREATE TABLE IF NOT EXISTS piam.persons (
    tenant_id LowCardinality(String),
    person_id String,
    full_name String,
    email String DEFAULT '',
    department String DEFAULT '',
    job_title String DEFAULT '',
    manager_id String DEFAULT '',
    person_type Enum8('employee' = 1, 'contractor' = 2, 'visitor' = 3) DEFAULT 'employee',
    is_contractor UInt8 DEFAULT 0,
    contractor_company String DEFAULT '',
    hire_date Nullable(Date),
    termination_date Nullable(Date),
    badge_status Enum8('active' = 1, 'disabled' = 2, 'lost' = 3, 'expired' = 4) DEFAULT 'active',
    hr_status Enum8('active' = 1, 'terminated' = 2, 'leave' = 3) DEFAULT 'active',
    last_access_time Nullable(DateTime64(3)),
    created_at DateTime64(3) DEFAULT now64(3),
    updated_at DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (tenant_id, person_id);

-- Compliance Records - Training, certifications, background checks
CREATE TABLE IF NOT EXISTS piam.compliance_records (
    tenant_id LowCardinality(String),
    person_id String,
    requirement_type LowCardinality(String),
    requirement_name String,
    status Enum8('compliant' = 1, 'expiring' = 2, 'expired' = 3, 'non_compliant' = 4),
    issue_date Nullable(Date),
    expiry_date Nullable(Date),
    days_until_expiry Int32 DEFAULT 0,
    verified_by String DEFAULT '',
    verified_at Nullable(DateTime64(3)),
    updated_at DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (tenant_id, person_id, requirement_type);

-- Entitlements - Access grants and policies
CREATE TABLE IF NOT EXISTS piam.entitlements (
    tenant_id LowCardinality(String),
    entitlement_id UUID DEFAULT generateUUIDv4(),
    person_id String,
    person_name String,
    zone_id String,
    zone_name String,
    grant_type Enum8('policy' = 1, 'manual' = 2, 'exception' = 3),
    granted_by String DEFAULT '',
    granted_at DateTime64(3) DEFAULT now64(3),
    expires_at Nullable(DateTime64(3)),
    last_used Nullable(DateTime64(3)),
    approval_chain String DEFAULT '[]',
    is_active UInt8 DEFAULT 1
) ENGINE = ReplacingMergeTree(granted_at)
ORDER BY (tenant_id, person_id, zone_id);

-- Access Requests - Self-service request workflow
CREATE TABLE IF NOT EXISTS piam.access_requests (
    tenant_id LowCardinality(String),
    request_id UUID DEFAULT generateUUIDv4(),
    person_id String,
    person_name String,
    zone_id String,
    zone_name String,
    request_type LowCardinality(String),
    status Enum8('submitted' = 1, 'pending_approval' = 2, 'approved' = 3, 'rejected' = 4, 'provisioned' = 5),
    risk_level Enum8('low' = 1, 'medium' = 2, 'high' = 3, 'critical' = 4) DEFAULT 'low',
    submitted_at DateTime64(3) DEFAULT now64(3),
    approved_at Nullable(DateTime64(3)),
    provisioned_at Nullable(DateTime64(3)),
    sla_hours UInt32 DEFAULT 24,
    within_sla UInt8 DEFAULT 1
) ENGINE = MergeTree()
ORDER BY (tenant_id, submitted_at, request_id);

-- ============================================================================
-- VIEWS FOR DASHBOARD
-- ============================================================================

-- v_kpi_current: Current KPI metrics (15m, 24h windows)
CREATE OR REPLACE VIEW piam.v_kpi_current AS
SELECT
    tenant_id,
    countIf(event_time >= now() - INTERVAL 15 MINUTE) AS events_15m,
    countIf(event_time >= now() - INTERVAL 15 MINUTE AND result = 'deny') AS denies_15m,
    round(if(events_15m > 0, denies_15m * 100.0 / events_15m, 0), 1) AS deny_rate_15m,
    countIf(event_time >= now() - INTERVAL 15 MINUTE AND suspicious_flag = 1) AS suspicious_15m,
    countIf(event_time >= now() - INTERVAL 24 HOUR) AS events_24h,
    countIf(event_time >= now() - INTERVAL 24 HOUR AND result = 'deny') AS denies_24h,
    round(if(events_24h > 0, denies_24h * 100.0 / events_24h, 0), 1) AS deny_rate_24h,
    countIf(event_time >= now() - INTERVAL 24 HOUR AND suspicious_flag = 1) AS suspicious_24h
FROM piam.access_events
WHERE event_time >= now() - INTERVAL 24 HOUR
GROUP BY tenant_id;

-- v_timeseries_minute: Per-minute aggregates for time series charts
CREATE OR REPLACE VIEW piam.v_timeseries_minute AS
SELECT
    tenant_id,
    toStartOfMinute(event_time) AS minute,
    count() AS total_events,
    countIf(result = 'grant') AS grants,
    countIf(result = 'deny') AS denies,
    countIf(suspicious_flag = 1) AS suspicious
FROM piam.access_events
WHERE event_time >= now() - INTERVAL 24 HOUR
GROUP BY tenant_id, minute
ORDER BY minute ASC;

-- v_recent_events: Recent events with full details
CREATE OR REPLACE VIEW piam.v_recent_events AS
SELECT
    event_id,
    tenant_id,
    event_time,
    person_id,
    person_name,
    badge_id,
    location_id,
    location_name,
    result,
    deny_reason,
    suspicious_flag,
    anomaly_type,
    risk_score,
    video_clip_url,
    pacs_type,
    connector_id,
    raw_payload
FROM piam.access_events
WHERE event_time >= now() - INTERVAL 1 HOUR
ORDER BY event_time DESC;

-- v_connector_health_latest: Latest connector status
CREATE OR REPLACE VIEW piam.v_connector_health_latest AS
SELECT
    tenant_id,
    connector_id,
    connector_name,
    pacs_type,
    status,
    latency_ms,
    events_per_minute,
    last_check,
    last_event_time,
    error_message
FROM piam.connector_health
FINAL
ORDER BY connector_name;

-- v_door_hotspots: Door/location deny hotspots for map
CREATE OR REPLACE VIEW piam.v_door_hotspots AS
SELECT
    tenant_id,
    location_id,
    location_name AS door_id,
    location_name,
    any(lat) AS lat,
    any(lon) AS lon,
    count() AS total_events,
    countIf(result = 'deny') AS denies,
    round(if(total_events > 0, denies * 100.0 / total_events, 0), 1) AS deny_rate_pct,
    countIf(suspicious_flag = 1) AS suspicious
FROM piam.access_events
WHERE event_time >= now() - INTERVAL 24 HOUR
GROUP BY tenant_id, location_id, location_name
HAVING total_events >= 5;

-- v_compliance_summary: Compliance status for persons
CREATE OR REPLACE VIEW piam.v_compliance_summary AS
SELECT
    p.tenant_id,
    p.person_id,
    p.full_name,
    p.department,
    p.is_contractor,
    p.contractor_company,
    c.requirement_type,
    c.requirement_name,
    c.expiry_date,
    c.days_until_expiry,
    if(c.days_until_expiry < 0, 1, 0) AS is_expired,
    if(c.days_until_expiry >= 0 AND c.days_until_expiry <= 7, 1, 0) AS expires_within_7d,
    if(c.days_until_expiry >= 0 AND c.days_until_expiry <= 30, 1, 0) AS expires_within_30d
FROM piam.persons p
LEFT JOIN piam.compliance_records c ON p.tenant_id = c.tenant_id AND p.person_id = c.person_id
WHERE p.hr_status = 'active';

-- v_freshness: Data freshness indicator
CREATE OR REPLACE VIEW piam.v_freshness AS
SELECT
    dateDiff('second', max(event_time), now()) AS age_seconds,
    countIf(event_time >= now() - INTERVAL 5 MINUTE) AS events_last_5m
FROM piam.access_events;

-- v_insight_deny_spikes: Detect deny rate spikes by location
CREATE OR REPLACE VIEW piam.v_insight_deny_spikes AS
WITH baseline AS (
    SELECT
        tenant_id,
        location_name,
        avg(hourly_denies) AS baseline_denies
    FROM (
        SELECT
            tenant_id,
            location_name,
            toStartOfHour(event_time) AS hour,
            countIf(result = 'deny') AS hourly_denies
        FROM piam.access_events
        WHERE event_time >= now() - INTERVAL 7 DAY
          AND event_time < now() - INTERVAL 1 HOUR
        GROUP BY tenant_id, location_name, hour
    )
    GROUP BY tenant_id, location_name
)
SELECT
    e.tenant_id,
    e.location_name,
    countIf(e.result = 'deny') AS current_denies,
    b.baseline_denies,
    round(if(b.baseline_denies > 0, current_denies / b.baseline_denies, current_denies), 2) AS spike_ratio
FROM piam.access_events e
LEFT JOIN baseline b ON e.tenant_id = b.tenant_id AND e.location_name = b.location_name
WHERE e.event_time >= now() - INTERVAL 1 HOUR
GROUP BY e.tenant_id, e.location_name, b.baseline_denies
HAVING current_denies > 3;

-- v_access_hygiene: Lifecycle exceptions (terminated+active, dormant, etc.)
CREATE OR REPLACE VIEW piam.v_access_hygiene AS
SELECT
    tenant_id,
    person_id,
    full_name,
    department,
    person_type,
    badge_status,
    hr_status,
    termination_date,
    last_access_time,
    dateDiff('day', last_access_time, now()) AS days_since_access,
    CASE
        WHEN hr_status = 'terminated' AND badge_status = 'active' THEN 'terminated_active_badge'
        WHEN is_contractor = 1 AND termination_date < today() THEN 'contractor_expired'
        WHEN days_since_access > 90 THEN 'dormant_access'
        WHEN hr_status = 'active' AND badge_status = 'disabled' THEN 'orphan_badge'
        ELSE 'normal'
    END AS exception_type
FROM piam.persons
WHERE exception_type != 'normal';

-- v_governance_entitlements: Entitlements with grant details
CREATE OR REPLACE VIEW piam.v_governance_entitlements AS
SELECT
    tenant_id,
    entitlement_id,
    person_id,
    person_name,
    zone_id,
    zone_name,
    grant_type,
    granted_by,
    granted_at,
    expires_at,
    last_used,
    if(expires_at IS NOT NULL AND expires_at < now() + INTERVAL 7 DAY, 1, 0) AS expiring_soon,
    approval_chain,
    is_active
FROM piam.entitlements
WHERE is_active = 1;

-- v_access_request_funnel: Request workflow metrics
CREATE OR REPLACE VIEW piam.v_access_request_funnel AS
SELECT
    tenant_id,
    count() AS total_submitted,
    countIf(status IN ('approved', 'provisioned')) AS total_approved,
    countIf(status = 'provisioned') AS total_provisioned,
    countIf(status = 'rejected') AS total_rejected,
    countIf(status IN ('submitted', 'pending_approval')) AS total_pending,
    round(total_approved * 100.0 / total_submitted, 1) AS approval_rate,
    round(countIf(within_sla = 1) * 100.0 / count(), 1) AS sla_rate
FROM piam.access_requests
WHERE submitted_at >= now() - INTERVAL 30 DAY
GROUP BY tenant_id;

-- v_executive_risk: High-level risk metrics for executive view
CREATE OR REPLACE VIEW piam.v_executive_risk AS
SELECT
    tenant_id,
    -- Risk score (weighted formula)
    round(
        least(100,
            (deny_rate_24h * 0.3) +
            (suspicious_rate * 50) +
            (anomaly_count * 2)
        )
    ) AS overall_risk_score,
    -- Compliance rate from persons
    round(
        (SELECT countIf(badge_status = 'active' AND hr_status = 'active') * 100.0 / count()
         FROM piam.persons p WHERE p.tenant_id = e.tenant_id), 1
    ) AS compliance_rate,
    suspicious_24h AS open_incidents,
    connector_count AS active_sites
FROM (
    SELECT
        tenant_id,
        countIf(event_time >= now() - INTERVAL 24 HOUR AND result = 'deny') * 100.0 /
            nullIf(countIf(event_time >= now() - INTERVAL 24 HOUR), 0) AS deny_rate_24h,
        countIf(event_time >= now() - INTERVAL 24 HOUR AND suspicious_flag = 1) AS suspicious_24h,
        countIf(event_time >= now() - INTERVAL 24 HOUR AND suspicious_flag = 1) * 1.0 /
            nullIf(countIf(event_time >= now() - INTERVAL 24 HOUR), 0) AS suspicious_rate,
        countIf(event_time >= now() - INTERVAL 24 HOUR AND anomaly_type != '') AS anomaly_count
    FROM piam.access_events
    GROUP BY tenant_id
) e
CROSS JOIN (
    SELECT tenant_id, count(DISTINCT connector_id) AS connector_count
    FROM piam.connector_health
    GROUP BY tenant_id
) c
WHERE e.tenant_id = c.tenant_id;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment below to insert sample data for testing

/*
-- Sample connectors
INSERT INTO piam.connector_health VALUES
    ('acme-corp', 'lenel-01', 'Lenel HQ', 'Lenel', 'healthy', 45, 12.5, now(), now(), NULL),
    ('acme-corp', 'ccure-01', 'C-CURE DataCenter', 'C-CURE', 'healthy', 62, 8.3, now(), now(), NULL),
    ('acme-corp', 's2-01', 'S2 Warehouse', 'S2', 'degraded', 180, 3.1, now(), now(), 'High latency'),
    ('buildright-construction', 'genetec-01', 'Genetec Site A', 'Genetec', 'healthy', 55, 15.2, now(), now(), NULL);

-- Sample events (generates 1000 random events)
INSERT INTO piam.access_events
SELECT
    generateUUIDv4() AS event_id,
    arrayElement(['acme-corp', 'buildright-construction'], rand() % 2 + 1) AS tenant_id,
    now() - INTERVAL (rand() % 1440) MINUTE AS event_time,
    concat('P', toString(rand() % 100)) AS person_id,
    arrayElement(['John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown', 'Charlie Davis'], rand() % 5 + 1) AS person_name,
    concat('B', toString(rand() % 1000)) AS badge_id,
    concat('L', toString(rand() % 20)) AS location_id,
    arrayElement(['Main Lobby', 'Server Room', 'Loading Dock', 'Executive Floor', 'Parking Garage'], rand() % 5 + 1) AS location_name,
    concat('D', toString(rand() % 50)) AS door_id,
    37.7749 + (rand() % 100) / 1000 AS lat,
    -122.4194 + (rand() % 100) / 1000 AS lon,
    if(rand() % 10 < 8, 'grant', 'deny') AS result,
    if(result = 'deny', arrayElement(['Invalid Badge', 'Expired', 'No Access', 'Time Restriction'], rand() % 4 + 1), '') AS deny_reason,
    arrayElement(['lenel-01', 'ccure-01', 's2-01', 'genetec-01'], rand() % 4 + 1) AS connector_id,
    arrayElement(['Lenel', 'C-CURE', 'S2', 'Genetec'], rand() % 4 + 1) AS pacs_type,
    if(rand() % 20 = 0, 1, 0) AS suspicious_flag,
    if(suspicious_flag = 1, arrayElement(['after_hours', 'denied_streak', 'impossible_travel'], rand() % 3 + 1), '') AS anomaly_type,
    rand() % 100 AS risk_score,
    '{"source": "test"}' AS raw_payload
FROM numbers(1000);
*/
