# PIAM Analytics Demo — Build Specification (Part 1 of 4)
# Project Setup & Infrastructure

**Purpose:** Claude Code build instructions for PIAM analytics demo  
**Stack:** ClickHouse + Superset (primary) | Next.js + Vercel (backup)  
**Audience:** Soloinsight Solutions Engineer interview

---

## Overview

This spec is divided into 4 parts:
1. **Part 1:** Project setup, Docker, Makefile (this file)
2. **Part 2:** ClickHouse schema (DDL files)
3. **Part 3:** Data generation (Python scripts)
4. **Part 4:** Superset dashboards + Vercel backup site

---

## Directory Structure

```
piam-demo/
├── docker-compose.yml
├── Makefile
├── README.md
├── .env.example
├── .gitignore
├── clickhouse/
│   ├── init/
│   │   ├── 01_schema.sql
│   │   ├── 02_rollups.sql
│   │   └── 03_baselines.sql
│   └── data/                    # Generated CSVs
├── datagen/
│   ├── requirements.txt
│   ├── config.yaml
│   ├── generate.py
│   ├── trickle.py
│   └── replay.py
├── superset/
│   └── superset_config.py
├── backup-site/                 # Next.js Vercel backup
│   ├── package.json
│   ├── ...
└── scripts/
    ├── health-check.sh
    └── load-data.sh
```

---

## Task 1.1: Create .gitignore

**File:** `piam-demo/.gitignore`

```gitignore
# Dependencies
node_modules/
__pycache__/
*.pyc
.venv/
venv/

# Generated data (large CSVs)
clickhouse/data/*.csv

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Build
.next/
out/
dist/
build/

# Logs
*.log
npm-debug.log*

# Docker volumes (if local)
data/
```

---

## Task 1.2: Create .env.example

**File:** `piam-demo/.env.example`

```env
# ClickHouse
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=piam
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# Superset
SUPERSET_SECRET_KEY=piam-demo-change-this-in-production
SUPERSET_ADMIN_USER=admin
SUPERSET_ADMIN_PASSWORD=admin

# Mapbox - Required for map basemap in BOTH Superset and backup-site
# Get a free token at: https://account.mapbox.com/access-tokens/
MAPBOX_API_KEY=pk.your_mapbox_token_here

# Demo settings
DEMO_TENANT_DEFAULT=acme

# =============================================================================
# BACKUP SITE ENVIRONMENT (copy to backup-site/.env.local after scaffolding)
# =============================================================================
# Create backup-site/.env.local with:
#   NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
#
# Note: Next.js reads from .env.local in its own directory, not the root .env
```

---

## Task 1.3: Create README.md

**File:** `piam-demo/README.md`

```markdown
# PIAM Analytics Demo

Executive-grade Physical Identity and Access Management analytics dashboard.

## Quick Start

```bash
# 1. Start services
make up

# 2. Generate and load 30 days of data
make generate

# 3. Open Superset
open http://localhost:8088
# Login: admin / admin

# 4. (Optional) Start live event stream
make trickle
```

## Architecture

- **ClickHouse** - Analytics database (rollups, baselines, views)
- **Superset** - Primary dashboard UI (ECharts, filters, drill-down)
- **Next.js** - Backup static site (Vercel deployment)

## Commands

| Command | Description |
|---------|-------------|
| `make quickstart` | Full setup: start, generate data, verify (one command) |
| `make up` | Start ClickHouse + Superset |
| `make down` | Stop all services |
| `make reset` | Full reset: wipe data, restart, regenerate |
| `make clean-volumes` | Remove Docker volumes (alternative to reset) |
| `make generate` | Generate 30 days of synthetic data |
| `make trickle` | Start live event stream (~3 events/5s) |
| `make replay` | Load incident replay window |
| `make verify` | Quick pre-demo verification (all 8 views) |
| `make ddl-apply` | Apply schema DDL without reset |
| `make logs` | Tail all service logs |
| `make health` | Check service health |
| `make ports` | Check for port conflicts |
| `make open-superset` | Open Superset in browser (macOS) |
| `make shell-ch` | ClickHouse CLI |
| `make dashboards-export` | Export Superset dashboards to backup |
| `make dashboards-import` | Restore Superset dashboards from backup |

## Demo Flow (15 minutes)

1. **Command Center** (0-5 min)
   - KPI tiles with baseline deltas
   - Time-series: grants vs denies
   - Map: door hotspots

2. **Evidence Drill** (5-8 min)
   - Click map hotspot → filter events
   - Click event row → evidence drawer (JSON payload)

3. **Insights** (8-10 min)
   - Top 3 insights (rule-based)
   - Click insight → drill to details

4. **Compliance** (10-13 min)
   - Contractor compliance issues
   - Export to CSV

5. **Multi-tenant** (13-15 min)
   - Switch to Tenant B
   - Different patterns (construction vs corporate)

## Backup Deployment

If Docker fails, use Vercel backup:

```bash
cd backup-site
npm install
npm run dev        # Local: http://localhost:3000
vercel --prod      # Deploy to Vercel
```

## Data Model

**Dimensions:** tenant, site, location (doors), person, entitlement  
**Facts:** access_events, connector_health, compliance_status  
**Rollups:** minute-level, hourly, hour-of-week baselines

## Tenants

| Tenant | Profile | Deny Rate |
|--------|---------|-----------|
| Acme Corporate | Professional services, clean governance | ~2.5% |
| BuildRight | Construction, contractor-heavy, compliance issues | ~8% |
```

