# ClearView Intelligence

<div align="center">

![ClearView Logo](https://img.shields.io/badge/ClearView-Intelligence-4F46E5?style=for-the-badge&logo=shield&logoColor=white)

**Unified Physical Identity & Access Management Analytics**

*Transform fragmented access control systems into actionable security intelligence*

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![ClickHouse](https://img.shields.io/badge/ClickHouse-Cloud-FFCC00?style=flat-square&logo=clickhouse&logoColor=black)](https://clickhouse.com/)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)

[Live Demo](#demo-flow) | [Features](#features) | [Quick Start](#quick-start) | [Architecture](#architecture)

</div>

---

## Overview

ClearView Intelligence is an enterprise-grade **Physical Identity and Access Management (PIAM)** analytics platform that unifies multiple access control systems into a single pane of glass. Built for Security Operations Centers, Facilities teams, and Compliance officers who need real-time visibility across their physical security infrastructure.

### The Problem We Solve

| Challenge | ClearView Solution |
|-----------|-------------------|
| Siloed PACS systems | Unified view across 6+ major vendors |
| Delayed threat detection | Real-time streaming with 15-second refresh |
| Audit preparation nightmare | One-click evidence export with full drill-down |
| Badge lifecycle gaps | Hire-to-retire visibility with exception detection |
| Emergency chaos | Instant mustering with missing personnel alerts |

---

## Features

### Persona-Based Navigation

ClearView adapts to your role, showing only the views that matter:

| Persona | Available Views |
|---------|-----------------|
| **Executive (CEO)** | Executive Overview, Real-Time Risk, Compliance & Audit, Dashboard Builder |
| **SOC Analyst** | Real-Time Risk, Command Center, Mustering, Dashboard Builder |
| **Facilities** | Mustering, Command Center, Access Requests, Dashboard Builder |
| **IT & HR** | Access Hygiene, Governance, Access Requests, Dashboard Builder |
| **Compliance** | Compliance & Audit, Access Hygiene, Governance, Dashboard Builder |

---

### Executive Overview

High-level KPIs for leadership with trend analysis.

| Metric | Description |
|--------|-------------|
| **Overall Risk Score** | Composite score with week-over-week trend |
| **Compliance Rate** | Percentage of identities in compliance |
| **Open Incidents** | Active security incidents by priority |
| **Active Sites** | Sites with healthy connector status |

**Charts:**
- 7-Day Risk Trend line chart
- Risk by Site horizontal bar chart
- Compliance breakdown by category
- High-priority alerts feed

---

### Real-Time Risk & Anomaly Detection

Live event streaming with intelligent anomaly flagging.

| Anomaly Type | Detection Logic |
|--------------|-----------------|
| `after_hours` | Access outside business hours |
| `denied_streak` | 3+ consecutive denials |
| `impossible_travel` | Access from distant locations in short time |
| `tailgating` | Multiple entries on single badge swipe |

**Features:**
- 15-second auto-refresh toggle
- Risk score badges (Critical/High/Medium/Low)
- Identity drill-down with access history
- Video correlation placeholder

---

### Command Center

Operational visibility for SOC and Facilities teams.

| Component | Purpose |
|-----------|---------|
| **Live KPIs** | Events, Deny Rate, Active Doors, Suspicious Activity |
| **Time Series** | 24-hour grants vs denies visualization |
| **Door Hotspot Map** | Geographic deny rate visualization |
| **Top Insights** | AI-detected anomalies and alerts |
| **Connector Health** | Status of all integrated PACS systems |

**Supported PACS:**
- Lenel OnGuard
- C-CURE 9000
- S2 NetBox
- Genetec Synergis
- HID ORIGO
- Verkada Access

---

### Access Hygiene (Hire-to-Retire)

Complete identity lifecycle management.

| Exception Type | Risk |
|----------------|------|
| **Terminated + Active Badge** | Critical - Immediate revocation needed |
| **Contractor Expired** | High - Compliance violation |
| **Dormant Access** | Medium - 90+ days unused |
| **Orphan Accounts** | High - No HR record match |

---

### Governance

Full entitlement visibility with approval chains.

| Grant Type | Meaning |
|------------|---------|
| **Policy** | Automatic based on role/department rules |
| **Manual** | Human-approved access request |
| **Exception** | Approved deviation from policy |

**Features:**
- Filter by All / Expiring / Exceptions
- Approval chain with timestamps
- Last-used tracking
- Expiry alerts

---

### Compliance & Audit

Audit-ready evidence collection with one-click export.

| Feature | Description |
|---------|-------------|
| **Audit Mode** | Purple theme toggle for demo/training |
| **Evidence Tables** | Privileged zone access with raw PACS payloads |
| **Lifecycle Exceptions** | Terminated+active, expired contractors |
| **CSV Export** | One-click download for auditors |

---

### Self-Service & Access Requests

Request funnel analytics and SLA tracking.

| Metric | Visualization |
|--------|---------------|
| **Request Funnel** | Submitted → Approved → Provisioned |
| **SLA by Zone** | Percentage within SLA by security zone |
| **Weekly Trend** | Stacked area (approved/pending/rejected) |

---

### Mustering

Emergency response personnel accountability.

| Status | Visual |
|--------|--------|
| **Checked In** | Green solid |
| **Checked Out** | Red solid |
| **Marked Safe** | Blue solid |

**Features:**
- Active emergency banner
- Priority missing personnel list
- One-click call and locate
- Real-time headcount updates

---

### Dashboard Builder

Drag-and-drop custom dashboard creation.

| Widget Type | Examples |
|-------------|----------|
| **KPIs** | Risk Score, Compliance Rate, Event Count |
| **Charts** | Time Series, Bar Charts, Pie Charts |
| **Tables** | Events, Exceptions, Requests |
| **Alerts** | Top Insights, Anomalies |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ClearView Intelligence Platform                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Lenel   │ │  C-CURE  │ │    S2    │ │ Genetec  │ │   HID    │ ...   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │            │            │              │
│       └────────────┴─────┬──────┴────────────┴────────────┘              │
│                          ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              ClickHouse Cloud (Real-Time Analytics)                │  │
│  │         Normalize • Dedupe • Enrich • Stream • Aggregate          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                          │                                               │
│         ┌────────────────┼────────────────┬──────────────┐              │
│         ▼                ▼                ▼              ▼              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Analytics  │  │ Governance  │  │ Compliance  │  │  Mustering  │    │
│  │   Engine    │  │   Engine    │  │   Engine    │  │   Engine    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                          │                                               │
│                          ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js 14 Dashboard UI                         │  │
│  │            React • TypeScript • Tailwind • Recharts               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- (Optional) Mapbox token for full map functionality
- (Optional) ClickHouse Cloud for live data

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/clearview-intelligence.git
cd clearview-intelligence/backup-site

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```env
# Optional: Mapbox for interactive door hotspot map
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here

# Optional: ClickHouse Cloud for live data (demo data works without these)
CLICKHOUSE_USER=your_username
CLICKHOUSE_PASSWORD=your_password
```

### Local Mac Demo (Offline)

For offline demos without internet:

```bash
# One-command setup and run
./run-local.sh
```

The app runs on **http://localhost:5000** with full demo data - no internet required.

---

## Demo Flow

Recommended **15-minute** presentation:

| Time | View | Talking Points |
|------|------|----------------|
| 0-2 min | **Executive Overview** | Risk score trends, compliance rate, open incidents |
| 2-5 min | **Real-Time Risk** | Live event stream, anomaly detection, identity drill-down |
| 5-7 min | **Command Center** | Deny spikes, door hotspots, connector health |
| 7-9 min | **Access Hygiene** | Terminated+active badges, dormant access, lifecycle tiles |
| 9-11 min | **Governance** | Who has access, why, who approved |
| 11-13 min | **Compliance & Audit** | Audit mode, evidence tables, CSV export |
| 13-15 min | **Dashboard Builder** | Drag-and-drop custom dashboards |

### Demo Tenants

| Tenant | Scenario | Characteristics |
|--------|----------|-----------------|
| **Acme Corporate** | Office complex | Lower deny rates, stable operations |
| **BuildRight Construction** | Active job site | Higher compliance issues, contractor activity |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.0 |
| **Styling** | Tailwind CSS 3.4 |
| **Charts** | Recharts |
| **Maps** | Mapbox GL |
| **Database** | ClickHouse Cloud |
| **Deployment** | Vercel / Replit |

---

## Project Structure

```
backup-site/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main dashboard with persona navigation
│   └── api/               # API routes (ClickHouse proxy)
├── components/            # React components
│   ├── PersonaSelector.tsx
│   ├── Navigation.tsx
│   ├── ExecutiveOverview.tsx
│   ├── RealTimeRiskPanel.tsx
│   ├── CommandCenter.tsx
│   ├── HireToRetireView.tsx
│   ├── GovernanceView.tsx
│   ├── ComplianceView.tsx
│   ├── SelfServiceAnalytics.tsx
│   ├── MusteringView.tsx
│   ├── GenAIView.tsx      # Dashboard Builder
│   └── ...
├── hooks/                 # Custom React hooks
│   └── useDashboardData.ts
├── lib/                   # Utilities
└── run-local.sh          # One-command local setup
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

<div align="center">

**ClearView Intelligence**

*Unified Physical Security Intelligence for the Modern Enterprise*

Built with passion by the SoloInsights team

</div>
