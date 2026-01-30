# PIAM Analytics Demo — Complete Build Specification

**For Local CLI Execution**

---

## Tested Versions

| Component | Version | Notes |
|-----------|---------|-------|
| Docker Desktop | 4.25+ | `docker --version` |
| Docker Compose | v2.20+ | Plugin or standalone |
| Superset | 3.1.0 | Image: `apache/superset:3.1.0` |
| ClickHouse | 24.1 | Image: `clickhouse/clickhouse-server:24.1` |
| clickhouse-connect | 0.7+ | Installed in Superset container |
| Node.js | 18.17+ LTS | For Next.js backup site |
| Python | 3.10+ | For data generation |

---

## Before You Start

> **Docker Compose Compatibility (READ FIRST)**
>
> The Makefile uses `docker-compose` (standalone). If your system only has the Docker Compose plugin, **set this alias before running any commands:**
>
> ```bash
> alias docker-compose='docker compose'
> ```
>
> Add to `~/.bashrc` or `~/.zshrc` to persist across sessions. All commands in this document assume this alias is set.

---

## Quick Reference

| Part | Contents | File |
|------|----------|------|
| **Part 1** | Project setup, Docker, Makefile, scripts | `PIAM-SPEC-PART1-SETUP.md` |
| **Part 2** | ClickHouse schema (DDL files) | `PIAM-SPEC-PART2-SCHEMA.md` |
| **Part 3** | Python data generators | `PIAM-SPEC-PART3-DATAGEN.md` |
| **Part 4** | Superset dashboards + Vercel backup | `PIAM-SPEC-PART4-DASHBOARDS.md` |

---

## Prerequisites

### Required Tools

| Tool | Minimum Version | Notes |
|------|-----------------|-------|
| Docker | 24.0+ | `docker --version` |
| Docker Compose | v2.20+ | `docker compose version` (plugin) or `docker-compose --version` (standalone) |
| make | GNU Make 3.81+ | `make --version` |
| curl | 7.0+ | For health checks |
| bash | 3.2+ / zsh | macOS ships bash 3.2; scripts are compatible. zsh also works. |
| Python | 3.10+ | `python3 --version` |
| pip | 23.0+ | `pip --version` |
| Node.js | 18.17+ (LTS) | `node --version` |
| npm | 9.0+ | `npm --version` |
| Vercel CLI | 32.0+ | `npm i -g vercel` (optional, for deploy) |

### System Resources

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 5 GB free | 10 GB free |

### Platform Notes (macOS)

**Apple Silicon (M1/M2/M3/M4):**
- ClickHouse image supports ARM64 natively — performance is excellent
- Rosetta 2 emulation is not required
- If experiencing high memory usage, swap datasets to use rollup-based views (see Performance Toggle section below)

### Network Requirements

- Outbound internet for: `pip install`, `npm install`, `npx`, Docker image pulls
- **Mapbox API key** — Required for deck.gl map basemap in **both** Superset and Next.js backup site
  - Without Mapbox: Map renders data points but no basemap tiles (sparse but functional)
- Vercel deploy (optional)

### Port Availability

Ensure these ports are free before starting:

```bash
# Check ports (macOS/Linux)
lsof -i :8123 -i :9000 -i :8088 -i :3000

# Alternative if lsof unavailable (Linux)
ss -lntp | grep -E '8123|9000|8088|3000'
```

| Port | Service |
|------|---------|
| 8123 | ClickHouse HTTP |
| 9000 | ClickHouse Native |
| 8088 | Superset |
| 3000 | Next.js backup site (dev) |

---

## Common Pitfalls

> **ClickHouse CLI exit command:** Use `exit` or `Ctrl+D` to exit `clickhouse-client`.
> The `\q` command is PostgreSQL syntax and will not work.

> **Superset DB connection required first:** You must create the "PIAM ClickHouse" database connection in Superset **before** creating datasets. Datasets created without a valid connection will fail.

> **Admin users are subject to RLS:** In Superset, RLS rules apply to Admin users too. If you enable RLS and see empty data, verify the demo user's role has the correct filter rules.

> **v_recent_events is unbounded:** This view has no time filter and scans all events. As data grows, it can slow dashboards. Recommend setting a 24–48h time filter on any chart using this view, plus row limit 50–100.

> **Mapbox fallback:** Without a Mapbox token, the deck.gl map renders data points on a blank background. This looks sparse but is functional. Use larger point sizes and clear tooltips if demoing without basemap.

---

## Build Order

Execute tasks in this order:

### Phase 1: Infrastructure (Part 1)

