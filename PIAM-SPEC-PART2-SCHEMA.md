# PIAM Analytics Demo — Build Specification (Part 2 of 4)
# ClickHouse Schema

---

## Task 2.1: Create Schema DDL (Dimensions & Facts)

**File:** `piam-demo/clickhouse/init/01_schema.sql`

```sql
-- =============================================================================
-- PIAM Demo Schema - Part 1: Dimensions and Facts
-- =============================================================================

CREATE DATABASE IF NOT EXISTS piam;

-- =============================================================================
-- DIMENSION TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS piam.dim_tenant
(
    tenant_id       String,
    tenant_name     String,
    industry        LowCardinality(String),
    timezone        String DEFAULT 'America/New_York',
    created_at      DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
ORDER BY tenant_id;

CREATE TABLE IF NOT EXISTS piam.dim_site
(
    site_id         String,
    tenant_id       String,
    site_name       String,
    site_type       LowCardinality(String),  -- HQ, BRANCH, WAREHOUSE, DATACENTER, CONSTRUCTION
    address         String,
    city            String,
    state           String,
    country         String DEFAULT 'USA',
    lat             Float64,
    lon             Float64,
    timezone        String DEFAULT 'America/New_York',
    created_at      DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
ORDER BY (tenant_id, site_id);

CREATE TABLE IF NOT EXISTS piam.dim_location
(
    location_id     String,
    site_id         String,
    tenant_id       String,
    location_name   String,
    location_type   LowCardinality(String),  -- DOOR, GATE, TURNSTILE
    door_type       LowCardinality(String),  -- ENTRY, EXIT, BIDIRECTIONAL, RESTRICTED
    building        String,
    floor           Int16 DEFAULT 1,
    zone            LowCardinality(String),  -- LOBBY, OFFICE, WAREHOUSE, RESTRICTED
    lat             Float64,
    lon             Float64,
    is_high_risk    UInt8 DEFAULT 0,
    is_emergency_exit UInt8 DEFAULT 0,
    pacs_controller_id  String,
    created_at      DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
ORDER BY (tenant_id, site_id, location_id);

CREATE TABLE IF NOT EXISTS piam.dim_person
(
    person_id       String,
    tenant_id       String,
    badge_id        String,
    first_name      String,
    last_name       String,
    email           String,
    phone           Nullable(String),
    department      LowCardinality(String),
    job_title       String,
    manager_id      Nullable(String),
    person_type     LowCardinality(String),  -- EMPLOYEE, CONTRACTOR, VISITOR
    is_contractor   UInt8 DEFAULT 0,
    contractor_company  Nullable(String),
    hire_date       Date,
    termination_date    Nullable(Date),
    badge_status    LowCardinality(String) DEFAULT 'ACTIVE',
    last_access     Nullable(DateTime64(3)),
    created_at      DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
ORDER BY (tenant_id, person_id);

ALTER TABLE piam.dim_person ADD INDEX IF NOT EXISTS idx_badge_id badge_id TYPE bloom_filter GRANULARITY 4;

CREATE TABLE IF NOT EXISTS piam.dim_entitlement
(
    entitlement_id  String,
    tenant_id       String,
    person_id       String,
    location_id     String,
    access_level    LowCardinality(String),  -- STANDARD, RESTRICTED, TEMPORARY
    schedule_type   LowCardinality(String),  -- ALWAYS, BUSINESS_HOURS, CUSTOM
    valid_from      DateTime64(3),
    valid_until     Nullable(DateTime64(3)),
    approval_type   LowCardinality(String),  -- AUTO, MANAGER, SECURITY
    approved_by     Nullable(String),
    status          LowCardinality(String),  -- ACTIVE, EXPIRED, REVOKED
    revocation_reason   Nullable(String),
    created_at      DateTime64(3) DEFAULT now64(3),
    updated_at      DateTime64(3) DEFAULT now64(3)
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (tenant_id, person_id, location_id, entitlement_id);

-- =============================================================================
-- FACT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS piam.fact_access_events
(
    event_id            String,
    tenant_id           String,
    event_time          DateTime64(3),
    received_time       DateTime64(3) DEFAULT now64(3),
    
    -- Who
    person_id           Nullable(String),
    badge_id            String,
    
    -- Where
    site_id             String,
    location_id         String,
    
    -- What
    direction           LowCardinality(String),  -- IN, OUT
    result              LowCardinality(String),  -- GRANT, DENY
    event_type          LowCardinality(String),  -- BADGE_READ, REX, FORCED
    deny_reason         Nullable(String),
    deny_code           Nullable(String),
    
    -- Source
    pacs_source         LowCardinality(String),  -- LENEL, CCURE, GENETEC
    pacs_event_id       String,
    raw_payload         String,  -- JSON
    
    -- Analytics
    suspicious_flag     UInt8 DEFAULT 0,
    suspicious_reason   Nullable(String),
    suspicious_score    Float32 DEFAULT 0,
    
    processed_at        DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (tenant_id, event_time, location_id, event_id)
TTL event_time + INTERVAL 90 DAY;

ALTER TABLE piam.fact_access_events ADD INDEX IF NOT EXISTS idx_person_id person_id TYPE bloom_filter GRANULARITY 4;
ALTER TABLE piam.fact_access_events ADD INDEX IF NOT EXISTS idx_badge_id badge_id TYPE bloom_filter GRANULARITY 4;
ALTER TABLE piam.fact_access_events ADD INDEX IF NOT EXISTS idx_result result TYPE set(2) GRANULARITY 4;

CREATE TABLE IF NOT EXISTS piam.fact_connector_health
(
    tenant_id           String,
    connector_id        String,
    connector_name      String,
    pacs_type           LowCardinality(String),
    pacs_version        Nullable(String),
    check_time          DateTime64(3),
    status              LowCardinality(String),  -- HEALTHY, DEGRADED, DOWN
    latency_ms          UInt32,
    events_per_minute   Float32,
    error_count_1h      UInt32 DEFAULT 0,
    last_event_time     Nullable(DateTime64(3)),
    error_message       Nullable(String),
    error_code          Nullable(String),
    endpoint_url        Nullable(String),
    last_successful_sync    Nullable(DateTime64(3))
)
ENGINE = MergeTree()
ORDER BY (tenant_id, connector_id, check_time)
TTL check_time + INTERVAL 7 DAY;

CREATE TABLE IF NOT EXISTS piam.fact_compliance_status
(
    tenant_id           String,
    person_id           String,
    requirement_type    LowCardinality(String),  -- SAFETY_TRAINING, BACKGROUND_CHECK, NDA
    requirement_name    String,
    status              LowCardinality(String),  -- COMPLIANT, NON_COMPLIANT, EXPIRED
    issue_date          Nullable(Date),
    expiry_date         Nullable(Date),
    issuing_authority   Nullable(String),
    certificate_number  Nullable(String),
    last_checked        DateTime64(3),
    checked_by          LowCardinality(String),  -- SYSTEM, MANUAL
    notes               Nullable(String),
    evidence_url        Nullable(String)
)
ENGINE = ReplacingMergeTree(last_checked)
ORDER BY (tenant_id, person_id, requirement_type);
```

