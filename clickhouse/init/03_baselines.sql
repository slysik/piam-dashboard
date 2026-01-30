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
