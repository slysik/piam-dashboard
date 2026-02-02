# =============================================================================
# ClearView Intelligence - PIAM Dashboard
# =============================================================================
#
# Physical Identity & Access Management (PIAM) Demo Environment
#
# This Makefile orchestrates a complete PIAM analytics platform using:
#   - ClickHouse: High-performance columnar database for access event analytics
#   - Superset: Data visualization and dashboarding platform
#   - Python data generators: Synthetic access event and request generation
#
# Quick Reference:
#   make quickstart  - Full setup (recommended for first run)
#   make up          - Start services only
#   make verify      - Check everything is working
#   make help        - Show all available commands
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - Python 3.x (for data generation)
#   - Ports 8123, 9000, 8088, 3000 available
#
# First Time Setup:
#   1. make quickstart    # Starts services, applies schema, generates data
#   2. Open http://localhost:8088 (admin/admin)
#
# =============================================================================

# Declare all targets as phony (not associated with files)
# This ensures make always runs these recipes regardless of file timestamps
.PHONY: up down reset clean-volumes logs health ports open-superset shell-ch shell-superset generate trickle replay clean ddl-apply verify quickstart dashboards-export dashboards-import backup-dev backup-build backup-deploy help

# Load environment variables from .env file if it exists
# The '-' prefix suppresses errors if the file doesn't exist
-include .env
export

# =============================================================================
# HELP & DOCUMENTATION
# =============================================================================
# The help target parses this Makefile for targets with '## comment' format
# and displays them in a formatted list with colors (cyan for target names)

help: ## Show this help
	@echo ""
	@echo "ClearView PIAM Dashboard - Available Commands"
	@echo "=============================================="
	@echo ""
	@echo "Quick Start:"
	@echo "  make quickstart     Full setup: services + schema + data + verify"
	@echo "  make up             Start all Docker services"
	@echo "  make verify         Check services and data are ready"
	@echo ""
	@echo "All Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Common Workflows:"
	@echo "  First time:     make quickstart"
	@echo "  Daily restart:  make up"
	@echo "  Live demo:      make trickle (generates real-time events)"
	@echo "  Full reset:     make reset (warning: clears all data)"
	@echo ""

# =============================================================================
# SERVICE MANAGEMENT
# =============================================================================
# Commands for starting, stopping, and monitoring Docker containers
# The main services are ClickHouse (analytics DB) and Superset (visualization)

up: ## Start all services (first run: ~60-90s for Superset init)
	@echo "Starting PIAM Demo..."
	@echo "Note: First run takes 60-90s while Superset initializes"
	# Start containers in detached mode (-d)
	docker compose up -d
	@echo "Waiting for services to be ready..."
	# Give containers time to initialize before health check
	@sleep 15
	# Run health check without printing the 'make health' command
	@$(MAKE) health --no-print-directory
	@echo ""
	@echo "Services running:"
	@echo "   ClickHouse: http://localhost:8123"
	@echo "   Superset:   http://localhost:8088 (admin/admin)"
	@echo ""
	@echo "If Superset shows 'starting', wait ~60s and refresh."

down: ## Stop all services
	# Stops and removes containers but preserves volumes (data persists)
	docker compose down

reset: down clean ## Full reset: stop, clean, restart, regenerate data
	@echo "WARNING: This will wipe all dashboards and data. Run 'make dashboards-export' first to backup!"
	# The -v flag removes named volumes, completely wiping all data
	docker compose down -v
	$(MAKE) up
	@echo "Waiting for schema initialization..."
	# Allow time for ClickHouse to initialize before data generation
	@sleep 10
	$(MAKE) generate
	@echo ""
	@echo "Reset complete! Run 'make dashboards-import' to restore dashboards."

clean-volumes: ## Remove Docker volumes (alternative to reset)
	# Removes all containers AND their associated volumes
	# Use this when you need a completely fresh database state
	docker compose down -v

logs: ## Tail service logs
	# Follow mode (-f) streams logs in real-time from all services
	# Press Ctrl+C to stop following
	docker compose logs -f

health: ## Check service health
	# Runs the health check script to verify all services are responding
	@./scripts/health-check.sh

ports: ## Check for port conflicts and show what's using them
	@echo "Checking ports 8123, 9000, 8088, 3000..."
	# lsof lists open files/ports; we check if our required ports are in use
	# 8123: ClickHouse HTTP interface
	# 9000: ClickHouse native protocol
	# 8088: Superset web UI
	# 3000: Backup site (development)
	@lsof -i :8123 -i :9000 -i :8088 -i :3000 2>/dev/null || echo "All ports are free"