---

## Task 2.2: Create Rollups and Views DDL

**File:** `piam-demo/clickhouse/init/02_rollups.sql`

```sql
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
    hour_of_week        UInt8,   -- 0-167
    day_of_week         UInt8,   -- 1=Mon, 7=Sun
    hour_of_day         UInt8,   -- 0-23
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
    -- 15 min
    countIf(event_time > now() - INTERVAL 15 MINUTE) AS events_15m,
    countIf(event_time > now() - INTERVAL 15 MINUTE AND result = 'GRANT') AS grants_15m,
    countIf(event_time > now() - INTERVAL 15 MINUTE AND result = 'DENY') AS denies_15m,
    round(if(countIf(event_time > now() - INTERVAL 15 MINUTE) > 0,
       countIf(event_time > now() - INTERVAL 15 MINUTE AND result = 'DENY') * 100.0 / 
       countIf(event_time > now() - INTERVAL 15 MINUTE), 0), 1) AS deny_rate_15m,
    countIf(event_time > now() - INTERVAL 15 MINUTE AND suspicious_flag = 1) AS suspicious_15m,
    -- 60 min
    countIf(event_time > now() - INTERVAL 60 MINUTE) AS events_60m,
    countIf(event_time > now() - INTERVAL 60 MINUTE AND result = 'DENY') AS denies_60m,
    countIf(event_time > now() - INTERVAL 60 MINUTE AND suspicious_flag = 1) AS suspicious_60m,
    -- 24h
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
-- Use this as primary dataset instead of v_recent_events to prevent unbounded scans
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
```

