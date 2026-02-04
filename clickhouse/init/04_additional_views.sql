-- =============================================================================
-- PIAM Demo Schema - Part 4: Additional Views
-- Requires: 01_schema.sql to be applied first
-- =============================================================================

-- =============================================================================
-- MISSING TABLE: fact_access_requests
-- =============================================================================

CREATE TABLE IF NOT EXISTS piam.fact_access_requests
(
    request_id          String,
    tenant_id           LowCardinality(String),
    person_id           String,
    requester_id        String,
    location_id         String,

    -- Request details
    request_type        LowCardinality(String),  -- 'new_access', 'modification', 'removal', 'temporary'
    access_level        LowCardinality(String),
    justification       String,

    -- Workflow
    status              LowCardinality(String),  -- 'submitted', 'pending_approval', 'approved', 'rejected', 'provisioned', 'cancelled'
    submitted_at        DateTime64(3),
    approved_at         Nullable(DateTime64(3)),
    provisioned_at      Nullable(DateTime64(3)),
    rejected_at         Nullable(DateTime64(3)),

    -- SLA tracking
    sla_hours           UInt16 DEFAULT 24,
    within_sla          UInt8 DEFAULT 1,

    -- Approval chain
    approver_id         String DEFAULT '',
    approval_notes      String DEFAULT '',
    rejection_reason    String DEFAULT '',

    created_at          DateTime64(3) DEFAULT now64(3),
    updated_at          DateTime64(3) DEFAULT now64(3)
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (tenant_id, request_id);

-- =============================================================================
-- VIEW: v_access_hygiene - Lifecycle exceptions
-- =============================================================================

CREATE OR REPLACE VIEW piam.v_access_hygiene AS
SELECT
    tenant_id,
    person_id,
    concat(first_name, ' ', last_name) AS full_name,
    department,
    person_type,
    badge_status,
    -- Derive hr_status from termination_date
    if(termination_date IS NOT NULL AND termination_date <= today(), 'terminated', 'active') AS hr_status,
    termination_date,
    last_access AS last_access_time,
    dateDiff('day', coalesce(last_access, toDateTime64('1970-01-01', 3)), now()) AS days_since_access,
    multiIf(
        termination_date IS NOT NULL AND termination_date <= today() AND badge_status = 'ACTIVE', 'terminated_active_badge',
        is_contractor = 1 AND termination_date IS NOT NULL AND termination_date < today(), 'contractor_expired',
        last_access IS NOT NULL AND dateDiff('day', last_access, now()) > 90, 'dormant_access',
        termination_date IS NULL AND badge_status = 'DISABLED', 'orphan_badge',
        'normal'
    ) AS exception_type
FROM piam.dim_person
WHERE multiIf(
    termination_date IS NOT NULL AND termination_date <= today() AND badge_status = 'ACTIVE', 'terminated_active_badge',
    is_contractor = 1 AND termination_date IS NOT NULL AND termination_date < today(), 'contractor_expired',
    last_access IS NOT NULL AND dateDiff('day', last_access, now()) > 90, 'dormant_access',
    termination_date IS NULL AND badge_status = 'DISABLED', 'orphan_badge',
    'normal'
) != 'normal';

-- =============================================================================
-- VIEW: v_governance_entitlements - Entitlements with grant details
-- =============================================================================

CREATE OR REPLACE VIEW piam.v_governance_entitlements AS
WITH last_access AS (
    SELECT
        tenant_id,
        person_id,
        location_id,
        max(event_time) AS last_used
    FROM piam.fact_access_events
    GROUP BY tenant_id, person_id, location_id
)
SELECT
    e.tenant_id AS tenant_id,
    e.entitlement_id AS entitlement_id,
    e.person_id AS person_id,
    concat(p.first_name, ' ', p.last_name) AS person_name,
    e.location_id AS zone_id,
    l.location_name AS zone_name,
    e.approval_type AS grant_type,
    e.approved_by AS granted_by,
    e.created_at AS granted_at,
    e.valid_until AS expires_at,
    la.last_used AS last_used,
    if(e.valid_until IS NOT NULL AND e.valid_until < now() + INTERVAL 7 DAY, 1, 0) AS expiring_soon,
    e.approval_type AS approval_chain,
    if(e.status IN ('ACTIVE', ''), 1, 0) AS is_active
FROM piam.dim_entitlement e
LEFT JOIN piam.dim_person p ON e.person_id = p.person_id AND e.tenant_id = p.tenant_id
LEFT JOIN piam.dim_location l ON e.location_id = l.location_id AND e.tenant_id = l.tenant_id
LEFT JOIN last_access la ON e.person_id = la.person_id AND e.location_id = la.location_id AND e.tenant_id = la.tenant_id
WHERE e.status IN ('ACTIVE', '')  -- Include empty status as active
  AND (e.valid_until IS NULL OR e.valid_until > now());

-- =============================================================================
-- VIEW: v_access_request_funnel - Request workflow metrics
-- =============================================================================

CREATE OR REPLACE VIEW piam.v_access_request_funnel AS
SELECT
    tenant_id,
    count() AS total_submitted,
    countIf(status IN ('approved', 'provisioned')) AS total_approved,
    countIf(status = 'provisioned') AS total_provisioned,
    countIf(status = 'rejected') AS total_rejected,
    countIf(status IN ('submitted', 'pending_approval')) AS total_pending,
    round(countIf(status IN ('approved', 'provisioned')) * 100.0 / nullIf(count(), 0), 1) AS approval_rate,
    round(countIf(within_sla = 1) * 100.0 / nullIf(count(), 0), 1) AS sla_rate
FROM piam.fact_access_requests
WHERE submitted_at >= now() - INTERVAL 30 DAY
GROUP BY tenant_id;

-- =============================================================================
-- VIEW: v_executive_risk - Executive-level risk KPIs
-- =============================================================================

CREATE OR REPLACE VIEW piam.v_executive_risk AS
WITH event_stats AS (
    SELECT
        tenant_id,
        countIf(event_time >= now() - INTERVAL 24 HOUR AND result = 'DENY') * 100.0 /
            nullIf(countIf(event_time >= now() - INTERVAL 24 HOUR), 0) AS deny_rate_24h,
        countIf(event_time >= now() - INTERVAL 24 HOUR AND suspicious_flag = 1) AS suspicious_24h,
        countIf(event_time >= now() - INTERVAL 24 HOUR AND suspicious_flag = 1) * 1.0 /
            nullIf(countIf(event_time >= now() - INTERVAL 24 HOUR), 0) AS suspicious_rate
    FROM piam.fact_access_events
    GROUP BY tenant_id
),
connector_stats AS (
    SELECT
        tenant_id,
        count(DISTINCT connector_id) AS connector_count
    FROM piam.fact_connector_health
    GROUP BY tenant_id
),
person_stats AS (
    SELECT
        tenant_id,
        countIf(badge_status = 'ACTIVE' AND (termination_date IS NULL OR termination_date > today())) * 100.0 /
            nullIf(count(), 0) AS compliance_rate
    FROM piam.dim_person
    GROUP BY tenant_id
)
SELECT
    e.tenant_id AS tenant_id,
    round(least(100, coalesce(e.deny_rate_24h, 0) * 0.3 + coalesce(e.suspicious_rate, 0) * 50 + coalesce(e.suspicious_24h, 0) * 0.5), 0) AS overall_risk_score,
    coalesce(p.compliance_rate, 100) AS compliance_rate,
    coalesce(e.suspicious_24h, 0) AS open_incidents,
    coalesce(c.connector_count, 0) AS active_sites
FROM event_stats e
LEFT JOIN connector_stats c ON e.tenant_id = c.tenant_id
LEFT JOIN person_stats p ON e.tenant_id = p.tenant_id;
