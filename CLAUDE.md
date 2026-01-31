# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClearView Intelligence - a multi-tenant Physical Identity and Access Management (PIAM) analytics dashboard. It provides real-time credential and access event visualization across multiple Physical Access Control Systems (PACS) including Lenel, C-CURE, S2, Genetec, HID, and Verkada.

## Common Commands

### Frontend Development (backup-site/)
```bash
cd backup-site && npm install && npm run dev   # Start dev server on port 3000
npm run build                                   # Production build
npm run lint                                    # ESLint check
```

### Full Stack with Backend Services
```bash
make up              # Start ClickHouse + Superset containers
make generate        # Generate 30 days of synthetic data and load into ClickHouse
make trickle         # Start live event stream (5 events/batch, 25% deny rate)
make verify          # Pre-demo verification (health + data counts)
make quickstart      # Full setup: up + ddl-apply + generate + verify
```

### Database & Debugging
```bash
make shell-ch        # ClickHouse CLI (inside piam database)
make health          # Service health check
make logs            # Tail all Docker service logs
make ddl-apply       # Apply schema DDL without reset
```

### Deployment
```bash
make backup-build    # Build for production
make backup-deploy   # Deploy to Vercel
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js Frontend (backup-site/)                            │
│  ├── React Components with persona-based visibility         │
│  ├── useClickHouse hook (auto-refresh data fetching)        │
│  └── Recharts + Mapbox GL visualizations                    │
└────────────────────────┬────────────────────────────────────┘
                         │ /api/clickhouse (proxy)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  ClickHouse (port 8123)                                     │
│  ├── fact_access_events (core event table)                  │
│  ├── rollup_* tables (pre-aggregated for performance)       │
│  └── v_* views (API-ready query endpoints)                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Data Flow Pattern
Components use custom hooks that wrap ClickHouse queries with auto-refresh:
```typescript
// Example: hooks/useClickHouse.ts
useClickHouse({
  query: `SELECT ... FROM piam.v_kpi_current WHERE tenant_id = {tenant:String}`,
  params: { tenant },
  refreshInterval: 15000,  // Auto-refresh every 15 seconds
  fallbackData: [],        // Graceful degradation when ClickHouse unavailable
});
```

### Frontend Structure (backup-site/)
- `app/` - Next.js App Router pages and API routes
- `components/` - 19 React components organized by dashboard view
- `hooks/` - Custom hooks: `useClickHouse.ts` (data fetching), `useDashboardData.ts` (aggregation)
- `lib/clickhouse.ts` - ClickHouse HTTP client with query helpers
- `contexts/DataContext.tsx` - Shared state for tenant/persona selection

### Persona-Based Navigation
Dashboard tabs are filtered by user role:
- **ceo**: executive, risk, compliance, genai
- **soc**: risk, command, mustering, genai
- **facilities**: mustering, command, requests, genai
- **ithr**: hygiene, governance, requests, genai
- **compliance**: compliance, hygiene, governance, genai

### Multi-Tenant Support
Two demo tenants: `acme` (corporate office) and `buildright` (construction site). All ClickHouse queries filter by `tenant_id`.

## Important ClickHouse Views
| View | Purpose | Refresh |
|------|---------|---------|
| `v_kpi_current` | Dashboard KPIs | 15s |
| `v_timeseries_minute` | Time-series charts | 15s |
| `v_door_hotspots` | Map visualization | 30s |
| `v_recent_events` | Event stream table | 5s |
| `v_connector_health_latest` | PACS status | 10s |
| `v_insight_deny_spikes` | Anomaly detection | 30s |
| `v_freshness` | Data age tracking | 5s |

## Environment Variables
Copy `env.example` to `.env`. Key variables:
- `CLICKHOUSE_HOST/PORT/DB` - Database connection (default: localhost:8123/piam)
- `MAPBOX_API_KEY` - Required for map visualization
- `OPENAI_API_KEY` - Required for AI Dashboard Builder (GenAI view)

## Service Ports
- **3000** - Next.js dev server
- **8123** - ClickHouse HTTP API
- **8088** - Superset (admin/admin)