---

## Task 2.3: Create Baselines Computation DDL

**File:** `piam-demo/clickhouse/init/03_baselines.sql`

```sql
-- =============================================================================
-- PIAM Demo - Baseline Computation
-- Run after data load: docker exec -i piam-clickhouse clickhouse-client --database=piam < 03_baselines.sql
-- =============================================================================

-- Clear existing baselines
TRUNCATE TABLE IF EXISTS piam.rollup_baseline_hour_of_week;

-- Compute site-level baselines (location_id = '')
INSERT INTO piam.rollup_baseline_hour_of_week
SELECT
    tenant_id,
    site_id,
    '' AS location_id,
    ((toDayOfWeek(toDate(hour)) - 1) * 24 + toHour(hour)) AS hour_of_week,
    toDayOfWeek(toDate(hour)) AS day_of_week,
    toHour(hour) AS hour_of_day,
    round(avg(total_events), 2) AS avg_events_per_hour,
    round(avg(grants), 2) AS avg_grants_per_hour,
    round(avg(denies), 2) AS avg_denies_per_hour,
    round(if(sum(total_events) > 0, sum(denies) * 100.0 / sum(total_events), 0), 2) AS avg_deny_rate,
    round(avg(suspicious), 2) AS avg_suspicious,
    round(stddevPop(total_events), 2) AS stddev_events,
    round(stddevPop(denies), 2) AS stddev_denies,
    toUInt8(count()) AS sample_weeks,
    now64(3) AS computed_at
FROM piam.rollup_door_hour
WHERE hour >= now() - INTERVAL 28 DAY
  AND hour < toStartOfHour(now())
GROUP BY tenant_id, site_id, hour_of_week, day_of_week, hour_of_day
HAVING count() >= 2;

-- Compute door-level baselines
INSERT INTO piam.rollup_baseline_hour_of_week
SELECT
    tenant_id,
    site_id,
    location_id,
    ((toDayOfWeek(toDate(hour)) - 1) * 24 + toHour(hour)) AS hour_of_week,
    toDayOfWeek(toDate(hour)) AS day_of_week,
    toHour(hour) AS hour_of_day,
    round(avg(total_events), 2) AS avg_events_per_hour,
    round(avg(grants), 2) AS avg_grants_per_hour,
    round(avg(denies), 2) AS avg_denies_per_hour,
    round(if(sum(total_events) > 0, sum(denies) * 100.0 / sum(total_events), 0), 2) AS avg_deny_rate,
    round(avg(suspicious), 2) AS avg_suspicious,
    round(stddevPop(total_events), 2) AS stddev_events,
    round(stddevPop(denies), 2) AS stddev_denies,
    toUInt8(count()) AS sample_weeks,
    now64(3) AS computed_at
FROM piam.rollup_door_hour
WHERE hour >= now() - INTERVAL 28 DAY
  AND hour < toStartOfHour(now())
GROUP BY tenant_id, site_id, location_id, hour_of_week, day_of_week, hour_of_day
HAVING count() >= 2;

-- Verification
SELECT 
    'Baselines computed' AS status,
    count() AS total_rows,
    countIf(location_id = '') AS site_level,
    countIf(location_id != '') AS door_level,
    uniqExact(tenant_id) AS tenants
FROM piam.rollup_baseline_hour_of_week;
```

---

## Task 2.4: Create empty data directory

**File:** `piam-demo/clickhouse/data/.gitkeep`

```
# This directory holds generated CSV files (gitignored except this file)
```

---

## Acceptance Criteria (Part 2)

After completing Part 2 and running `make up`:

1. **Schema created:**
   ```bash
   make shell-ch
   SHOW TABLES;
   # Should list: dim_tenant, dim_site, dim_location, dim_person, dim_entitlement,
   #              fact_access_events, fact_connector_health, fact_compliance_status,
   #              rollup_access_minute, rollup_door_hour, rollup_baseline_hour_of_week
   #              + materialized views
   ```

2. **Views exist:**
   ```sql
   SELECT * FROM piam.v_kpi_current;
   SELECT * FROM piam.v_door_hotspots LIMIT 1;
   SELECT * FROM piam.v_connector_health_latest;
   -- All should execute (return empty before data load)
   ```

3. **Schema matches CSV headers** (verified after data generation)

---

**Next:** Continue to Part 3 (Data Generation)
