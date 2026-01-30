# PIAM Dashboard Demo

A multi-tenant Physical Identity and Access Management (PIAM) analytics dashboard demonstrating real-time credential and access event visualization.

## Quick Start

```bash
# 1. Copy environment file and add your Mapbox token
cp .env.example .env
# Edit .env and add your MAPBOX_API_KEY

# 2. Start infrastructure (ClickHouse + Superset)
docker compose up -d

# 3. Generate synthetic data
cd datagen && python generate.py && cd ..

# 4. Load data into ClickHouse
./scripts/load-data.sh

# 5. Import Superset dashboard
./scripts/import-dashboard.sh

# 6. Open Superset
open http://localhost:8088
# Login: admin / admin
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Data Gen      │────▶│   ClickHouse    │────▶│    Superset     │
│   (Python)      │     │   (Analytics)   │     │   (Dashboard)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  Backup Site    │
                                                │  (Next.js)      │
                                                └─────────────────┘
```

## Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start ClickHouse and Superset |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and remove volumes |
| `cd datagen && python generate.py` | Generate synthetic PIAM data |
| `./scripts/load-data.sh` | Load CSV data into ClickHouse |
| `./scripts/import-dashboard.sh` | Import Superset dashboard config |
| `./scripts/export-dashboard.sh` | Export current dashboard config |

## Demo Flow

1. **Infrastructure**: Docker Compose brings up ClickHouse (port 8123) and Superset (port 8088)
2. **Data Generation**: Python script creates realistic PIAM data (credentials, access events, areas)
3. **Data Loading**: Shell script loads CSVs into ClickHouse tables
4. **Dashboard**: Superset displays multi-tenant analytics with filters

## Backup Deployment

The `backup-site/` directory contains a standalone Next.js application that can be deployed independently:

```bash
cd backup-site
cp ../.env.example .env.local
# Edit .env.local with NEXT_PUBLIC_MAPBOX_TOKEN
npm install
npm run dev
```

This provides a fallback visualization layer that can connect directly to ClickHouse or use exported data.

## Data Model

### Tables

- **credentials**: Badge/card information (id, holder_name, tenant_id, status, issued_at, expires_at)
- **access_events**: Door/gate access logs (timestamp, credential_id, area_id, event_type, granted)
- **areas**: Physical locations (id, name, tenant_id, lat, lng, access_level)
- **tenants**: Customer organizations (id, name, plan_tier)

### Key Metrics

- Active credentials by tenant
- Access events over time
- Denied access attempts
- Area utilization heatmaps
- Credential expiration tracking

## Tenants

Demo includes sample tenants:

| Tenant | Description | Plan |
|--------|-------------|------|
| acme | Acme Corporation HQ | enterprise |
| globex | Globex Industries | professional |
| initech | Initech LLC | starter |

Each tenant has isolated data with row-level filtering in Superset.