> **⚠️ First-run timing:** Superset takes 60–90 seconds on first init. Be patient after `make up`.
>
> **⚠️ DDL Timing — Choose Your Path:**
>
> ClickHouse init scripts only run automatically on **first start** with empty data dir. Choose one approach:
>
> | Option | When to Use | Steps |
> |--------|-------------|-------|
> | **A: Create DDL first (recommended)** | Fresh setup | Complete Parts 1-2, then run `make up` |
> | **B: Start services first** | Testing infrastructure | Run `make up` now, then `make ddl-apply` after creating DDL files |
>
> Option A is cleaner for first-time setup. Option B is useful if you want to verify Docker works before writing SQL files.

1. Create project directory structure
2. Create `.gitignore`, `.env.example`, `README.md`
3. Create `docker-compose.yml`
4. Create `Makefile`
5. Create `scripts/health-check.sh`
6. Create `scripts/load-data.sh`
7. Create `superset/superset_config.py`
8. **(Option A):** Wait to run `make up` until after Phase 2 DDL files exist
   **(Option B):** Run `make up` now to verify services (60–90s for Superset init)

### Phase 2: Database Schema (Part 2)

1. Create `clickhouse/init/01_schema.sql`
2. Create `clickhouse/init/02_rollups.sql`
3. Create `clickhouse/init/03_baselines.sql`
4. Create `clickhouse/data/.gitkeep`
5. **If Option A (recommended):** Now run `make up` — DDL will auto-apply on first start
   **If Option B:** Run `make ddl-apply` to apply DDL to running container
6. Verify schema: `make shell-ch` → `SHOW TABLES;` → `exit`

> **If DDL apply fails or you need to re-apply:**
> ```bash
> make ddl-apply
> ```

### Phase 3: Data Generation (Part 3)
1. Create `datagen/requirements.txt`
2. Create `datagen/config.yaml`
3. Create `datagen/generate.py`
4. Create `datagen/trickle.py`
5. Create `datagen/replay.py`
6. Run `make generate` to create and load data
7. Verify: `make shell-ch` then `SELECT count() FROM fact_access_events;` (expect 100k–300k rows)

### Phase 4: Dashboards (Part 4)

**Order matters:** Database connection → Datasets → Dashboards

1. **Create Superset database connection first:**
   - Open http://localhost:8088, login (admin/admin)
   - Settings → Database Connections → + Database
   - Select "ClickHouse Connect"
   - Host: `clickhouse`, Port: `8123`, Database: `piam`, User: `default`, Password: (empty)
   - Test connection, save as "PIAM ClickHouse"

2. Create Superset datasets (manual UI — see dataset checklist below)
3. Enable auto-refresh on dashboards (15–30s)
4. Create Command Center dashboard (manual UI)
5. Create Compliance dashboard (manual UI)
6. Initialize Next.js backup site from scratch:
   ```bash
   npx create-next-app@14 backup-site --typescript --tailwind --eslint --app=false --src-dir --import-alias="@/*"
   cd backup-site && npm install recharts react-map-gl mapbox-gl @types/mapbox-gl
   ```
   - The file tree below shows the **target state** after creating all components
   - `backup-site/` does not exist initially; scaffold fresh per Part 4 instructions
7. **Create `backup-site/.env.local`** with `NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx`
   - Required for map basemap — Next.js reads from `.env.local` in its own directory
   - Without it: map shows data points on gray background (functional but sparse)
8. Create all backup-site components per Part 4
9. Deploy to Vercel: `vercel login && vercel link && vercel --prod --confirm`
   - Use `--confirm` to avoid interactive prompts during live demos

### Superset Datasets Checklist

**Prerequisites:**
- [ ] "PIAM ClickHouse" database connection created and tested
- [ ] Connection shows as "OK" in Database Connections list

**Create these datasets** (Data → Datasets → + Dataset):

| Dataset | Purpose | Key Metrics | RLS Filter |
|---------|---------|-------------|------------|
| `v_kpi_current` | KPI tiles | `events_15m`, `denies_15m`, `deny_rate_15m` (percent 0-100), `suspicious_15m` | `tenant_id` |
| `v_timeseries_minute` | Time series chart | `total_events`, `grants`, `denies`, `suspicious` | `tenant_id` |
| `v_door_hotspots` | Map | `total_events`, `denies`, `deny_rate_pct` (percent 0-100), `suspicious` | `tenant_id` |
| `v_recent_events` | Events table | N/A (set **row limit 50–100**) | `tenant_id` |
| `v_connector_health_latest` | Connector health | `latency_ms`, `events_per_minute` | `tenant_id` |
| `v_compliance_summary` | Compliance dashboard | COUNT by status | `tenant_id` |
| `v_insight_deny_spikes` | Insights panel | `current_denies`, `spike_ratio` | `tenant_id` |
| `v_freshness` | Freshness indicator | `age_seconds`, `events_last_5m` | `tenant_id` |

