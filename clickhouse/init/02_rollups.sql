-- =============================================================================
-- PIAM Demo Schema - Part 2: Rollups and Views
-- =============================================================================

-- =============================================================================
-- ROLLUP TABLES (with Materialized Views for auto-population)
-- =============================================================================

-- Minute-level rollup for time-series charts
CREATE TABLE IF NOT EXISTS piam.rollup_access_minute
(
    tenant_id       String,
    site_id         String,
    location_id     String,
    minute          DateTime,
    total_events    UInt64,
    grants          UInt64,
    denies          UInt64,
    suspicious      UInt64,
    unique_badges   AggregateFunction(uniq, String),
    unique_persons  AggregateFunction(uniq, Nullable(String))
)
ENGINE = AggregatingMergeTree()
ORDER BY (tenant_id, minute, site_id, location_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS piam.mv_rollup_access_minute
TO piam.rollup_access_minute
AS SELECT
    tenant_id,
    site_id,
    location_id,
    toStartOfMinute(event_time) AS minute,
    count() AS total_events,
    countIf(result = 'GRANT') AS grants,
    countIf(result = 'DENY') AS denies,
    countIf(suspicious_flag = 1) AS suspicious,
    uniqState(badge_id) AS unique_badges,
    uniqState(person_id) AS unique_persons
FROM piam.fact_access_events
GROUP BY tenant_id, site_id, location_id, minute;

-- Hourly door rollup
CREATE TABLE IF NOT EXISTS piam.rollup_door_hour
(
    tenant_id       String,
    site_id         String,
    location_id     String,
    hour            DateTime,
    total_events    UInt64,
    grants          UInt64,
    denies          UInt64,
    suspicious      UInt64,
    deny_rate       Float64
)
ENGINE = SummingMergeTree()
ORDER BY (tenant_id, hour, site_id, location_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS piam.mv_rollup_door_hour
TO piam.rollup_door_hour
AS SELECT
    tenant_id,
    site_id,
    location_id,
    toStartOfHour(event_time) AS hour,
    count() AS total_events,
    countIf(result = 'GRANT') AS grants,
    countIf(result = 'DENY') AS denies,
    countIf(suspicious_flag = 1) AS suspicious,
    if(count() > 0, countIf(result = 'DENY') * 100.0 / count(), 0) AS deny_rate
FROM piam.fact_access_events
GROUP BY tenant_id, site_id, location_id, hour;

-- Baseline table (populated by 03_baselines.sql)
CREATE TABLE IF NOT EXISTS piam.rollup_baseline_hour_of_week
(
    tenant_id           String,
    site_id             String,
    location_id         String,
    hour_of_week        UInt8,
    day_of_week         UInt8,
    hour_of_day         UInt8,
    avg_events_per_hour Float64,
    avg_grants_per_hour Float64,
    avg_denies_per_hour Float64,
    avg_deny_rate       Float64,
    avg_suspicious      Float64,
    stddev_events       Float64,
    stddev_denies       Float64,
    sample_weeks        UInt8,
    computed_at         DateTime64(3) DEFAULT now64(3)
)
ENGINE = ReplacingMergeTree(computed_at)
ORDER BY (tenant_id, site_id, location_id, hour_of_week);

-- =============================================================================
-- QUERY VIEWS (for dashboards)
-- =============================================================================

-- Current KPIs (15m, 60m, 24h)
CREATE OR REPLACE VIEW piam.v_kpi_current AS
SELECT
    tenant_id,
    countIf(event_time > now() - INTERVAL 15 MINUTE) AS events_15m,
    countIf(event_time > now() - INTERVAL 15 MINUTE AND result = 'GRANT') AS grants_15m,
    countIf(event_time > now() - INTERVAL 15 MINUTE AND result = 'DENY') AS denies_15m,
    round(if(countIf(event_time > now() - INTERVAL 15 MINUTE) > 0,
       countIf(event_time > now() - INTERVAL 15 MINUTE AND result = 'DENY') * 100.0 /
       countIf(event_time > now() - INTERVAL 15 MINUTE), 0), 1) AS deny_rate_15m,
    countIf(event_time > now() - INTERVAL 15 MINUTE AND suspicious_flag = 1) AS suspicious_15m,
    countIf(event_time > now() - INTERVAL 60 MINUTE) AS events_60m,
    countIf(event_time > now() - INTERVAL 60 MINUTE AND result = 'DENY') AS denies_60m,
    countIf(event_time > now() - INTERVAL 60 MINUTE AND suspicious_flag = 1) AS suspicious_60m,
    countIf(event_time > now() - INTERVAL 24 HOUR) AS events_24h,
    countIf(event_time > now() - INTERVAL 24 HOUR AND result = 'DENY') AS denies_24h
FROM piam.fact_access_events
WHERE event_time > now() - INTERVAL 24 HOUR
GROUP BY tenant_id;

-- Time series (last 60 min, per minute)
CREATE OR REPLACE VIEW piam.v_timeseries_minute AS
SELECT
    tenant_id,
    toStartOfMinute(event_time) AS minute,
    count() AS total_events,
    countIf(result = 'GRANT') AS grants,
    countIf(result = 'DENY') AS denies,
    countIf(suspicious_flag = 1) AS suspicious
FROM piam.fact_access_events
WHERE event_time > now() - INTERVAL 60 MINUTE
GROUP BY tenant_id, minute
ORDER BY tenant_id, minute;

-- Door hotspots (last 60 min)
CREATE OR REPLACE VIEW piam.v_door_hotspots AS
SELECT
    e.tenant_id,
    e.site_id,
    e.location_id,
    l.location_name,
    l.building,
    l.floor,
    l.zone,
    l.door_type,
    l.lat,
    l.lon,
    l.is_high_risk,
    count() AS total_events,
    countIf(e.result = 'GRANT') AS grants,
    countIf(e.result = 'DENY') AS denies,
    round(if(count() > 0, countIf(e.result = 'DENY') * 100.0 / count(), 0), 1) AS deny_rate_pct,
    countIf(e.suspicious_flag = 1) AS suspicious
FROM piam.fact_access_events e
INNER JOIN piam.dim_location l ON e.location_id = l.location_id AND e.tenant_id = l.tenant_id
WHERE e.event_time > now() - INTERVAL 60 MINUTE
GROUP BY e.tenant_id, e.site_id, e.location_id, l.location_name, l.building, l.floor, l.zone, l.door_type, l.lat, l.lon, l.is_high_risk
ORDER BY denies DESC;

-- Connector health (latest)
CREATE OR REPLACE VIEW piam.v_connector_health_latest AS
SELECT
    tenant_id,
    connector_id,
    connector_name,
    pacs_type,
    argMax(status, check_time) AS status,
    argMax(latency_ms, check_time) AS latency_ms,
    argMax(events_per_minute, check_time) AS events_per_minute,
    argMax(error_count_1h, check_time) AS error_count_1h,
    argMax(error_message, check_time) AS error_message,
    max(check_time) AS last_check
FROM piam.fact_connector_health
WHERE check_time > now() - INTERVAL 2 HOUR
GROUP BY tenant_id, connector_id, connector_name, pacs_type;

-- Compliance summary
CREATE OR REPLACE VIEW piam.v_compliance_summary AS
SELECT
    c.tenant_id,
    c.person_id,
    p.first_name,
    p.last_name,
    concat(p.first_name, ' ', p.last_name) AS full_name,
    p.email,
    p.department,
    p.person_type,
    p.is_contractor,
    p.contractor_company,
    c.requirement_type,
    c.requirement_name,
    c.status,
    c.issue_date,
    c.expiry_date,
    c.last_checked,
    dateDiff('day', today(), c.expiry_date) AS days_until_expiry,
    if(c.expiry_date < today(), 1, 0) AS is_expired,
    if(c.expiry_date >= today() AND c.expiry_date <= today() + 7, 1, 0) AS expires_within_7d,
    if(c.expiry_date >= today() AND c.expiry_date <= today() + 30, 1, 0) AS expires_within_30d
FROM piam.fact_compliance_status c
INNER JOIN piam.dim_person p ON c.person_id = p.person_id AND c.tenant_id = p.tenant_id;

-- Recent events (joined)
CREATE OR REPLACE VIEW piam.v_recent_events AS
SELECT
    e.event_id,
    e.tenant_id,
    e.event_time,
    e.badge_id,
    e.person_id,
    coalesce(p.first_name, 'Unknown') AS first_name,
    coalesce(p.last_name, 'Badge') AS last_name,
    concat(coalesce(p.first_name, 'Unknown'), ' ', coalesce(p.last_name, e.badge_id)) AS person_name,
    coalesce(p.department, '') AS department,
    coalesce(p.person_type, 'UNKNOWN') AS person_type,
    p.is_contractor,
    p.contractor_company,
    e.site_id,
    s.site_name,
    e.location_id,
    l.location_name,
    l.building,
    l.floor,
    l.zone,
    e.direction,
    e.result,
    e.event_type,
    e.deny_reason,
    e.pacs_source,
    e.suspicious_flag,
    e.suspicious_reason,
    e.raw_payload
FROM piam.fact_access_events e
LEFT JOIN piam.dim_person p ON e.person_id = p.person_id AND e.tenant_id = p.tenant_id
LEFT JOIN piam.dim_site s ON e.site_id = s.site_id AND e.tenant_id = s.tenant_id
LEFT JOIN piam.dim_location l ON e.location_id = l.location_id AND e.tenant_id = l.tenant_id
ORDER BY e.event_time DESC;

-- Freshness check
CREATE OR REPLACE VIEW piam.v_freshness AS
SELECT
    tenant_id,
    max(event_time) AS latest_event,
    dateDiff('second', max(event_time), now()) AS age_seconds,
    countIf(event_time > now() - INTERVAL 5 MINUTE) AS events_last_5m
FROM piam.fact_access_events
WHERE event_time > now() - INTERVAL 1 HOUR
GROUP BY tenant_id;

-- Recent events (bounded to 24h for dashboard performance)
CREATE OR REPLACE VIEW piam.v_recent_events_24h AS
SELECT * FROM piam.v_recent_events
WHERE event_time > now() - INTERVAL 24 HOUR;

-- Insight: Deny spikes vs baseline
CREATE OR REPLACE VIEW piam.v_insight_deny_spikes AS
WITH
    current_data AS (
        SELECT
            tenant_id,
            location_id,
            countIf(result = 'DENY') AS current_denies,
            count() AS current_events
        FROM piam.fact_access_events
        WHERE event_time > now() - INTERVAL 60 MINUTE
        GROUP BY tenant_id, location_id
    ),
    baseline AS (
        SELECT tenant_id, location_id, avg_denies_per_hour, stddev_denies
        FROM piam.rollup_baseline_hour_of_week
        WHERE hour_of_week = ((toDayOfWeek(now()) - 1) * 24 + toHour(now()))
          AND location_id != ''
    )
SELECT
    c.tenant_id,
    c.location_id,
    l.location_name,
    l.building,
    c.current_denies,
    coalesce(b.avg_denies_per_hour, 0) AS baseline_denies,
    if(coalesce(b.avg_denies_per_hour, 0) > 0,
       round(c.current_denies / b.avg_denies_per_hour, 1),
       c.current_denies) AS spike_ratio,
    'DENY_SPIKE' AS insight_type
FROM current_data c
LEFT JOIN baseline b ON c.tenant_id = b.tenant_id AND c.location_id = b.location_id
LEFT JOIN piam.dim_location l ON c.location_id = l.location_id AND c.tenant_id = l.tenant_id
WHERE c.current_denies >= 3
  AND (b.avg_denies_per_hour IS NULL OR c.current_denies > b.avg_denies_per_hour * 1.5)
ORDER BY c.current_denies DESC
LIMIT 5;
