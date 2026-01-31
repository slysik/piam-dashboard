# ClearView Intelligence Dashboard

## Overview
A multi-tenant Physical Identity and Access Management (PIAM) analytics dashboard for demonstrating real-time credential and access event visualization. Built for a 15-minute demo showcasing multi-PACS operations, governance, compliance, and mustering capabilities.

## Demo Flow (15 minutes)
1. **Executive Overview** (CEO persona) - High-level risk score, compliance rate, trend charts
2. **Real-Time Risk** (SOC persona) - Live event stream with 15s auto-feed, anomaly detection, identity drilldown
3. **Command Center** (SOC/Facilities) - Deny spikes, connector health, multi-PACS visibility
4. **Access Hygiene** (IT-HR persona) - Hire-to-retire lifecycle, terminated+active badges, dormant access
5. **Governance** - Who has access, why (policy/manual/exception), who approved
6. **Compliance & Audit** - Audit mode, privileged zone evidence, lifecycle exceptions, CSV export
7. **Access Requests** - Self-service funnel, SLA by zone, pending requests
8. **Mustering** (Facilities) - Emergency accounted/missing/en-route status
9. **Dashboard Builder** - Drag-and-drop custom dashboard creation

## Persona-Based Navigation
- **Executive (CEO)**: Executive Overview, Real-Time Risk, Compliance & Audit, Dashboard Builder
- **SOC Analyst**: Real-Time Risk, Command Center, Mustering, Dashboard Builder
- **Facilities**: Mustering, Command Center, Access Requests, Dashboard Builder
- **IT & HR**: Access Hygiene, Governance, Access Requests, Dashboard Builder
- **Compliance**: Compliance & Audit, Access Hygiene, Governance, Dashboard Builder

## Project Structure
```
/
├── backup-site/          # Next.js frontend application
│   ├── app/              # App router pages
│   │   └── page.tsx      # Main dashboard with persona-based navigation
│   ├── components/       # React components
│   │   ├── PersonaSelector.tsx    # Persona dropdown with tab visibility
│   │   ├── Navigation.tsx         # Dynamic tab navigation
│   │   ├── ExecutiveOverview.tsx  # CEO KPIs and trend charts
│   │   ├── RealTimeRiskPanel.tsx  # Live event stream with anomaly detection
│   │   ├── HireToRetireView.tsx   # Access hygiene lifecycle
│   │   ├── ComplianceView.tsx     # Audit mode with evidence tables
│   │   ├── SelfServiceAnalytics.tsx # Request funnel and SLA metrics
│   │   ├── GovernanceView.tsx     # Entitlements & approvals
│   │   ├── MusteringView.tsx      # Emergency mustering
│   │   ├── GenAIView.tsx          # Drag-and-drop dashboard builder
│   │   ├── KPICard.tsx            # Metric cards
│   │   ├── TimeSeriesChart.tsx    # Grants vs Denies chart
│   │   ├── MapView.tsx            # Door hotspots map
│   │   ├── AlertsPanel.tsx        # Top Insights alerts
│   │   ├── ConnectorHealth.tsx    # PACS connector status
│   │   ├── EventsTable.tsx        # Recent events list
│   │   └── EvidenceDrawer.tsx     # Raw payload drawer
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utility libraries
└── scripts/              # Utility scripts
```

## Running the App
The dashboard runs via the "PIAM Dashboard" workflow on port 5000.

## Key Features

### Executive Overview (CEO)
- Overall Risk Score with trend indicator
- Compliance Rate percentage
- Open Incidents count with priority breakdown
- Active Sites with connector health
- 7-day risk trend line chart
- Risk by Site horizontal bar chart

### Real-Time Risk & Anomaly Panel
- Live event stream with 15s auto-feed toggle
- Anomaly flags: after_hours, denied_streak, impossible_travel
- Risk score badges (Critical/High/Medium/Low)
- Identity drilldown with access history
- Video correlation icon with placeholder modal
- Streaming events with visual indicators

### Command Center
- Real-time KPI metrics (Events, Deny Rate, Active Doors, Suspicious, Connectors)
- Time series chart showing grants vs denies over 24h
- Door hotspot map with deny rate visualization
- Top Insights panel with anomaly detection alerts
- Multi-PACS connector health monitoring (Lenel, C-CURE, S2, Genetec, HID, Verkada)

### Access Hygiene (Hire-to-Retire)
- Lifecycle tiles: Terminated+Active Badges, Contractor Expired, Dormant Access
- HR/PIAM state matrix with exception counts
- Color-coded status (Active vs Disabled)
- Identity drilldown for each exception

