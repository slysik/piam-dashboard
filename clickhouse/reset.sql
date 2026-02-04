-- Reset script: Drop all PIAM objects for clean schema apply
-- This removes synthetic demo data only (regenerate with: make generate)

DROP VIEW IF EXISTS piam.v_kpi_current;
DROP VIEW IF EXISTS piam.v_timeseries_minute;
DROP VIEW IF EXISTS piam.v_door_hotspots;
DROP VIEW IF EXISTS piam.v_connector_health_latest;
DROP VIEW IF EXISTS piam.v_compliance_summary;
DROP VIEW IF EXISTS piam.v_recent_events_24h;
DROP VIEW IF EXISTS piam.v_recent_events;
DROP VIEW IF EXISTS piam.v_freshness;
DROP VIEW IF EXISTS piam.v_insight_deny_spikes;
DROP VIEW IF EXISTS piam.v_access_hygiene;
DROP VIEW IF EXISTS piam.v_governance_entitlements;
DROP VIEW IF EXISTS piam.v_access_request_funnel;
DROP VIEW IF EXISTS piam.v_executive_risk;
DROP TABLE IF EXISTS piam.mv_rollup_access_minute;
DROP TABLE IF EXISTS piam.mv_rollup_door_hour;
DROP TABLE IF EXISTS piam.rollup_access_minute;
DROP TABLE IF EXISTS piam.rollup_door_hour;
DROP TABLE IF EXISTS piam.rollup_baseline_hour_of_week;
DROP TABLE IF EXISTS piam.fact_access_events;
DROP TABLE IF EXISTS piam.fact_connector_health;
DROP TABLE IF EXISTS piam.fact_compliance_status;
DROP TABLE IF EXISTS piam.fact_access_requests;
DROP TABLE IF EXISTS piam.dim_entitlement;
DROP TABLE IF EXISTS piam.dim_person;
DROP TABLE IF EXISTS piam.dim_location;
DROP TABLE IF EXISTS piam.dim_site;
DROP TABLE IF EXISTS piam.dim_tenant;
