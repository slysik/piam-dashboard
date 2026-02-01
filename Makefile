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
	docker compose up -d
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
	docker compose down

reset: down clean ## Full reset: stop, clean, restart, regenerate data
	@echo "⚠️  This will wipe all dashboards and data. Run 'make dashboards-export' first to backup!"
	docker compose down -v
	$(MAKE) up
	@echo "Waiting for schema initialization..."
	@sleep 10
	$(MAKE) generate
	@echo ""
	@echo "✅ Reset complete! Run 'make dashboards-import' to restore dashboards."

clean-volumes: ## Remove Docker volumes (alternative to reset)
	docker compose down -v

logs: ## Tail service logs
	docker compose logs -f

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
	@cd datagen && python3 -m pip install -q -r requirements.txt && python3 generate.py --days 30
	@echo ""
	@echo "Loading data into ClickHouse..."
	@./scripts/load-data.sh
	@echo ""
	@echo "Computing baselines..."
	@docker exec -i piam-clickhouse clickhouse-client --multiquery < clickhouse/init/03_baselines.sql
	@echo ""
	@echo "✅ Data generation complete!"
	@echo "   Run 'make trickle' to start live event stream"

trickle: ## Start live event & request trickle (Ctrl+C to stop)
	@echo "Starting live data stream (events + requests)..."
	@cd datagen && python3 trickle_simple.py --interval 3 --events-per-batch 5 --deny-rate 0.25

replay: ## Load incident replay window (guaranteed incidents)
	@echo "Loading incident replay window..."
	@cd datagen && python3 replay.py
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
	@docker exec -i piam-clickhouse clickhouse-client --multiquery < clickhouse/init/01_schema.sql
	@docker exec -i piam-clickhouse clickhouse-client --multiquery < clickhouse/init/02_rollups.sql
	@docker exec -i piam-clickhouse clickhouse-client --multiquery < clickhouse/init/03_baselines.sql
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
	@echo "Ensuring DDL is applied..."
	@sleep 5
	$(MAKE) ddl-apply
	@echo ""
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
# BACKUP SITE
# ============================================================================

backup-dev: ## Run backup site locally
	cd backup-site && npm install && npm run dev

backup-build: ## Build backup site for production
	cd backup-site && npm run build

backup-deploy: ## Deploy backup site to Vercel
	cd backup-site && vercel --prod