open-superset: ## Open Superset in browser (macOS)
	# Uses macOS 'open' command; falls back to printing URL on other systems
	@open http://localhost:8088 2>/dev/null || echo "Open http://localhost:8088 in your browser"

# =============================================================================
# DATABASE ACCESS
# =============================================================================
# Interactive shell access to ClickHouse and Superset containers
# Useful for debugging, ad-hoc queries, and manual data inspection

shell-ch: ## Open ClickHouse CLI
	# Opens interactive ClickHouse client connected to the 'piam' database
	# From here you can run SQL queries directly
	# Example: SELECT count() FROM fact_access_events;
	docker exec -it piam-clickhouse clickhouse-client --database=piam

shell-superset: ## Open Superset container shell
	# Opens a bash shell inside the Superset container
	# Useful for running Superset CLI commands or debugging
	docker exec -it piam-superset bash

# =============================================================================
# DATA GENERATION
# =============================================================================
# Commands for creating and managing synthetic PIAM data
# Data includes: access events, door sensors, badge scans, deny events

generate: ## Generate synthetic data and load into ClickHouse
	@echo "Generating synthetic data..."
	# Install Python dependencies quietly and generate 30 days of historical data
	# The datagen folder contains Python scripts for synthetic data creation
	@cd datagen && python3 -m pip install -q -r requirements.txt && python3 generate.py --days 30
	@echo ""
	@echo "Loading data into ClickHouse..."
	# Load generated CSV files into ClickHouse tables
	@./scripts/load-data.sh
	@echo ""
	@echo "Computing baselines..."
	# Compute statistical baselines for anomaly detection
	# This populates the rollup_baseline_hour_of_week table
	@docker exec -i piam-clickhouse clickhouse-client --multiquery < clickhouse/init/03_baselines.sql
	@echo ""
	@echo "Data generation complete!"
	@echo "   Run 'make trickle' to start live event stream"

trickle: ## Start live event & request trickle (Ctrl+C to stop)
	@echo "Starting live data stream (events + requests)..."
	# Runs a continuous stream of synthetic events for live demos
	# --interval 3: Generate events every 3 seconds
	# --events-per-batch 5: 5 events per interval
	# --deny-rate 0.25: 25% of events are denials (for anomaly demos)
	# PYTHONUNBUFFERED=1 ensures real-time output (no buffering)
	@cd datagen && PYTHONUNBUFFERED=1 python3 trickle_simple.py --interval 3 --events-per-batch 5 --deny-rate 0.25

replay: ## Load incident replay window (guaranteed incidents)
	@echo "Loading incident replay window..."
	# Loads a pre-defined set of events that simulate security incidents
	# Useful for demonstrating alerting and anomaly detection features
	@cd datagen && python3 replay.py
	@echo "Replay loaded. Filter dashboards to last 30 minutes."

