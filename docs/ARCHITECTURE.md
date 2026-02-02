# ClearView Intelligence Architecture

> A comprehensive technical guide to the ClearView Intelligence Physical Identity and Access Management (PIAM) analytics platform.

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Data Flow](#data-flow)
4. [ClickHouse Schema](#clickhouse-schema)
5. [React Component Hierarchy](#react-component-hierarchy)
6. [Auto-Refresh Pattern](#auto-refresh-pattern)
7. [Multi-Tenant Architecture](#multi-tenant-architecture)
8. [Persona-Based Navigation](#persona-based-navigation)
9. [Performance Considerations](#performance-considerations)
10. [Interactive Diagram](#interactive-diagram)

---

## Overview

### What is ClearView Intelligence?

ClearView Intelligence is a next-generation Physical Identity and Access Management (PIAM) analytics platform designed for enterprise security operations centers. It transforms fragmented physical access control systems into a unified security intelligence platform.

### Why It Exists

Modern enterprises face significant challenges managing physical access across multiple facilities:

- **Fragmented PACS Ecosystems**: Organizations often operate 3-6 different Physical Access Control Systems (Lenel, C-CURE, S2, Genetec, HID, Verkada) across their facilities
- **Compliance Burden**: Auditors require evidence chains from aggregate metrics down to raw PACS payloads
- **Incident Response Delays**: Without unified visibility, security teams cannot detect deny spikes or suspicious access patterns in real-time
- **Governance Gaps**: Manual entitlement management leads to orphaned access, terminated employees with active badges, and expired contractor credentials

ClearView Intelligence solves these problems by providing:

| Capability | Description |
|------------|-------------|
| **Multi-PACS Aggregation** | Unified view across Lenel, C-CURE, S2, Genetec, HID, and Verkada systems |
| **Real-Time Analytics** | Live event streaming with sub-second deny spike detection |
| **Audit Evidence Chain** | Click-through from aggregate metrics to raw PACS payloads |
| **Entitlement Governance** | Full visibility into who has access, why, and who approved it |
| **Contractor Compliance** | Track safety training, background checks, and site inductions |
| **Emergency Mustering** | Real-time personnel accountability during evacuations |
| **AI Dashboard Builder** | Natural language dashboard generation powered by GPT-4 |

---

## System Architecture

### High-Level Architecture Diagram

```
+==================================================================================+
|                         ClearView Intelligence Platform                           |
+==================================================================================+

                            PACS CONNECTOR LAYER
    +-------------+    +-------------+    +-------------+    +-------------+
    |   Lenel     |    |   C-CURE    |    |     S2      |    |  Genetec    |
    | OnGuard     |    |   9000      |    |  NetBox     |    |  Synergis   |
    | Connector   |    | Connector   |    | Connector   |    | Connector   |
    +------+------+    +------+------+    +------+------+    +------+------+
           |                  |                  |                  |
           +------------------+------------------+------------------+
                                      |
                              [Event Ingestion]
                              5 events/batch
                              ~200 events/min
                                      |
                                      v
+==================================================================================+
|                        CLICKHOUSE OLAP DATABASE (Port 8123)                       |
|----------------------------------------------------------------------------------|
|                                                                                  |
|  +------------------------+     +------------------------+                       |
|  |   DIMENSION TABLES     |     |      FACT TABLES       |                       |
|  |------------------------|     |------------------------|                       |
|  | dim_tenant             |     | fact_access_events     |  <-- Core event table |
|  | dim_site               |     | fact_connector_health  |                       |
|  | dim_location           |     | fact_compliance_status |                       |
|  | dim_person             |     | fact_access_requests   |                       |
|  | dim_entitlement        |     +------------------------+                       |
|  +------------------------+                                                      |
|                                                                                  |
|  +------------------------+     +------------------------+                       |
|  |    ROLLUP TABLES       |     |    MATERIALIZED VIEWS  |                       |
|  |------------------------|     |------------------------|                       |
|  | rollup_access_minute   | <-- | mv_rollup_access_minute|                       |
|  | rollup_door_hour       | <-- | mv_rollup_door_hour    |                       |
|  | rollup_baseline_hour   |     +------------------------+                       |
|  +------------------------+                                                      |
|                                                                                  |
|  +-------------------------------------------------------------------+           |
|  |                      QUERY VIEWS (API-Ready)                       |           |
|  |-------------------------------------------------------------------|           |
|  | v_kpi_current           | Dashboard KPIs              | 15s refresh|           |
|  | v_timeseries_minute     | Time-series charts          | 15s refresh|           |
|  | v_door_hotspots         | Map visualization           | 30s refresh|           |
|  | v_recent_events         | Event stream table          |  5s refresh|           |
|  | v_connector_health      | PACS status                 | 10s refresh|           |
|  | v_insight_deny_spikes   | Anomaly detection           | 30s refresh|           |
|  | v_freshness             | Data age tracking           |  5s refresh|           |
|  | v_access_hygiene        | Lifecycle exceptions        | 60s refresh|           |
|  | v_governance_entitle... | Entitlement details         | 60s refresh|           |
|  | v_compliance_summary    | Contractor compliance       | 60s refresh|           |
|  | v_executive_risk        | Executive risk KPIs         | 30s refresh|           |
|  +-------------------------------------------------------------------+           |
|                                                                                  |
+==================================================================================+
                                      |
                              [HTTP REST API]
                              JSON responses
                                      |
                                      v
+==================================================================================+
|                     NEXT.JS API LAYER (Port 3000)                                |
|----------------------------------------------------------------------------------|
|                                                                                  |
|  /api/clickhouse                                                                 |
|  +-------------------------------------------------------------------+           |
|  |  - Receives parameterized queries from frontend                    |           |
|  |  - Proxies to ClickHouse HTTP API                                  |           |
|  |  - Handles authentication and error responses                      |           |
|  |  - Returns JSON array results                                      |           |
|  +-------------------------------------------------------------------+           |
|                                                                                  |
+==================================================================================+
                                      |
                              [React Hooks]
                              useClickHouse()
                              Auto-refresh
                                      |
                                      v
+==================================================================================+
|                        REACT FRONTEND (Next.js App Router)                       |
|----------------------------------------------------------------------------------|
|                                                                                  |
|  +---------------------------+  +---------------------------+                    |
|  |      CONTEXTS             |  |        HOOKS              |                    |
|  |---------------------------|  |---------------------------|                    |
|  | DataContext               |  | useClickHouse             |                    |
|  |  - tenant                 |  | useKPIData                |                    |
|  |  - useLiveData            |  | useTimeSeriesData         |                    |
|  |  - clickhouseUrl          |  | useDoorHotspots           |                    |
|  +---------------------------+  | useRecentEvents           |                    |
|                                 | useConnectorHealth        |                    |
|                                 | useInsights               |                    |
|                                 | useFreshness              |                    |
|                                 +---------------------------+                    |
|                                                                                  |
|  +-------------------------------------------------------------------+           |
|  |                      DASHBOARD COMPONENTS                          |           |
|  |-------------------------------------------------------------------|           |
|  | KPICard          | TimeSeriesChart  | MapView         | EventsTable|           |
|  | AlertsPanel      | ConnectorHealth  | EvidenceDrawer  | Navigation |           |
|  | TenantSelector   | PersonaSelector  | SettingsPanel   |            |           |
|  |-------------------------------------------------------------------|           |
|  | ExecutiveOverview | RealTimeRiskPanel | GovernanceView  |           |           |
|  | ComplianceView    | MusteringView     | GenAIView       |           |           |
|  | HireToRetireView  | SelfServiceAnalytics                |           |           |
|  +-------------------------------------------------------------------+           |
|                                                                                  |
+==================================================================================+
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 (App Router) | React framework with server components |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **Charts** | Recharts | React charting library |
| **Maps** | Mapbox GL | Interactive map visualizations |
| **AI** | OpenAI GPT-4 | Natural language dashboard generation |
| **Database** | ClickHouse | Column-oriented OLAP database |
| **Containers** | Docker Compose | Local development orchestration |

---

## Data Flow

### Step-by-Step: Badge Swipe to Dashboard Display

```
Step 1: Badge Swipe
+-------------------+
|  Employee badges  |
|  at door reader   |
+--------+----------+
         |
         v
Step 2: PACS Processing
+-------------------+
| Lenel OnGuard     |
| processes event,  |
| logs GRANT/DENY   |
+--------+----------+
         |
         v
Step 3: Connector Ingestion
+-------------------+
| Lenel Connector   |
| polls events,     |
| transforms to     |
| common schema     |
+--------+----------+
         |
         v
Step 4: ClickHouse Insert
+-------------------+
| INSERT INTO       |
| fact_access_events|
| (event_id, ...)   |
+--------+----------+
         |
         v
Step 5: Materialized View Aggregation
+-------------------+
| mv_rollup_*       |
| automatically     |
| updates rollup    |
| tables            |
+--------+----------+
         |
         v
Step 6: View Query
+-------------------+
| Frontend calls    |
| /api/clickhouse   |
| with query for    |
| v_kpi_current     |
+--------+----------+
         |
         v
Step 7: API Response
+-------------------+
| JSON array with   |
| events_15m,       |
| deny_rate_15m,    |
| suspicious_15m    |
+--------+----------+
         |
         v
Step 8: React Render
+-------------------+
| KPICard component |
| displays:         |
| "Events: 1,247"   |
| "Deny Rate: 2.5%" |
+-------------------+
```

### Event Lifecycle Timing

| Stage | Latency | Description |
|-------|---------|-------------|
| Badge Swipe | 0ms | Physical event occurs |
| PACS Decision | <100ms | Grant/deny decision made |
| Connector Poll | 1-5s | Batch collected from PACS |
| ClickHouse Insert | <50ms | Event written to fact table |
| MV Aggregation | <100ms | Rollup tables updated |
| Frontend Refresh | 5-30s | Dashboard polls for updates |
| **Total End-to-End** | **~10-35s** | From badge swipe to dashboard |

---

## ClickHouse Schema

### Core Tables

#### Dimension Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `dim_tenant` | Multi-tenant isolation | `tenant_id`, `tenant_name`, `industry` |
| `dim_site` | Physical locations | `site_id`, `site_name`, `lat`, `lon` |
| `dim_location` | Doors/access points | `location_id`, `location_name`, `is_high_risk` |
| `dim_person` | Employees/contractors | `person_id`, `badge_id`, `badge_status` |
| `dim_entitlement` | Access grants | `entitlement_id`, `approval_type`, `valid_until` |

#### Fact Tables

| Table | Description | Retention | Key Columns |
|-------|-------------|-----------|-------------|
| `fact_access_events` | Core event table | 90 days | `event_id`, `event_time`, `result`, `suspicious_flag` |
| `fact_connector_health` | PACS status | 7 days | `connector_id`, `status`, `latency_ms` |
| `fact_compliance_status` | Training/certifications | N/A | `requirement_type`, `expiry_date`, `status` |
| `fact_access_requests` | Workflow tracking | N/A | `request_id`, `status`, `within_sla` |

### Rollup Tables (Pre-Aggregated)

```sql
-- Minute-level rollup for time-series charts
CREATE TABLE piam.rollup_access_minute
(
    tenant_id       String,
    site_id         String,
    location_id     String,
    minute          DateTime,
    total_events    UInt64,
    grants          UInt64,
    denies          UInt64,
    suspicious      UInt64,
    unique_badges   AggregateFunction(uniq, String),
    unique_persons  AggregateFunction(uniq, Nullable(String))
)
ENGINE = AggregatingMergeTree()
ORDER BY (tenant_id, minute, site_id, location_id);

-- Materialized view auto-populates from fact_access_events
CREATE MATERIALIZED VIEW piam.mv_rollup_access_minute
TO piam.rollup_access_minute
AS SELECT
    tenant_id,
    site_id,
    location_id,
    toStartOfMinute(event_time) AS minute,
    count() AS total_events,
    countIf(result IN ('grant', 'granted')) AS grants,
    countIf(result IN ('deny', 'denied')) AS denies,
    countIf(suspicious_flag = 1) AS suspicious,
    uniqState(badge_id) AS unique_badges,
    uniqState(person_id) AS unique_persons
FROM piam.fact_access_events
GROUP BY tenant_id, site_id, location_id, minute;
```

### Query Views (API-Ready Endpoints)

| View | Purpose | Refresh Interval |
|------|---------|------------------|
| `v_kpi_current` | Dashboard KPIs (15m, 60m, 24h windows) | 15s |
| `v_timeseries_minute` | Grants vs denies time-series | 15s |
| `v_door_hotspots` | Map visualization with deny rates | 30s |
| `v_recent_events` | Event stream with person/location joins | 5s |
| `v_connector_health_latest` | Latest PACS connector status | 10s |
| `v_insight_deny_spikes` | Anomaly detection vs baselines | 30s |
| `v_freshness` | Data age and event count | 5s |
| `v_access_hygiene` | Lifecycle exceptions (orphaned badges) | 60s |
| `v_governance_entitlements` | Entitlement details with last-used | 60s |
| `v_compliance_summary` | Contractor compliance status | 60s |
| `v_executive_risk` | Executive-level risk KPIs | 30s |
| `v_access_request_funnel` | Request workflow metrics | 60s |

### Example View: KPI Current

```sql
CREATE OR REPLACE VIEW piam.v_kpi_current AS
SELECT
    tenant_id,
    countIf(event_time > now() - INTERVAL 15 MINUTE) AS events_15m,
    countIf(event_time > now() - INTERVAL 15 MINUTE AND result IN ('grant', 'granted')) AS grants_15m,
    countIf(event_time > now() - INTERVAL 15 MINUTE AND result IN ('deny', 'denied')) AS denies_15m,
    round(if(countIf(event_time > now() - INTERVAL 15 MINUTE) > 0,
       countIf(event_time > now() - INTERVAL 15 MINUTE AND result IN ('deny', 'denied')) * 100.0 /
       countIf(event_time > now() - INTERVAL 15 MINUTE), 0), 1) AS deny_rate_15m,
    countIf(event_time > now() - INTERVAL 15 MINUTE AND suspicious_flag = 1) AS suspicious_15m,
    -- ... additional time windows (60m, 24h)
FROM piam.fact_access_events
WHERE event_time > now() - INTERVAL 24 HOUR
GROUP BY tenant_id;
```

---

## React Component Hierarchy

### Component Organization

```
app/
  layout.tsx              # Root layout with metadata
  page.tsx                # Main dashboard orchestrator

components/
  # Layout & Navigation
  Navigation.tsx          # Tab bar with persona-filtered tabs
  PersonaSelector.tsx     # Role switcher (CEO, SOC, etc.)
  TenantSelector.tsx      # Multi-tenant switcher
  SettingsPanel.tsx       # Live data toggle, refresh settings

  # Core Dashboard Components
  KPICard.tsx             # Metric display with trend indicator
  TimeSeriesChart.tsx     # Recharts line chart (grants vs denies)
  MapView.tsx             # Mapbox GL door hotspot visualization
  EventsTable.tsx         # Real-time event stream
  AlertsPanel.tsx         # Anomaly alerts
  EvidenceDrawer.tsx      # Click-through to raw PACS payload
  ConnectorHealth.tsx     # PACS connector status grid

  # View-Specific Components
  ExecutiveOverview.tsx   # CEO dashboard
  RealTimeRiskPanel.tsx   # SOC risk monitoring
  GovernanceView.tsx      # Entitlement management
  ComplianceView.tsx      # Contractor audit
  MusteringView.tsx       # Emergency response
  GenAIView.tsx           # AI dashboard builder
  HireToRetireView.tsx    # Access hygiene
  SelfServiceAnalytics.tsx # Self-service requests

contexts/
  DataContext.tsx         # Shared state (tenant, useLiveData)

hooks/
  useClickHouse.ts        # Auto-refresh data fetching
```

### Component-to-Data Mapping

| Component | Data Hook | ClickHouse View | Refresh |
|-----------|-----------|-----------------|---------|
| KPICard | `useKPIData()` | `v_kpi_current` | 15s |
| TimeSeriesChart | `useTimeSeriesData()` | `v_timeseries_minute` | 15s |
| MapView | `useDoorHotspots()` | `v_door_hotspots` | 30s |
| EventsTable | `useRecentEvents()` | `v_recent_events` | 5s |
| ConnectorHealth | `useConnectorHealth()` | `v_connector_health_latest` | 10s |
| AlertsPanel | `useInsights()` | `v_insight_deny_spikes` | 30s |

---

## Auto-Refresh Pattern

### The useClickHouse Hook

The core data fetching pattern uses a custom hook that provides:
- Parameterized ClickHouse queries
- Configurable auto-refresh intervals
- Graceful fallback data when ClickHouse is unavailable
- Loading and error state management

```typescript
// hooks/useClickHouse.ts

interface UseClickHouseOptions<T> {
  query: string;
  params?: Record<string, string | number>;
  enabled?: boolean;
  refreshInterval?: number;
  fallbackData?: T;
}

interface UseClickHouseResult<T> {
  data: T | null;
  loading: boolean;
  error: ClickHouseError | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useClickHouse<T>({
  query,
  params,
  enabled = true,
  refreshInterval,
  fallbackData,
}: UseClickHouseOptions<T>): UseClickHouseResult<T> {
  const [data, setData] = useState<T | null>(fallbackData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClickHouseError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await queryClickHouse<T>(query, params);
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      const clickhouseError = err as ClickHouseError;
      setError(clickhouseError);

      // Use fallback data if available
      if (fallbackData && !data) {
        setData(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  }, [query, params, enabled, fallbackData, data]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh interval
  useEffect(() => {
    if (!refreshInterval || !enabled) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, enabled, fetchData]);

  return { data, loading, error, refetch, lastUpdated };
}
```

### Usage Example

```typescript
// Example: Fetching KPI data with 15-second refresh
export function useKPIData(tenant: string) {
  return useClickHouse({
    query: `
      SELECT
        events_15m,
        denies_15m,
        deny_rate_15m,
        suspicious_15m
      FROM piam.v_kpi_current
      WHERE tenant_id = {tenant:String}
      LIMIT 1
    `,
    params: { tenant },
    refreshInterval: 15000,  // Auto-refresh every 15 seconds
    fallbackData: {
      events_15m: 0,
      denies_15m: 0,
      deny_rate_15m: 0,
      suspicious_15m: 0,
    },
  });
}
```

### Refresh Interval Strategy

| Data Type | Interval | Rationale |
|-----------|----------|-----------|
| Event Stream | 5s | Near real-time visibility for SOC |
| KPIs | 15s | Balance freshness vs. query load |
| Time Series | 15s | Match KPI refresh for consistency |
| Connector Health | 10s | Quick detection of PACS issues |
| Door Hotspots | 30s | Map updates less frequently needed |
| Anomaly Detection | 30s | Baseline comparisons are expensive |
| Compliance/Governance | 60s | Slower-changing data |

---

## Multi-Tenant Architecture

### Tenant Isolation

All data in ClearView Intelligence is isolated by `tenant_id`. This column is:
- Present in every dimension and fact table
- Included in every view's WHERE clause
- Passed as a parameter from the frontend

### Demo Tenants

| Tenant ID | Scenario | Characteristics |
|-----------|----------|-----------------|
| `acme` | Corporate Office | Lower deny rates (~2.5%), stable operations, 127 active doors |
| `buildright` | Construction Site | Higher deny rates (~8%), more compliance issues, contractor-heavy |

### Query Pattern

```typescript
// Frontend passes tenant to all queries
const { data } = useClickHouse({
  query: `
    SELECT * FROM piam.v_kpi_current
    WHERE tenant_id = {tenant:String}  -- Tenant filter
    LIMIT 1
  `,
  params: { tenant },  // 'acme' or 'buildright'
  refreshInterval: 15000,
});
```

### Context-Based Tenant State

```typescript
// contexts/DataContext.tsx
export function DataProvider({
  children,
  useLiveData,
  clickhouseUrl,
  tenant,
}: {
  children: ReactNode;
  useLiveData: boolean;
  clickhouseUrl: string;
  tenant: string;  // 'acme' | 'buildright'
}) {
  return (
    <DataContext.Provider value={{ useLiveData, clickhouseUrl, tenant }}>
      {children}
    </DataContext.Provider>
  );
}
```

---

## Persona-Based Navigation

### Available Personas

| Persona | Role | Primary Concerns |
|---------|------|------------------|
| `ceo` | Executive | Risk overview, compliance posture, strategic metrics |
| `soc` | Security Operations | Real-time threats, incident response, mustering |
| `facilities` | Facilities Manager | Building operations, emergency response, requests |
| `ithr` | IT/HR Admin | Access hygiene, governance, provisioning |
| `compliance` | Compliance Officer | Audit readiness, hygiene, entitlements |

### Tab Visibility Matrix

```typescript
const personaTabs: Record<Persona, string[]> = {
  ceo:        ['executive', 'risk', 'compliance', 'genai'],
  soc:        ['risk', 'command', 'mustering', 'genai'],
  facilities: ['mustering', 'command', 'requests', 'genai'],
  ithr:       ['hygiene', 'governance', 'requests', 'genai'],
  compliance: ['compliance', 'hygiene', 'governance', 'genai'],
};
```

### All Available Tabs

| Tab ID | Label | Description |
|--------|-------|-------------|
| `executive` | Executive Overview | High-level risk and compliance KPIs |
| `risk` | Real-Time Risk | Live threat monitoring and suspicious activity |
| `command` | Command Center | Operational dashboard with KPIs, maps, events |
| `hygiene` | Access Hygiene | Orphaned badges, dormant access, lifecycle issues |
| `governance` | Governance | Entitlement management and approval chains |
| `compliance` | Compliance & Audit | Contractor certifications and audit export |
| `requests` | Access Requests | Self-service request tracking and SLA metrics |
| `mustering` | Mustering | Emergency personnel accountability |
| `genai` | Dashboard Builder | AI-powered dashboard generation |

### Default Tab by Persona

```typescript
const personaDefaults: Record<Persona, string> = {
  ceo:        'executive',
  soc:        'risk',
  facilities: 'mustering',
  ithr:       'hygiene',
  compliance: 'compliance',
};
```

---

## Performance Considerations

### Pre-Aggregation Strategy

ClickHouse performance is optimized through materialized views that pre-aggregate data:

1. **Write-Time Aggregation**: Materialized views (`mv_rollup_*`) process events as they are inserted
2. **Query-Time Efficiency**: Dashboard queries read from pre-aggregated rollup tables instead of scanning fact tables
3. **Storage Trade-off**: Rollup tables use additional storage but reduce query latency from seconds to milliseconds

### View Refresh Strategy

Views in ClickHouse are evaluated at query time. To maintain performance:

| Pattern | Use Case | Example |
|---------|----------|---------|
| Simple View | Joins with dimensions | `v_recent_events` joins with `dim_person`, `dim_location` |
| Materialized View | Pre-aggregated metrics | `mv_rollup_access_minute` auto-aggregates on insert |
| Bounded View | Large table scans | `v_recent_events_24h` limits to 24-hour window |

### Fallback Data Pattern

When ClickHouse is unavailable, the UI gracefully degrades:

```typescript
useClickHouse({
  query: `SELECT ... FROM piam.v_kpi_current`,
  params: { tenant },
  refreshInterval: 15000,
  fallbackData: {        // Static data shown when CH is down
    events_15m: 0,
    denies_15m: 0,
    deny_rate_15m: 0,
    suspicious_15m: 0,
  },
});
```

This ensures:
- Dashboard remains functional during ClickHouse outages
- Users see zeros rather than errors
- Error state is still available for debugging

### Query Optimization Tips

1. **Always filter by tenant_id first**: It's the leading column in ORDER BY
2. **Use time windows in views**: Limit scans to recent data (e.g., 24h, 60m)
3. **Leverage LowCardinality**: String columns like `result`, `pacs_source` use dictionary encoding
4. **Bloom filter indexes**: `badge_id` and `person_id` have bloom filters for efficient point lookups

---

## Interactive Diagram

For a visual, interactive presentation of the architecture, view the HTML presentation:

**[View Live Architecture Diagram](http://localhost:3000/architecture.html)**

The interactive diagram includes:

| Slide | Content |
|-------|---------|
| **Overview** | Full stack layer diagram with all components |
| **Data Layer** | ClickHouse tables, views, and refresh rates |
| **API Layer** | Next.js route handlers with code examples |
| **Hooks Layer** | `useClickHouse` auto-refresh implementation |
| **Components** | React component to data source mapping |
| **Data Flow** | 8-step sequence from badge swipe to dashboard |

> **Tip:** Use left/right arrow keys to navigate between slides.

The interactive diagram is located at:
```
backup-site/public/architecture.html
```

---

## Quick Reference

### Service Ports

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Next.js | Development server |
| 8123 | ClickHouse | HTTP API |
| 8088 | Superset | Analytics UI (admin/admin) |

### Common Commands

```bash
# Start all services
make quickstart

# Start just ClickHouse + Superset
make up

# Generate synthetic data
make generate

# Start live event trickle
make trickle

# ClickHouse CLI
make shell-ch

# Frontend development
cd backup-site && npm run dev
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CLICKHOUSE_HOST` | ClickHouse hostname | `localhost` |
| `CLICKHOUSE_PORT` | ClickHouse HTTP port | `8123` |
| `CLICKHOUSE_DB` | Database name | `piam` |
| `MAPBOX_API_KEY` | Map visualization | Required |
| `OPENAI_API_KEY` | AI Dashboard Builder | Required |

---

*This document was generated for ClearView Intelligence v1.0*