**KPI Units Note:** `deny_rate_15m` and `deny_rate_pct` are **percentages (0–100)**, not decimals. The dashboards display "2.5%" which is the correct interpretation.

**After creating datasets:**
- [ ] Preview each dataset to verify data loads (click dataset → Preview)
- [ ] Verify Tenant Filter is mapped to **every chart** in the dashboard (Edit Dashboard → Filter Scoping)
- [ ] If using RLS, confirm rules are assigned to the demo user/role
- [ ] **Remember:** Admin users are subject to RLS too — empty previews may indicate missing RLS rules

### Freshness Indicator (Big Number Config)

Add a "Freshness" Big Number chart to the dashboard:

- **Dataset:** `v_freshness`
- **Metric:** `age_seconds`
- **Subheader:** `Data: {{ value }}s ago` (or hardcode for demo)
- **Color thresholds:** Green < 20s, Amber < 60s, Red ≥ 60s
- **Position:** Top-right corner of Command Center

### RLS Validation Workflow (Optional but Recommended)

**Choose your demo mode first:**

| Mode | Setup Effort | Demo Flow | Best For |
|------|--------------|-----------|----------|
| **Strict Isolation** | High (RLS rules per dataset) | Single tenant view, no switching | Security-conscious audience |
| **Switching Allowed** | Low (rely on dashboard filters) | Multi-tenant demo flow | Faster setup, showing multi-tenant |

**To set up Strict Isolation:**

1. **Create Superset roles:**
   - Settings → Security → List Roles → + (add role)
   - Create: `TenantAcme`, `TenantBuildRight`

2. **Add RLS rules** (Security → Row Level Security → + Rule):
   - **For each dataset**, create a rule:
     - Tables: Select the dataset (e.g., `v_kpi_current`)
     - Clause: `tenant_id = 'acme'`
     - Roles: `TenantAcme`
   - Repeat for `TenantBuildRight` with `tenant_id = 'buildright'`
   - **Apply to ALL 8 datasets** listed in the checklist above

3. **Create test users:**
   - Settings → Security → List Users → + (add user)
   - Assign each user to the appropriate role

4. **Validate:**
   - Login as test user
   - Verify they only see their tenant's data
   - Verify CSV export respects RLS (if strict RLS, consider disabling CSV export)

**For Switching Allowed (simpler setup):**
- Skip RLS setup entirely
- Rely on dashboard Tenant Filter applied to all charts
- Verify **every chart** has the Tenant Filter mapped (Edit Dashboard → Filter Scoping)

---

## Configuration Notes

### Environment Variables (.env)

Copy `.env.example` to `.env` and configure:

```bash
# Required for Superset deck.gl map basemap
MAPBOX_API_KEY=pk.your_mapbox_token_here

# Required for Next.js backup site map
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here

# Demo tenant default (env variable for scripts)
DEMO_TENANT_DEFAULT=acme
# Note: Also configure default value in Superset Dashboard → Native Filters → Tenant Filter → Default Value = 'acme'

# Rotate this if sharing beyond local demo
SUPERSET_SECRET_KEY=piam-demo-change-for-production
```

### Timezones

- Schema defaults to `America/New_York`
- ClickHouse `now()` uses **container timezone** (typically UTC in Docker)
- **Recommended:** Set explicit timezone in `docker-compose.yml`:

```yaml
services:
  clickhouse:
    environment:
      TZ: America/New_York
  superset:
    environment:
      TZ: America/New_York
```

- Verify timezone alignment:
  ```sql
  SELECT now(), toTimezone(now(), 'America/New_York');
  ```
- **Superset Dashboard Setting:** Check each dashboard's "Force UTC" toggle:
  - Edit Dashboard → Settings gear → "Force UTC for timestamps"
  - Set to **OFF** if aligning to local tenant time (America/New_York)
  - Set to **ON** if you want consistent UTC display across all viewers

### Superset Mapbox Configuration

For deck.gl "Door Hotspot Map" to render basemaps, set in `superset_config.py`:

```python
MAPBOX_API_KEY = os.environ.get('MAPBOX_API_KEY', '')
```

Or configure via Superset UI: Settings → Configuration → MAPBOX_API_KEY

**Verify Mapbox is working:**
1. In Superset, create a test deck.gl Scatterplot chart
2. If basemap tiles load, token is correctly configured
3. If only data points appear on gray/blank background, check:
   - `.env` has `MAPBOX_API_KEY=pk.xxx`
   - Container was restarted after adding key: `docker-compose restart superset`

**Fallback without Mapbox:** The map will render data points on a blank/gray background. To improve legibility:
- Increase point radius in chart config
- Use contrasting point colors (red for denies)
- Ensure tooltips show location name and deny count

### Superset Caching vs Auto-Refresh

The default `CACHE_DEFAULT_TIMEOUT=60` may mask 15–30s auto-refresh (cached data served instead of fresh queries).