---

## Task 1.4: Create docker-compose.yml

**File:** `piam-demo/docker-compose.yml`

```yaml
version: '3.8'

services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.1
    container_name: piam-clickhouse
    ports:
      - "8123:8123"   # HTTP
      - "9000:9000"   # Native
    volumes:
      - ./clickhouse/init:/docker-entrypoint-initdb.d:ro
      - ./clickhouse/data:/var/lib/clickhouse/user_files:ro
      - clickhouse-data:/var/lib/clickhouse
    environment:
      CLICKHOUSE_DB: piam
      CLICKHOUSE_USER: default
      CLICKHOUSE_PASSWORD: ""
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: 1
      TZ: America/New_York  # Align with schema timezone
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    healthcheck:
      test: ["CMD", "clickhouse-client", "--query", "SELECT 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  superset:
    image: apache/superset:3.1.0
    container_name: piam-superset
    ports:
      - "8088:8088"
    volumes:
      - ./superset/superset_config.py:/app/pythonpath/superset_config.py:ro
      - superset-data:/app/superset_home
    environment:
      SUPERSET_SECRET_KEY: "${SUPERSET_SECRET_KEY:-piam-demo-secret-key}"
      SUPERSET_LOAD_EXAMPLES: "no"
      TALISMAN_ENABLED: "False"
      MAPBOX_API_KEY: "${MAPBOX_API_KEY:-}"  # For deck.gl map basemap
      TZ: America/New_York  # Align with schema timezone
    depends_on:
      clickhouse:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8088/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    command: >
      bash -c "
        pip install clickhouse-connect &&
        superset db upgrade &&
        superset fab create-admin --username admin --firstname Admin --lastname User --email admin@example.com --password admin 2>/dev/null || true &&
        superset init &&
        superset run -h 0.0.0.0 -p 8088 --with-threads --reload
      "

volumes:
  clickhouse-data:
  superset-data:

networks:
  default:
    name: piam-network
```

---

## Task 1.5: Create Makefile

**File:** `piam-demo/Makefile`

