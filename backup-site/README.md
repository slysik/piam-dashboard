# Identity & Access Analytics

A next-generation **Physical Identity and Access Management** analytics platform designed for enterprise security operations centers. Built to unify multi-PACS environments, provide real-time threat detection, and streamline compliance workflows.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## Overview

This platform transforms fragmented physical access control systems into a unified security intelligence platform. Whether you're managing a single corporate campus or hundreds of construction sites, it provides the visibility, governance, and compliance tools you need.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| **Multi-PACS Aggregation** | Unified view across Lenel, C-CURE, S2, Genetec, HID, and Verkada systems |
| **Real-Time Analytics** | Live event streaming with sub-second deny spike detection |
| **Audit Evidence Chain** | Click-through from aggregate metrics to raw PACS payloads |
| **Entitlement Governance** | Full visibility into who has access, why, and who approved it |
| **Contractor Compliance** | Track safety training, background checks, and site inductions |
| **Emergency Mustering** | Real-time personnel accountability during evacuations |
| **AI Dashboard Builder** | Natural language dashboard generation powered by GPT-4 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 Identity & Access Analytics Platform              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Lenel     │  │   C-CURE    │  │     S2      │   ...        │
│  │  Connector  │  │  Connector  │  │  Connector  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Event Aggregation Layer                    │  │
│  │         (Normalize, Dedupe, Enrich, Stream)               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                       │
│         ┌────────────────┼────────────────┐                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Analytics  │  │ Governance  │  │ Compliance  │              │
│  │   Engine    │  │   Engine    │  │   Engine    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                          │                                       │
│                          ▼                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   React Dashboard UI                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dashboard Views

### Command Center
Real-time operational visibility with:
- Live KPI metrics (Events, Deny Rate, Active Doors, Suspicious Activity)
- 24-hour grants vs denies time series
- Door hotspot map with deny rate visualization
- Anomaly detection alerts
- Multi-PACS connector health monitoring

### Governance
Complete entitlement management:
- Filter by All / Expiring / Exceptions
- Grant type visibility (Policy, Manual, Exception)
- Full approval chain with timestamps
- Last-used tracking for access hygiene

### Compliance
Contractor and vendor management:
- Safety training status tracking
- Background check verification
- Site induction compliance
- Company-level audit summaries
- One-click CSV export for auditors

### Mustering
Emergency response coordination:
- Real-time personnel status (Accounted/Missing/En-Route)
- Muster point capacity visualization
- Priority missing personnel alerts
- Last-seen location tracking
- One-click communication actions

### AI Builder
Next-generation dashboard creation:
- Describe dashboards in natural language
- Watch AI generate KPIs, charts, and tables in real-time
- Pre-built prompts for common scenarios
- Powered by GPT-4

---

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

The application runs on port 5000 by default.

---

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Maps**: Mapbox GL
- **AI**: OpenAI GPT-4

---

## Multi-Tenant Support

Switch between tenant scenarios to demo different use cases:

| Tenant | Scenario | Characteristics |
|--------|----------|-----------------|
| **Acme Corporate** | Office complex | Lower deny rates, stable operations |
| **BuildRight Construction** | Active job site | Higher compliance issues, more contractor activity |

---

## Demo Flow

Recommended 15-minute presentation flow:

1. **Command Center** (3 min) - Show real-time deny spikes, multi-PACS visibility
2. **Drilldown** (2 min) - Click event row → Evidence drawer with raw PACS payload
3. **Governance** (3 min) - Demonstrate entitlement visibility and approval chains
4. **Compliance** (3 min) - Show contractor audit with CSV export
5. **Mustering** (2 min) - Simulate emergency response scenario
6. **AI Builder** (2 min) - "Create a PIAM dashboard" GenAI moment

---

## License

MIT License - See LICENSE file for details.

---

<p align="center">
  <strong>Identity & Access Analytics</strong> - Unified Physical Security Intelligence
</p>