**Options:**

1. **Global:** Reduce cache TTL: `CACHE_DEFAULT_TIMEOUT=15` in `superset_config.py`

2. **Per-chart (recommended for live demos):**
   - Edit chart → Advanced → Cache Timeout → `0` (disable caching)
   - **Must apply to:** Big Number KPIs, Time Series chart, Freshness indicator
   - This ensures 15–30s auto-refresh actually queries fresh data

3. Accept that some charts may lag up to 60s behind real-time

### KPI Baseline Deltas

The `v_kpi_current` view returns **current counts only** (e.g., `events_15m`, `denies_15m`).

**Baseline deltas** (e.g., "2.1× normal") must be computed. Options:

**Option A: Dashboard subheader (simple — recommended for demo)**
- Hardcode representative deltas in chart subheader: "2.1× baseline"
- In Superset Big Number config: Advanced → Subheader → Enter text like "2.1× baseline"
- Quick, works for demo, but not dynamic

**Option B: SQL Lab Virtual Dataset (dynamic)**
1. Go to SQL Lab → SQL Editor
2. Select "PIAM ClickHouse" database
3. Paste the Reference SQL pattern below
4. Run query to verify it returns data
5. Click "Save" → "Save as new" → Name: `v_kpi_with_baseline`
6. Check "Save as Virtual Dataset"
7. Use this new dataset for KPI Big Number charts with dynamic spike_ratio

**Option C: Superset Big Number with subheader templating**
- Use Superset's Jinja templating in subheader
- Example: `{{ value | round(1) }}× baseline` (requires metric to output ratio)
- More complex setup, but dynamic

**Reference SQL pattern (for Option B or SQL Lab exploration):**

```sql
-- KPI with baseline comparison (use in SQL Lab → Save as Virtual Dataset)
WITH current AS (
  SELECT * FROM v_kpi_current WHERE tenant_id = 'acme'
),
baseline AS (
  SELECT avg_denies_per_hour
  FROM rollup_baseline_hour_of_week
  WHERE tenant_id = 'acme'
    AND site_id = ''  -- Site-level baseline (location_id = '')
    AND hour_of_week = ((toDayOfWeek(now()) - 1) * 24 + toHour(now()))
)
SELECT
  c.denies_15m,
  round(b.avg_denies_per_hour / 4, 1) AS baseline_15m,  -- Adjust hourly to 15m
  round(c.denies_15m / nullIf(b.avg_denies_per_hour / 4, 0), 1) AS spike_ratio,
  concat(toString(round(c.denies_15m / nullIf(b.avg_denies_per_hour / 4, 0), 1)), '× baseline') AS spike_label
FROM current c, baseline b;
```

**Quick demo tip:** For a polished look, use the Big Number "Subheader" field to show the multiplier. Set subheader to text like "2.1× baseline ▲" with the red arrow indicating elevated.

### v_recent_events Performance

This view is intentionally **unbounded** for flexibility but can be slow with large datasets.

**Guardrails for production use:**
- Set dashboard time filter to 24–48 hours max
- Set chart row limit to 50–100
- **Recommended:** Create `v_recent_events_24h` and use it as the primary dataset:

```sql
-- Add to 02_rollups.sql
CREATE OR REPLACE VIEW piam.v_recent_events_24h AS
SELECT * FROM piam.v_recent_events
WHERE event_time > now() - INTERVAL 24 HOUR;
```

**In Superset:** Create a dataset from `v_recent_events_24h` instead of `v_recent_events` for the Recent Events table. This prevents accidental unbounded scans.

### Performance Toggle: Rollup-Based Views

`v_timeseries_minute` and `v_door_hotspots` query **raw facts** for flexibility.

For **low-resource environments**, create rollup-based alternatives:

```sql
-- Alternative: v_timeseries_minute_rollup
CREATE OR REPLACE VIEW piam.v_timeseries_minute_rollup AS
SELECT
    tenant_id,
    minute,
    total_events,
    grants,
    denies,
    suspicious
FROM piam.rollup_access_minute
WHERE minute > now() - INTERVAL 60 MINUTE;
```

Then swap the dataset in Superset to use the rollup view.

---

## Key Decisions (Changed from Original PRD)

| Original | Revised | Rationale |
|----------|---------|-----------|
| 4 tenants | 2 tenants | Sufficient for demo, less data gen complexity |
| GenAI bot | Deferred | High risk, low ROI for 15-min demo |
| Custom Demo Shell | Superset native + simple backup | Less code to build and debug |
| 15s freshness SLO | 30s acceptable | More realistic for Superset refresh |
| Floorplan overlays | Deferred | Geo maps sufficient for demo |
| Sequence strip | Deferred | Suspicious events table sufficient |

---

## Demo Flow (15 minutes)