```makefile
.PHONY: up down reset clean-volumes logs health ports open-superset shell-ch shell-superset generate trickle replay clean ddl-apply verify quickstart dashboards-export dashboards-import backup-dev backup-build backup-deploy help

# Load .env if exists
-include .env
export

# ============================================================================
# MAIN COMMANDS
# ============================================================================

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Start all services (first run: ~60-90s for Superset init)
	@echo "Starting PIAM Demo..."
	@echo "Note: First run takes 60-90s while Superset initializes"
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 15
	@$(MAKE) health --no-print-directory
	@echo ""
	@echo "✅ Services running:"
	@echo "   ClickHouse: http://localhost:8123"
	@echo "   Superset:   http://localhost:8088 (admin/admin)"
	@echo ""
	@echo "If Superset shows 'starting', wait ~60s and refresh."

down: ## Stop all services
	docker-compose down

reset: down clean ## Full reset: stop, clean, restart, regenerate data
	@echo "⚠️  This will wipe all dashboards and data. Run 'make dashboards-export' first to backup!"
	docker-compose down -v  # Uses Compose to find correct volume names
	$(MAKE) up
	@echo "Waiting for schema initialization..."
	@sleep 10
	$(MAKE) generate
	@echo ""
	@echo "✅ Reset complete! Run 'make dashboards-import' to restore dashboards."

clean-volumes: ## Remove Docker volumes (alternative to reset)
	docker-compose down -v

logs: ## Tail service logs
	docker-compose logs -f

health: ## Check service health
	@./scripts/health-check.sh

ports: ## Check for port conflicts and show what's using them
	@echo "Checking ports 8123, 9000, 8088, 3000..."
	@lsof -i :8123 -i :9000 -i :8088 -i :3000 2>/dev/null || echo "All ports are free"

open-superset: ## Open Superset in browser (macOS)
	@open http://localhost:8088 2>/dev/null || echo "Open http://localhost:8088 in your browser"

# ============================================================================
# DATABASE ACCESS
# ============================================================================

shell-ch: ## Open ClickHouse CLI
	docker exec -it piam-clickhouse clickhouse-client --database=piam

shell-superset: ## Open Superset container shell
	docker exec -it piam-superset bash

# ============================================================================
# DATA GENERATION
# ============================================================================

generate: ## Generate synthetic data and load into ClickHouse
	@echo "Generating synthetic data..."
	@cd datagen && pip install -q -r requirements.txt && python generate.py --days 30
	@echo ""
	@echo "Loading data into ClickHouse..."
	@./scripts/load-data.sh
	@echo ""
	@echo "Computing baselines..."
	@docker exec -i piam-clickhouse clickhouse-client --database=piam < clickhouse/init/03_baselines.sql
	@echo ""
	@echo "✅ Data generation complete!"
	@echo "   Run 'make trickle' to start live event stream"

trickle: ## Start live event trickle (Ctrl+C to stop)
	@echo "Starting live event stream..."
	@cd datagen && python trickle.py --interval 5 --events-per-batch 3

replay: ## Load incident replay window (guaranteed incidents)
	@echo "Loading incident replay window..."
	@cd datagen && python replay.py
	@echo "✅ Replay loaded. Filter dashboards to last 30 minutes."

clean: ## Remove generated data files
	@echo "Cleaning generated files..."
	@rm -f clickhouse/data/*.csv
	@echo "✅ Cleaned"

# ============================================================================
# SCHEMA & VERIFICATION
# ============================================================================

ddl-apply: ## Apply schema DDL without reset (use after adding files)
	@echo "Applying schema DDL..."
	@docker exec -i piam-clickhouse clickhouse-client --database=piam < clickhouse/init/01_schema.sql
	@docker exec -i piam-clickhouse clickhouse-client --database=piam < clickhouse/init/02_rollups.sql
	@docker exec -i piam-clickhouse clickhouse-client --database=piam < clickhouse/init/03_baselines.sql
	@echo "✅ DDL applied"

verify: ## Quick pre-demo verification of services and data
	@echo "=== Service Health ==="
	@./scripts/health-check.sh
	@echo ""
	@echo "=== Data Counts ==="
	@docker exec piam-clickhouse clickhouse-client --database=piam --query="SELECT 'fact_access_events' as tbl, count() as cnt FROM fact_access_events UNION ALL SELECT 'rollup_door_hour', count() FROM rollup_door_hour UNION ALL SELECT 'rollup_baseline_hour_of_week', count() FROM rollup_baseline_hour_of_week FORMAT PrettyCompact"
	@echo ""
	@echo "=== View Health (all 8 views) ==="
	@docker exec piam-clickhouse clickhouse-client --database=piam --query="SELECT 'v_kpi_current' as view, count() > 0 as ok FROM v_kpi_current UNION ALL SELECT 'v_timeseries_minute', count() > 0 FROM v_timeseries_minute UNION ALL SELECT 'v_door_hotspots', count() > 0 FROM v_door_hotspots UNION ALL SELECT 'v_recent_events', count() > 0 FROM v_recent_events UNION ALL SELECT 'v_connector_health_latest', count() > 0 FROM v_connector_health_latest UNION ALL SELECT 'v_compliance_summary', count() > 0 FROM v_compliance_summary UNION ALL SELECT 'v_insight_deny_spikes', count() > 0 FROM v_insight_deny_spikes UNION ALL SELECT 'v_freshness', count() > 0 FROM v_freshness FORMAT PrettyCompact" 2>/dev/null || echo "  (views may be empty before data load)"
	@echo ""
	@echo "=== Tenant Check ==="
	@docker exec piam-clickhouse clickhouse-client --database=piam --query="SELECT tenant_id, count() as events FROM fact_access_events GROUP BY tenant_id FORMAT PrettyCompact" 2>/dev/null || true
	@echo ""
	@echo "✅ Verification complete. Run 'make open-superset' or open http://localhost:8088"

quickstart: ## Full setup: start services, generate data, verify
	@echo "=== PIAM Demo Quickstart ==="
	$(MAKE) up
	@echo ""
	@echo "Waiting for schema initialization..."
	@sleep 10
	$(MAKE) generate
	@echo ""
	$(MAKE) verify
	@echo ""
	@echo "🚀 Demo ready! Open http://localhost:8088 (admin/admin)"

# ============================================================================
# DASHBOARD BACKUP/RESTORE
# ============================================================================

dashboards-export: ## Export Superset dashboards to backup file
	@echo "Exporting dashboards..."
	@docker exec piam-superset superset export-dashboards -f /app/superset_home/dashboards_backup.zip
	@docker cp piam-superset:/app/superset_home/dashboards_backup.zip ./dashboards_backup.zip
	@echo "✅ Exported to ./dashboards_backup.zip"

dashboards-import: ## Import Superset dashboards from backup file
	@echo "Importing dashboards..."
	@docker cp ./dashboards_backup.zip piam-superset:/app/superset_home/
	@docker exec piam-superset superset import-dashboards -p /app/superset_home/dashboards_backup.zip
	@echo "✅ Dashboards imported"

# ============================================================================
# PERFORMANCE (Low-Resource Mode)
# ============================================================================

# For laptops with limited RAM/CPU, use rollup views instead of raw facts.
# This reduces query load but provides less granular data.
#
# To enable: Create rollup-based dataset alternatives in Superset (see Index docs)
# and set shorter cache TTL.
#
# Example: In Superset, swap v_timeseries_minute dataset to use
# v_timeseries_minute_rollup (defined in 02_rollups.sql)

# ============================================================================
# BACKUP SITE
# ============================================================================

backup-dev: ## Run backup site locally
	cd backup-site && npm install && npm run dev

backup-build: ## Build backup site for production
	cd backup-site && npm run build

backup-deploy: ## Deploy backup site to Vercel
	cd backup-site && vercel --prod
```

