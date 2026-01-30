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
    site_type       LowCardinality(String),
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
    location_type   LowCardinality(String),
    door_type       LowCardinality(String),
    building        String,
    floor           Int16 DEFAULT 1,
    zone            LowCardinality(String),
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
    person_type     LowCardinality(String),
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
    access_level    LowCardinality(String),
    schedule_type   LowCardinality(String),
    valid_from      DateTime64(3),
    valid_until     Nullable(DateTime64(3)),
    approval_type   LowCardinality(String),
    approved_by     Nullable(String),
    status          LowCardinality(String),
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
    direction           LowCardinality(String),
    result              LowCardinality(String),
    event_type          LowCardinality(String),
    deny_reason         Nullable(String),
    deny_code           Nullable(String),

    -- Source
    pacs_source         LowCardinality(String),
    pacs_event_id       String,
    raw_payload         String,

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
    status              LowCardinality(String),
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
    requirement_type    LowCardinality(String),
    requirement_name    String,
    status              LowCardinality(String),
    issue_date          Nullable(Date),
    expiry_date         Nullable(Date),
    issuing_authority   Nullable(String),
    certificate_number  Nullable(String),
    last_checked        DateTime64(3),
    checked_by          LowCardinality(String),
    notes               Nullable(String),
    evidence_url        Nullable(String)
)
ENGINE = ReplacingMergeTree(last_checked)
ORDER BY (tenant_id, person_id, requirement_type);