```
0:00 - 2:00   Opening: Command Center KPIs + baseline deltas
2:00 - 5:00   Drill: Click map hotspot → filtered events
5:00 - 8:00   Evidence: Click event row → JSON payload drawer
8:00 - 10:00  Insights: Explain rule-based detection
10:00 - 12:00 Compliance: Contractor issues + CSV export
12:00 - 14:00 Multi-tenant: Switch to BuildRight
14:00 - 15:00 Wrap: Mention roadmap (mustering, GenAI)
```

### Demo Polish Tips

- **Freshness indicator:** Add a Big Number chart from `v_freshness.age_seconds` in the top-right corner
- **Scenario toggle:** Add a Markdown widget with quick links: "Live Data" | "Replay Window (last 30m)"
- **Connector health sparkline:** In backup site, show tiny latency sparkline to make degradation pop visually
- **CSV exports:** Note where to enable/disable per-chart CSV export based on audience and RLS setup (disable if strict RLS to prevent data leakage)

### Replay Incidents Narrative

When you run `make replay`, these specific incidents are injected (filter to last 30 minutes to see them):

| Incident | What to Show | Narrative |
|----------|--------------|-----------|
| **Deny spike** | 20 denies at one door in 10 minutes | "Look at Main Lobby — we're seeing 3× normal deny rate. Let me click the map hotspot to drill down." |
| **Suspicious cluster** | 5 rapid denies from same badge | "Same badge hitting the door every 30 seconds — flagged as suspicious. Could be a tailgating attempt." |
| **Connector degradation** | Lenel showing DEGRADED status | "Our Lenel connector is showing elevated latency — 450ms vs normal 45ms. Worth investigating." |

**Evidence drawer talking point:** "Two clicks gets me from the KPI to the raw PACS payload. This JSON is exactly what came from the door controller."

---

## Backup Strategy

**If Docker fails:**
1. Open Vercel backup URL (pre-warmed in browser tab)
2. Demo Next.js backup site with sample data
3. Show Evidence drawer (works with sample data)
4. Mention "live version connects to ClickHouse"

**If Vercel fails:**
1. `cd backup-site && npm run dev`
2. Open localhost:3000
3. Same demo flow with local Next.js

**If both fail (no network):**
- Consider pre-building `backup-site/.next` for offline use
- `npm run build && npm run start` requires no network after build

**Important:** `make reset` wipes Docker volumes including Superset metadata (dashboards, users).

**Before running `make reset`:**
```bash
# Save your dashboards first!
make dashboards-export
# This creates ./dashboards_backup.zip

# After reset, restore with:
make dashboards-import
```

### Superset Dashboard Export/Import

> **Tested with Superset 3.1.0** — CLI commands may vary in other versions. Check `superset --help` if commands fail.

To recover dashboards quickly after reset:

```bash
# Export (before reset) — ALWAYS do this before make reset!
docker exec piam-superset superset export-dashboards -f /app/superset_home/dashboards_backup.zip

# Copy to host
docker cp piam-superset:/app/superset_home/dashboards_backup.zip ./

# Import (after reset, once Superset is running)
docker cp ./dashboards_backup.zip piam-superset:/app/superset_home/
docker exec piam-superset superset import-dashboards -p /app/superset_home/dashboards_backup.zip
```

**If import fails:**
```bash
# Check Superset logs for error details
docker-compose logs superset --tail=50

# Common issues:
# - Database connection missing: Recreate "PIAM ClickHouse" connection first
# - Dataset mismatch: Ensure all 8 views exist in ClickHouse before import
# - Permission error: Verify admin user exists (fab create-admin may have failed)

# Manual recovery: Re-import with overwrite flag
docker exec piam-superset superset import-dashboards -p /app/superset_home/dashboards_backup.zip --overwrite
```

---

## Pre-Demo Checklist

### Quick Setup (for experienced users)

```bash
# One-liner to demo-ready state (assumes docker-compose alias set)
make quickstart
```

### Full Checklist