### Governance
- View all access entitlements with filtering (All, Expiring, Exceptions)
- See grant type: Policy (automatic), Manual (human approved), Exception
- Full approval chain visibility
- Expiry tracking and last-used timestamps

### Compliance & Audit
- Audit Mode toggle (purple theme when active)
- Privileged Zone Access Evidence table with CSV export
- Lifecycle Exceptions table (terminated+active, expired contractors)
- Compliance by requirement type pie chart
- Expiring timeline bar chart
- Person type filtering

### Self-Service & Approval Analytics
- Request Funnel: Submitted → Approved → Provisioned with drop-off rates
- SLA by Zone bar chart (% within SLA)
- Weekly Trend stacked area chart (approved/pending/rejected)
- Access Requests table with risk levels and action buttons

### Mustering
- Emergency response view with active emergency banner
- Real-time accounted/missing/en-route personnel status
- Solid color status boxes: Green (Checked In), Red (Checked Out), Blue (Marked Safe)
- Priority missing personnel list
- One-click call and location view

### Dashboard Builder
- Drag-and-drop custom dashboard creation
- Prebuilt report library: KPIs, Charts, Tables, Alerts
- Click or drag to add widgets to dashboard
- Remove widgets with X button or clear all
- Available to all personas

## Demo Tenants
- **Acme Corporate** - Office complex scenario
- **BuildRight Construction** - Active job site scenario (more compliance issues)

## Environment Variables
- `NEXT_PUBLIC_MAPBOX_TOKEN`: Mapbox API token for full map functionality
- `CLICKHOUSE_HOST`: ClickHouse host (default: localhost)
- `CLICKHOUSE_PORT`: ClickHouse port (default: 8123)
- `CLICKHOUSE_USER`: ClickHouse username
- `CLICKHOUSE_PASSWORD`: ClickHouse password
- `CLICKHOUSE_URL`: Full ClickHouse URL (alternative to host/port)

## ClickHouse Integration

### Required Views
The dashboard queries these ClickHouse views when live data mode is enabled:

| View | Purpose | Used By |
|------|---------|---------|
| `piam.v_kpi_current` | KPI metrics (events, deny rate, suspicious) | Command Center, Executive Overview |
| `piam.v_timeseries_minute` | Per-minute grants/denies | Time Series Chart |
| `piam.v_recent_events` | Recent access events | Real-Time Risk Panel |
| `piam.v_connector_health_latest` | PACS connector status | Connector Health |
| `piam.v_door_hotspots` | Door deny hotspots | Map View |
| `piam.v_compliance_summary` | Compliance status | Compliance View |
| `piam.v_freshness` | Data freshness indicator | Settings Panel |
| `piam.v_insight_deny_spikes` | Deny spike detection | Alerts Panel |
| `piam.v_access_hygiene` | Lifecycle exceptions | Access Hygiene (not yet wired) |
| `piam.v_governance_entitlements` | Entitlements | Governance (not yet wired) |
| `piam.v_access_request_funnel` | Request metrics | Self-Service (not yet wired) |
| `piam.v_executive_risk` | Executive KPIs | Executive Overview (not yet wired) |

### Components Wired to Live Data
- ExecutiveOverview (partial - time range demos only)
- RealTimeRiskPanel
- TimeSeriesChart
- ConnectorHealth
- ComplianceView
- MapView (door hotspots)

### Components Using Demo Data Only
- HireToRetireView
- GovernanceView
- SelfServiceAnalytics
- MusteringView
- AlertsPanel

### Setup ClickHouse
Run the schema script to create all tables and views:
```bash
clickhouse-client --multiquery < backup-site/scripts/clickhouse-schema.sql
```

## Tech Stack
- Next.js 14 with App Router
- React 18
- TypeScript
- Tailwind CSS
- Recharts (charts)
- Mapbox GL (maps)

## Recent Changes
- 2026-01-31: Replaced AI Builder with Dashboard Builder (drag-and-drop widget builder)
- 2026-01-31: Added persona-based navigation with tab visibility per role
- 2026-01-31: Added Executive Overview with risk KPIs and trend charts
- 2026-01-31: Added Real-Time Risk Panel with 15s live stream toggle
- 2026-01-31: Added Hire-to-Retire Access Hygiene with lifecycle tiles
- 2026-01-31: Enhanced Compliance view with Audit Mode and evidence tables
- 2026-01-31: Added Self-Service & Approval Analytics with request funnel
- 2026-01-30: Added Governance, Compliance, and Mustering views
- 2026-01-30: Added tabbed navigation system
- 2026-01-30: Enhanced raw PACS payload evidence in drilldown
- 2026-01-30: Initial Replit setup
