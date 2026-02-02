# Quick Start Guide

Get ClearView Intelligence running in under 5 minutes.

---

## Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | 18+ | `node --version` |
| Docker | 20+ | `docker --version` |
| Docker Compose | 2.0+ | `docker compose version` |
| Python | 3.8+ | `python3 --version` |

> **Note**: Docker Desktop includes Docker Compose. Ensure Docker is running before proceeding.

---

## One-Command Setup

```bash
make quickstart
```

This single command:
1. Starts all Docker services (ClickHouse, Superset)
2. Waits for services to initialize
3. Applies database schema
4. Generates 30 days of synthetic data
5. Verifies everything is working

---

## What to Expect

### Timeline

| Phase | Duration | What's Happening |
|-------|----------|------------------|
| Service startup | ~30 sec | Docker containers launching |
| Superset init | ~60 sec | First-run database setup |
| Data generation | ~45 sec | Python generates synthetic events |
| Data loading | ~15 sec | CSV import into ClickHouse |
| Verification | ~5 sec | Health checks and counts |

**Total: ~2-3 minutes**

### Console Output

You'll see progress indicators:

```
=== PIAM Demo Quickstart ===
Starting PIAM Demo...
Waiting for services to be ready...

[OK] ClickHouse: http://localhost:8123
[OK] Superset:   http://localhost:8088

Generating synthetic data...
Loading data into ClickHouse...
Computing baselines...

=== Data Counts ===
fact_access_events: 50,000+
rollup_door_hour: 720+
rollup_baseline_hour_of_week: 168

Demo ready! Open http://localhost:3000 (admin/admin)
```

---

## Access the Dashboard

| Service | URL | Credentials |
|---------|-----|-------------|
| **Dashboard** | http://localhost:3000 | N/A |
| **Superset** | http://localhost:8088 | admin / admin |
| **ClickHouse** | http://localhost:8123 | N/A (no auth) |

### First Login (Superset)

1. Open http://localhost:8088
2. Login: `admin` / `admin`
3. Navigate to Dashboards in the top menu
4. Select "PIAM Command Center"

---

## Verify Installation

Run the verification command:

```bash
make verify
```

Expected output:

```
=== Service Health ===
[OK] ClickHouse: healthy
[OK] Superset: healthy

=== Data Counts ===
fact_access_events: 52,847
rollup_door_hour: 720
rollup_baseline_hour_of_week: 168

=== View Health ===
v_kpi_current: OK
v_timeseries_minute: OK
v_door_hotspots: OK
v_recent_events: OK
v_connector_health_latest: OK
v_compliance_summary: OK
v_insight_deny_spikes: OK
v_freshness: OK

Verification complete.
```

---

## Start Live Data Stream (Optional)

For real-time demo effect, start the event trickle:

```bash
make trickle
```

This generates live events every 3 seconds. Press `Ctrl+C` to stop.

---

## Troubleshooting

### Port Conflicts

**Symptom**: Service fails to start, "port already in use"

**Check**:
```bash
make ports
```

**Common conflicts**:
| Port | Used By | Solution |
|------|---------|----------|
| 3000 | Another dev server | Stop the other server |
| 8088 | Another Superset | `docker stop <container>` |
| 8123 | Another ClickHouse | `docker stop <container>` |

**Force cleanup**:
```bash
# Kill process on specific port
lsof -ti:8088 | xargs kill -9
```

---

### Docker Issues

**Symptom**: "Cannot connect to Docker daemon"

**Solution**:
1. Open Docker Desktop
2. Wait for "Docker is running" status
3. Retry `make quickstart`

**Symptom**: "No space left on device"

**Solution**:
```bash
# Remove unused Docker data
docker system prune -a
```

---

### Data Not Loading

**Symptom**: Dashboards show "No data"

**Check data counts**:
```bash
make verify
```

**If counts are zero**, regenerate:
```bash
make generate
```

**Still zero?** Check ClickHouse logs:
```bash
docker logs piam-clickhouse
```

---

### Superset Not Starting

**Symptom**: Superset shows "starting" indefinitely

**Solution**: Wait 60-90 seconds on first run. Superset initializes its database.

**Still stuck?** Full reset:
```bash
make reset
```

---

### View Logs

For detailed debugging:

```bash
# All services
make logs

# Specific service
docker logs piam-clickhouse
docker logs piam-superset
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `make quickstart` | Full setup from scratch |
| `make up` | Start services |
| `make down` | Stop services |
| `make reset` | Full reset (wipes data) |
| `make generate` | Regenerate synthetic data |
| `make trickle` | Start live event stream |
| `make verify` | Check health and data |
| `make health` | Service health only |
| `make logs` | Tail all logs |

---

## Next Steps

1. Read the [Presenter's Guide](README.md) for demo flow
2. Explore the dashboard views
3. Try the AI Builder with natural language prompts
4. Run `make trickle` to see live data updates

---

*ClearView Intelligence - Unified Physical Security Intelligence*