```bash
# ===========================================================================
# PHASE 1: ENVIRONMENT SETUP
# ===========================================================================

# 0. Ensure docker-compose alias is set (add to ~/.bashrc or ~/.zshrc)
alias docker-compose='docker compose'

# 1. Check ports are free
lsof -i :8123 -i :9000 -i :8088 -i :3000
# Alternative (Linux): ss -lntp | grep -E '8123|9000|8088|3000'

# 2. Verify Mapbox token is configured (CRITICAL for map display)
grep MAPBOX .env
# Should show: MAPBOX_API_KEY=pk.xxx

# ===========================================================================
# PHASE 2: SERVICES & DATA
# ===========================================================================

# 3. Reset everything (WARNING: wipes Superset config including dashboards)
make reset
# Note: First Superset start takes 60-90 seconds

# 4. Quick verification (one-liner health check)
make verify
# This checks: services, data counts, view health

# 5. Manual spot-check (optional, if verify passes)
make shell-ch
SELECT * FROM v_freshness;  -- Check data freshness
exit

# ===========================================================================
# PHASE 3: SUPERSET CONFIGURATION
# ===========================================================================

# 6. Open Superset
# macOS: open http://localhost:8088
# Linux: xdg-open http://localhost:8088 || echo "Open http://localhost:8088"
# Login: admin / admin

# 7. FIRST: Create/verify database connection (must do before datasets!)
# Settings → Database Connections
# Confirm "PIAM ClickHouse" exists and shows green status
# If missing: + Database → ClickHouse Connect → host: clickhouse, port: 8123, db: piam

# 8. Verify datasets exist and are queryable
# Data → Datasets
# Confirm all 8 datasets from checklist (including v_freshness)
# Click each dataset → Preview to verify data loads

# 9. Verify Tenant Filter mapping
# Edit Dashboard → Filters → Check that Tenant Filter is mapped to ALL charts

# 10. Test tenant filter
# Switch tenant dropdown: acme → buildright
# Verify data changes, no cross-tenant leakage

# 11. Verify auto-refresh is enabled (15-30s)
# Dashboard settings → Auto-refresh interval

# 12. Check chart performance
# Command Center should load in < 3 seconds
# If slow: reduce row limits, use rollup views, or increase cache

# ===========================================================================
# PHASE 4: DEMO WARMUP (60 seconds before presenting)
# ===========================================================================

# 13. Warm the cache by opening dashboards
# - Open Command Center dashboard
# - Open Compliance dashboard
# - Click through each chart once to populate cache

# 14. Start trickle (start RIGHT BEFORE demo for motion)
make trickle

# 15. Inject incidents (optional, for guaranteed demo scenarios)
make replay

# ===========================================================================
# PHASE 5: BACKUP PREPARATION
# ===========================================================================

# 16. Prepare Vercel backup (--confirm avoids prompts)
cd backup-site
vercel login
vercel link
vercel --prod --confirm
# Open Vercel URL in separate browser tab to warm cache

# 17. Final ready state
# ✅ Superset Command Center open (freshness < 30s)
# ✅ Vercel backup in separate tab (pre-warmed)
# ✅ Terminal running `make trickle`
# ✅ This checklist open for reference
```

### One-Line Health Check (quick sanity)

Run this single query to verify all 8 core views have data:

```bash
make shell-ch
SELECT view, has_data FROM (
    SELECT 'v_kpi_current' as view, count() > 0 as has_data FROM v_kpi_current
    UNION ALL SELECT 'v_timeseries_minute', count() > 0 FROM v_timeseries_minute
    UNION ALL SELECT 'v_door_hotspots', count() > 0 FROM v_door_hotspots
    UNION ALL SELECT 'v_recent_events', count() > 0 FROM v_recent_events
    UNION ALL SELECT 'v_connector_health_latest', count() > 0 FROM v_connector_health_latest
    UNION ALL SELECT 'v_compliance_summary', count() > 0 FROM v_compliance_summary
    UNION ALL SELECT 'v_insight_deny_spikes', count() > 0 FROM v_insight_deny_spikes
    UNION ALL SELECT 'v_freshness', count() > 0 FROM v_freshness
) FORMAT PrettyCompact;
exit
```

All 8 views should show `has_data = 1`. If any show `0`, check data generation.

### Tenant-Scoped Sanity Check (RLS verification)

Verify tenant isolation is working correctly:

```bash
make shell-ch
-- Should return rows for acme only
SELECT tenant_id, count() as events FROM v_kpi_current GROUP BY tenant_id FORMAT PrettyCompact;

-- Verify both tenants have distinct data
SELECT
    'acme' as tenant,
    (SELECT count() FROM fact_access_events WHERE tenant_id = 'acme') as events
UNION ALL SELECT
    'buildright',
    (SELECT count() FROM fact_access_events WHERE tenant_id = 'buildright')
FORMAT PrettyCompact;
exit
```

### Suggested `make verify` Target

The Makefile includes a comprehensive `verify` target. It checks:
1. Service health (ClickHouse + Superset responding)
2. Data counts (fact_access_events, rollups, baselines)
3. All 8 view health (has_data check)

See Part 1 for the full implementation. Quick usage:

```bash
make verify
# Expected output: all views show has_data = 1
```

---

## Troubleshooting

### ClickHouse Issues

