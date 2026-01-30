# CloudGate PIAM Dashboard Demo

## Overview
A multi-tenant Physical Identity and Access Management (PIAM) analytics dashboard for demonstrating real-time credential and access event visualization. Built for a 15-minute demo showcasing multi-PACS operations, governance, compliance, and mustering capabilities.

## Demo Flow (15 minutes)
1. **Command Center** - Real-time deny spikes, anomaly feed, connector health, multi-PACS visibility
2. **Drilldown** - Aggregate → Event → Raw PACS payload evidence (click any event row)
3. **Governance** - Who has access, why (policy/manual/exception), who approved, expiry/last used
4. **Compliance** - Contractor/company audit with export capability and evidence links
5. **Mustering** - Accounted vs missing personnel + last-seen location during emergencies

## Project Structure
```
/
├── backup-site/          # Next.js frontend application
│   ├── app/              # App router pages
│   │   └── page.tsx      # Main dashboard with tabbed navigation
│   ├── components/       # React components
│   │   ├── Navigation.tsx        # Tab navigation
│   │   ├── KPICard.tsx           # Metric cards
│   │   ├── TimeSeriesChart.tsx   # Grants vs Denies chart
│   │   ├── MapView.tsx           # Door hotspots map
│   │   ├── AlertsPanel.tsx       # Top Insights alerts
│   │   ├── ConnectorHealth.tsx   # PACS connector status
│   │   ├── EventsTable.tsx       # Recent events list
│   │   ├── EvidenceDrawer.tsx    # Raw payload drawer
│   │   ├── GovernanceView.tsx    # Entitlements & approvals
│   │   ├── ComplianceView.tsx    # Contractor compliance
│   │   └── MusteringView.tsx     # Emergency mustering
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utility libraries
├── datagen/              # Python data generation (Docker-dependent)
├── clickhouse/           # ClickHouse schema (Docker-dependent)
└── scripts/              # Utility scripts
```

## Running the App
The dashboard runs via the "PIAM Dashboard" workflow on port 5000.

## Key Features

### Command Center
- Real-time KPI metrics (Events, Deny Rate, Active Doors, Suspicious, Connectors)
- Time series chart showing grants vs denies over 24h
- Door hotspot map with deny rate visualization
- Top Insights panel with anomaly detection alerts
- Multi-PACS connector health monitoring (Lenel, C-CURE, S2, Genetec, HID, Verkada)

### Governance
- View all access entitlements with filtering (All, Expiring, Exceptions)
- See grant type: Policy (automatic), Manual (human approved), Exception
- Full approval chain visibility
- Expiry tracking and last-used timestamps

### Compliance
- Contractor compliance dashboard
- Safety training, background check, and site induction status
- Company-level compliance summary
- Export audit capability
- Violation tracking

### Mustering
- Emergency response view with active emergency banner
- Real-time accounted/missing/en-route personnel status
- Muster point capacity tracking
- Priority missing personnel list
- One-click call and location view

## Demo Tenants
- **Acme Corporate** - Office complex scenario
- **BuildRight Construction** - Active job site scenario (more compliance issues)

## Environment Variables
- `NEXT_PUBLIC_MAPBOX_TOKEN`: Mapbox API token for full map functionality

## Tech Stack
- Next.js 14 with App Router
- React 18
- TypeScript
- Tailwind CSS
- Recharts (charts)
- Mapbox GL (maps)

## Recent Changes
- 2026-01-30: Added Governance, Compliance, and Mustering views
- 2026-01-30: Added tabbed navigation system
- 2026-01-30: Enhanced raw PACS payload evidence in drilldown
- 2026-01-30: Initial Replit setup