clean: ## Remove generated data files
	@echo "Cleaning generated files..."
	# Remove CSV files from the data directory
	# Does NOT remove data already loaded into ClickHouse
	@rm -f clickhouse/data/*.csv
	@echo "Cleaned"

# =============================================================================
# SCHEMA & DATABASE OPERATIONS
# =============================================================================
# Commands for applying and managing the ClickHouse database schema
# Schema files are in clickhouse/init/ directory

ddl-apply: ## Apply schema DDL without reset (use after adding files)
	@echo "Applying schema DDL..."
	# Apply schema in order: tables first, then rollups, then baselines
	# 01_schema.sql: Core tables (fact_access_events, dim_* tables)
	@docker exec -i piam-clickhouse clickhouse-client --multiquery < clickhouse/init/01_schema.sql
	# 02_rollups.sql: Materialized views for hourly/daily aggregations
	@docker exec -i piam-clickhouse clickhouse-client --multiquery < clickhouse/init/02_rollups.sql
	# 03_baselines.sql: Statistical baseline tables for anomaly detection
	@docker exec -i piam-clickhouse clickhouse-client --multiquery < clickhouse/init/03_baselines.sql
	@echo "DDL applied"

# =============================================================================
# VERIFICATION & HEALTH CHECKS
# =============================================================================
# Commands to verify the system is functioning correctly
# Run these after setup or when troubleshooting issues

verify: ## Quick pre-demo verification of services and data
	@echo "=== Service Health ==="
	# Check that all Docker services are running and responsive
	@./scripts/health-check.sh
	@echo ""
	@echo "=== Data Counts ==="
	# Show row counts for main tables to verify data was loaded
	# fact_access_events: Raw access events (should have thousands of rows)
	# rollup_door_hour: Hourly aggregations by door
	# rollup_baseline_hour_of_week: Statistical baselines for anomaly detection
	@docker exec piam-clickhouse clickhouse-client --database=piam --query="SELECT 'fact_access_events' as tbl, count() as cnt FROM fact_access_events UNION ALL SELECT 'rollup_door_hour', count() FROM rollup_door_hour UNION ALL SELECT 'rollup_baseline_hour_of_week', count() FROM rollup_baseline_hour_of_week FORMAT PrettyCompact"
	@echo ""
	@echo "=== View Health (all 8 views) ==="
	# Verify all analytics views have data (ok=1 means view returns results)
	# These views power the Superset dashboards
	@docker exec piam-clickhouse clickhouse-client --database=piam --query="SELECT 'v_kpi_current' as view, count() > 0 as ok FROM v_kpi_current UNION ALL SELECT 'v_timeseries_minute', count() > 0 FROM v_timeseries_minute UNION ALL SELECT 'v_door_hotspots', count() > 0 FROM v_door_hotspots UNION ALL SELECT 'v_recent_events', count() > 0 FROM v_recent_events UNION ALL SELECT 'v_connector_health_latest', count() > 0 FROM v_connector_health_latest UNION ALL SELECT 'v_compliance_summary', count() > 0 FROM v_compliance_summary UNION ALL SELECT 'v_insight_deny_spikes', count() > 0 FROM v_insight_deny_spikes UNION ALL SELECT 'v_freshness', count() > 0 FROM v_freshness FORMAT PrettyCompact" 2>/dev/null || echo "  (views may be empty before data load)"
	@echo ""
	@echo "=== Tenant Check ==="
	# Show event distribution by tenant (multi-tenant support verification)
	@docker exec piam-clickhouse clickhouse-client --database=piam --query="SELECT tenant_id, count() as events FROM fact_access_events GROUP BY tenant_id FORMAT PrettyCompact" 2>/dev/null || true
	@echo ""
	@echo "Verification complete. Run 'make open-superset' or open http://localhost:8088"

quickstart: ## Full setup: start services, generate data, verify
	@echo "=== PIAM Demo Quickstart ==="
	# Step 1: Start Docker services (ClickHouse + Superset)
	$(MAKE) up
	@echo ""
	@echo "Ensuring DDL is applied..."
	# Brief pause to ensure ClickHouse is fully ready
	@sleep 5
	# Step 2: Apply database schema (creates tables and views)
	$(MAKE) ddl-apply
	@echo ""
	# Step 3: Generate and load synthetic data
	$(MAKE) generate
	@echo ""
	# Step 4: Verify everything is working
	$(MAKE) verify
	@echo ""
	@echo "Demo ready! Open http://localhost:8088 (admin/admin)"

# =============================================================================
# DASHBOARD BACKUP/RESTORE
# =============================================================================
# Commands for exporting and importing Superset dashboard configurations
# Use these to preserve custom dashboards across resets or share configurations

dashboards-export: ## Export Superset dashboards to backup file
	@echo "Exporting dashboards..."
	# Export all dashboards from Superset to a ZIP file inside the container
	@docker exec piam-superset superset export-dashboards -f /app/superset_home/dashboards_backup.zip
	# Copy the ZIP file from container to local filesystem
	@docker cp piam-superset:/app/superset_home/dashboards_backup.zip ./dashboards_backup.zip
	@echo "Exported to ./dashboards_backup.zip"

dashboards-import: ## Import Superset dashboards from backup file
	@echo "Importing dashboards..."
	# Copy local backup file into the container
	@docker cp ./dashboards_backup.zip piam-superset:/app/superset_home/
	# Import dashboards from the ZIP file
	@docker exec piam-superset superset import-dashboards -p /app/superset_home/dashboards_backup.zip
	@echo "Dashboards imported"

# =============================================================================
# BACKUP SITE (Static Fallback)
# =============================================================================
# Commands for the static backup site (used when full demo isn't available)
# The backup site is a lightweight alternative for quick presentations

backup-dev: ## Run backup site locally
	# Install dependencies and start development server
	# Runs on http://localhost:3000 by default
	cd backup-site && npm install && npm run dev

backup-build: ## Build backup site for production
	# Creates optimized production build in backup-site/dist
	cd backup-site && npm run build

backup-deploy: ## Deploy backup site to Vercel
	# Deploys to Vercel's edge network for global availability
	# Requires Vercel CLI to be installed and authenticated
	cd backup-site && vercel --prod