```bash
# Check container status
docker-compose ps
docker-compose logs clickhouse

# Connect manually
docker exec -it piam-clickhouse clickhouse-client --database=piam

# Useful queries
SHOW TABLES;
SELECT count() FROM fact_access_events;
SELECT * FROM v_freshness;             -- Check data freshness

# Check for stuck mutations (should be empty or completing)
SELECT database, table, mutation_id, command, is_done
FROM system.mutations
WHERE NOT is_done
FORMAT PrettyCompact;

# Check for heavy queries (identify slow scans)
SELECT query_id, query, read_rows, elapsed
FROM system.query_log
WHERE type = 'QueryFinish' AND elapsed > 5
ORDER BY elapsed DESC
LIMIT 5
FORMAT PrettyCompact;

# Exit (NOT \q)
exit
```

**TTL Reminder:** `fact_access_events` has a 90-day TTL. If scaling beyond 30 days of demo data or retaining for longer:
```sql
-- Extend TTL to 180 days
ALTER TABLE piam.fact_access_events MODIFY TTL event_time + INTERVAL 180 DAY;
```

### Superset Issues

```bash
# Check container logs
docker-compose logs superset

# Shell into container
make shell-superset
# or: docker exec -it piam-superset bash

# Check Superset home
ls -la /app/superset_home/

# Database connection test
# In Superset UI: Settings → Database Connections → Test Connection
```

### Data Issues

```bash
# Regenerate data
make clean && make generate

# Verify row counts
make shell-ch
SELECT
    'dim_tenant' as t, count() as c FROM dim_tenant
UNION ALL SELECT 'dim_person', count() FROM dim_person
UNION ALL SELECT 'fact_access_events', count() FROM fact_access_events
UNION ALL SELECT 'rollup_door_hour', count() FROM rollup_door_hour
FORMAT PrettyCompact;
exit

# Recompute baselines manually
docker exec -i piam-clickhouse clickhouse-client --database=piam < clickhouse/init/03_baselines.sql
```

### Port Conflicts

```bash
# Find what's using a port
lsof -i :8088
# or (Linux): ss -lntp | grep 8088
kill -9 <PID>

# Or change ports in docker-compose.yml
ports:
  - "8089:8088"  # Use 8089 instead
```

### Volume Name Mismatch

`make reset` now uses `docker-compose down -v` which automatically finds and removes the correct volumes.

If volumes still persist (rare):

```bash
# List actual volume names
docker volume ls | grep -E 'clickhouse|superset'

# Remove manually
docker volume rm <actual-volume-name>

# Or use the clean-volumes target
make clean-volumes
```

### Container Name Mismatch

If commands fail with "container not found":

```bash
# Discover actual container names
docker ps --format '{{.Names}}'

# Should show: piam-clickhouse, piam-superset
# If different (e.g., piam-demo-clickhouse-1), adapt commands accordingly
# or update Makefile container_name values to match
```

### Performance Issues

- Limit time ranges in dashboard filters (last 60m vs 24h)
- Use rollup tables instead of raw facts for aggregations
- Check ClickHouse memory: `SELECT * FROM system.metrics WHERE metric LIKE '%Memory%'`
- Superset caching: verify `CACHE_CONFIG` in `superset_config.py`
- Reduce `CACHE_DEFAULT_TIMEOUT` if auto-refresh appears stale
- Set chart row limits to 50–100 for table views

### Empty Data in Superset

1. **Check database connection:** Settings → Database Connections → Test
2. **Check dataset SQL:** Data → Datasets → Click dataset → Preview
3. **Check RLS:** If RLS enabled, verify rules match demo user's role
4. **Check time filters:** Ensure dashboard time filter includes data range

---

## Files Created Summary

```
piam-demo/
├── .gitignore
├── .env.example
├── .env                    # Created from .env.example (gitignored)
├── README.md
├── docker-compose.yml
├── Makefile
├── clickhouse/
│   ├── init/
│   │   ├── 01_schema.sql
│   │   ├── 02_rollups.sql
│   │   └── 03_baselines.sql
│   └── data/
│       └── .gitkeep
├── datagen/
│   ├── requirements.txt
│   ├── config.yaml
│   ├── generate.py
│   ├── trickle.py
│   └── replay.py
├── superset/
│   └── superset_config.py
├── scripts/
│   ├── health-check.sh
│   └── load-data.sh
└── backup-site/            # Scaffolded in Phase 4 via npx create-next-app
    ├── package.json        # (does not exist until Phase 4)
    ├── .env.local          # NEXT_PUBLIC_MAPBOX_TOKEN (create manually)
    ├── vercel.json
    └── src/
        ├── pages/
        │   └── index.tsx
        ├── components/
        │   ├── Layout.tsx
        │   ├── KPIRow.tsx
        │   ├── TimeSeriesChart.tsx
        │   ├── DoorMap.tsx         # Map component (requires Mapbox token)
        │   ├── InsightsPanel.tsx   # Insights display
        │   ├── EventsTable.tsx
        │   └── EvidenceDrawer.tsx
        └── data/
            ├── sample-kpis.ts
            ├── sample-events.ts
            └── sample-insights.ts
```