---

## Task 1.6: Create health-check.sh

**File:** `piam-demo/scripts/health-check.sh`

```bash
#!/bin/bash

echo "Checking services..."

# Check ClickHouse
echo -n "  ClickHouse: "
if curl -sf http://localhost:8123/ping > /dev/null 2>&1; then
    echo "✅ healthy"
else
    echo "❌ not responding"
    exit 1
fi

# Check Superset
echo -n "  Superset:   "
if curl -sf http://localhost:8088/health > /dev/null 2>&1; then
    echo "✅ healthy"
else
    echo "⚠️  starting (may take 60s on first run)"
fi

# Check ClickHouse tables
echo ""
echo "ClickHouse tables:"
docker exec piam-clickhouse clickhouse-client --database=piam --query="SELECT name, total_rows FROM system.tables WHERE database='piam' AND total_rows > 0 ORDER BY name" 2>/dev/null || echo "  (no data loaded yet)"
```

**Make executable:** `chmod +x scripts/health-check.sh`

---

## Task 1.7: Create load-data.sh

**File:** `piam-demo/scripts/load-data.sh`

```bash
#!/bin/bash
set -e

DATA_DIR="clickhouse/data"
CH="docker exec -i piam-clickhouse clickhouse-client --database=piam"

echo "Loading data into ClickHouse..."

# Helper function
load_table() {
    local table=$1
    local file="$DATA_DIR/${table}.csv"
    if [ -f "$file" ]; then
        echo "  Loading $table..."
        $CH --query="TRUNCATE TABLE IF EXISTS $table"
        $CH --query="INSERT INTO $table FORMAT CSVWithNames" < "$file"
    else
        echo "  Skipping $table (file not found)"
    fi
}

# Load dimensions
load_table "dim_tenant"
load_table "dim_site"
load_table "dim_location"
load_table "dim_person"
load_table "dim_entitlement"

# Load facts
load_table "fact_access_events"
load_table "fact_connector_health"
load_table "fact_compliance_status"

# Show counts
echo ""
echo "Row counts:"
$CH --query="
SELECT 'dim_tenant' as t, count() as c FROM dim_tenant
UNION ALL SELECT 'dim_site', count() FROM dim_site
UNION ALL SELECT 'dim_location', count() FROM dim_location
UNION ALL SELECT 'dim_person', count() FROM dim_person
UNION ALL SELECT 'fact_access_events', count() FROM fact_access_events
FORMAT PrettyCompact
"

echo ""
echo "✅ Data loaded successfully"
```