---

## Success Criteria

### Infrastructure
✅ `make up` starts ClickHouse + Superset (Superset ready in ~60-90s)
✅ `make generate` creates 30 days of data for 2 tenants (100k–300k events)
✅ `make health` shows all services healthy
✅ `make verify` passes all checks (services, data counts, view health)
✅ Rollup tables populated (`rollup_door_hour`, `rollup_baseline_hour_of_week`)

### Superset Configuration
✅ "PIAM ClickHouse" database connection created and tested
✅ All **8** Superset datasets created and queryable (including `v_freshness`)
✅ Tenant Filter mapped to all charts (verified in Filter Scoping)
✅ Chart row limits set (50–100 for tables)
✅ Superset Command Center loads in < 3 seconds
✅ Auto-refresh enabled (15–30s)

### Dashboard Functionality
✅ KPIs show baseline deltas (computed in dashboard subheaders)
✅ Map shows door hotspots (data points visible even without Mapbox basemap)
✅ Evidence drawer shows raw JSON payload
✅ Tenant filter works without cross-tenant data leakage
✅ Compliance dashboard shows contractor issues
✅ Freshness indicator shows data age < 30s when trickle is running

### Backup & Demo
✅ `backup-site/.env.local` created with Mapbox token
✅ Backup site loads on Vercel (or locally via `npm run dev`)
✅ Demo completes in 15 minutes

---

## Tenant Reference

| Tenant ID | Display Name | Industry | Expected Deny Rate |
|-----------|--------------|----------|-------------------|
| `acme` | Acme Corporate | Professional Services | ~2.5% |
| `buildright` | BuildRight Construction | Construction | ~8% |

Default tenant filter: `acme` (set via `DEMO_TENANT_DEFAULT`)

---

## Security Notes

- **Credentials:** `admin/admin` is fine for local demo only
- **SUPERSET_SECRET_KEY:** Rotate if sharing beyond local demo
- **Do not expose ports publicly** without authentication changes
- **CSRF/CORS:** Demo config disables CSRF for convenience. Enable `WTF_CSRF_ENABLED = True` in production
- **Screen sharing:** Use throwaway environment if sharing externally
- **CSV exports:** Consider disabling per-chart CSV export if using strict RLS (prevents data extraction)

### Row-Level Security (RLS)

**Goal:** Prevent cross-tenant leakage across all dashboard queries.

**Apply identical RLS rules to each dataset (all 8):**

| Dataset | RLS Clause (TenantAcme) | RLS Clause (TenantBuildRight) | CSV Export |
|---------|-------------------------|-------------------------------|------------|
| `v_kpi_current` | `tenant_id = 'acme'` | `tenant_id = 'buildright'` | Disabled |
| `v_timeseries_minute` | `tenant_id = 'acme'` | `tenant_id = 'buildright'` | Disabled |
| `v_door_hotspots` | `tenant_id = 'acme'` | `tenant_id = 'buildright'` | Disabled |
| `v_recent_events` | `tenant_id = 'acme'` | `tenant_id = 'buildright'` | Disabled |
| `v_connector_health_latest` | `tenant_id = 'acme'` | `tenant_id = 'buildright'` | Optional |
| `v_compliance_summary` | `tenant_id = 'acme'` | `tenant_id = 'buildright'` | Disabled |
| `v_insight_deny_spikes` | `tenant_id = 'acme'` | `tenant_id = 'buildright'` | Disabled |
| `v_freshness` | `tenant_id = 'acme'` | `tenant_id = 'buildright'` | Optional |

**Choose one of these demo modes:**

| Mode | Setup | Use Case |
|------|-------|----------|
| **Strict isolation** (no tenant switching in-session) | Create roles per tenant and add an RLS rule per dataset, e.g., `tenant_id = 'acme'` for role `TenantAcme`, `tenant_id = 'buildright'` for `TenantBuildRight`. Assign the demo user to the correct role. | Production-like demo, security-conscious audience |
| **Switching allowed** (single user demos both tenants) | Do not enable RLS for the demo; rely on the dashboard Tenant Filter applied to all charts. Ensure every chart uses the filter (check native filter mapping) to avoid leakage. | Faster setup, multi-tenant demo flow |

**Important RLS notes:**
- RLS rules apply to **Admin users too** — the admin role does not bypass RLS
- In Strict mode, verify rules are correctly assigned to the demo user/role before the demo
- In Switching mode, verify **every chart** has the Tenant Filter mapped (Edit Dashboard → Filter Scoping)
- If strict RLS is enabled, consider disabling CSV export on charts to prevent data extraction

**Post-demo:** If deploying more broadly, prefer Strict isolation and remove cross-tenant switching from a single account.