**Make executable:** `chmod +x scripts/load-data.sh`

---

## Task 1.8: Create Superset config

**File:** `piam-demo/superset/superset_config.py`

```python
"""Superset configuration for PIAM Demo.

Security Note: CSRF and Talisman are disabled for local demo convenience.
For production hardening, see: https://superset.apache.org/docs/security/

WARNING: Do not expose this configuration publicly without:
1. Enabling CSRF protection (WTF_CSRF_ENABLED = True)
2. Enabling Talisman (TALISMAN_ENABLED = True)
3. Setting a strong, unique SECRET_KEY
4. Configuring CORS_ALLOW_ORIGINS if embedding in other apps

CORS Note: If you need to embed Superset dashboards in external apps,
configure CORS carefully. The current config allows all origins for local demo.
"""

import os

# Security
SECRET_KEY = os.environ.get('SUPERSET_SECRET_KEY', 'piam-demo-secret-key')
TALISMAN_ENABLED = False  # Enable in production
WTF_CSRF_ENABLED = False  # Enable in production

# CORS - Only configure if embedding Superset elsewhere (not needed for local demo)
# CORS_ALLOW_ORIGINS = ["http://localhost:3000"]  # Uncomment if embedding in backup site

# Mapbox (required for deck.gl map basemap)
MAPBOX_API_KEY = os.environ.get('MAPBOX_API_KEY', '')

# Feature flags
FEATURE_FLAGS = {
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "DASHBOARD_NATIVE_FILTERS_SET": True,
    "ENABLE_TEMPLATE_PROCESSING": True,
    "EMBEDDED_SUPERSET": True,
    "ALERT_REPORTS": False,
}

# Cache (simple for demo)
CACHE_CONFIG = {
    'CACHE_TYPE': 'SimpleCache',
    'CACHE_DEFAULT_TIMEOUT': 60,
}

# SQL Lab
SQL_MAX_ROW = 10000
SQLLAB_TIMEOUT = 60

# Dashboard auto-refresh options (seconds)
SUPERSET_DASHBOARD_PERIODICAL_REFRESH_LIMIT = 10
SUPERSET_DASHBOARD_PERIODICAL_REFRESH_WARNING_MESSAGE = None

# Theme
APP_NAME = "PIAM Analytics"

# ClickHouse connection
SQLALCHEMY_DATABASE_URI = 'sqlite:////app/superset_home/superset.db'

# Default row limit
DEFAULT_SQLLAB_LIMIT = 1000
```

---

## Acceptance Criteria (Part 1)

After completing Part 1, verify:

1. **Directory structure exists:**
   ```bash
   ls -la piam-demo/
   # Should show: docker-compose.yml, Makefile, README.md, .gitignore, .env.example
   ```

2. **Docker Compose is valid:**
   ```bash
   cd piam-demo && docker-compose config
   # Should show resolved config without errors
   ```

3. **Services start:**
   ```bash
   make up
   # Should start ClickHouse and Superset
   ```

4. **Health check passes:**
   ```bash
   make health
   # ClickHouse: ✅ healthy
   # Superset: ✅ healthy (after ~60s)
   ```

5. **ClickHouse is accessible:**
   ```bash
   curl http://localhost:8123/ping
   # Should return: Ok.
   ```

6. **Superset is accessible:**
   ```bash
   curl -s http://localhost:8088/health | head -1
   # Should return: OK
   # Web UI: http://localhost:8088 (admin/admin)
   ```

---

**Next:** Continue to Part 2 (ClickHouse Schema)
