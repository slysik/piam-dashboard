# ClearView Intelligence - Presenter's Guide

A comprehensive guide for demonstrating the ClearView Intelligence PIAM analytics platform.

---

## Quick Setup (< 2 minutes)

```bash
# One-command setup
make quickstart

# Wait for services (~2 min), then open
open http://localhost:3000
```

> **Credentials**: Superset at localhost:8088 uses admin/admin

---

## Recommended Demo Flow (15 minutes)

### 1. Command Center (3 min)

**Navigate to**: Dashboard > Command Center

**Show**:
- Live KPI metrics updating in real-time (Events, Deny Rate, Active Doors)
- 24-hour grants vs denies time series chart
- Door hotspot map with deny rate heat visualization
- Multi-PACS connector health indicators (Lenel, C-CURE, S2, etc.)

**Talking Points**:
- "We aggregate data from 6+ PACS vendors into a single pane of glass"
- "Deny spikes are detected within seconds, not hours"
- "Security teams can see across all facilities without switching systems"

**Demo Action**: Point to a deny spike on the chart. "This spike at 2 PM? Let's drill down."

![Command Center](screenshots/command-center.png)

---

### 2. Drilldown / Evidence Chain (2 min)

**Navigate to**: Click any event row in the recent events table

**Show**:
- Evidence drawer slides open
- Raw PACS payload (JSON) visible
- Complete audit trail: timestamp, door, badge, decision, source system

**Talking Points**:
- "Every metric drills down to the raw event"
- "Auditors get the complete evidence chain in one click"
- "No more jumping between systems to find the source record"

**Demo Action**: Click an event row, show the evidence drawer with full payload.

---

### 3. Governance (3 min)

**Navigate to**: Dashboard > Governance

**Show**:
- Filter tabs: All / Expiring / Exceptions
- Grant type badges (Policy, Manual, Exception)
- Approval chain with timestamps and approvers
- Last-used dates for access hygiene

**Talking Points**:
- "Full visibility into who has access, why, and who approved it"
- "Exceptions are flagged automatically for review"
- "We track last-used dates to identify stale entitlements"

**Demo Action**: Filter to "Expiring" and show an access about to expire. Then filter to "Exceptions" to show override approvals.

---

### 4. Compliance (3 min)

**Navigate to**: Dashboard > Compliance

**Show**:
- Contractor compliance dashboard
- Safety training status (checkmarks/warnings)
- Background check verification dates
- Site induction tracking
- Company-level summary view
- CSV export button

**Talking Points**:
- "Contractors must meet multiple compliance requirements before site access"
- "We track safety training, background checks, and site inductions in one place"
- "One-click CSV export for auditors - no manual data gathering"

**Demo Action**: Click the CSV export button. "This is what you send to the auditor."

---

### 5. Mustering (2 min)

**Navigate to**: Dashboard > Mustering

**Show**:
- Personnel status: Accounted (green), Missing (red), En-Route (yellow)
- Muster point capacity visualization
- Priority alerts for missing personnel
- Last-seen locations
- One-click communication actions (Call, SMS)

**Talking Points**:
- "In an emergency, every second counts"
- "Real-time accountability across all muster points"
- "Priority sorting puts executives and visitors at the top"
- "One-click to call or message missing personnel"

**Demo Action**: Click "Call" on a missing person. "Direct action from the dashboard."

---

### 6. AI Builder (2 min)

**Navigate to**: Dashboard > AI Builder

**Show**:
- Natural language input field
- Pre-built prompt suggestions
- Live dashboard generation (KPIs, charts, tables appear)
- Generated dashboard preview

**Talking Points**:
- "Describe what you want in plain English"
- "Watch the AI generate a complete dashboard in real-time"
- "This is the future of analytics - no SQL, no drag-and-drop, just describe it"

**Demo Action**: Type or select: "Show me a dashboard for contractor compliance with safety training status by site"

**Alternative Prompts**:
- "Create a deny rate analysis by building and time of day"
- "Build a visitor management dashboard with check-in trends"

---

## Common Q&A

| Question | Answer |
|----------|--------|
| **How does data get into ClickHouse?** | PACS connectors push events via REST API. Data lands in ClickHouse within seconds. |
| **What's the refresh rate?** | Live views refresh every 5-15 seconds depending on the metric. |
| **Can we integrate with our SIEM?** | Yes. We have webhook integrations for Splunk, Sentinel, and QRadar. |
| **How do you handle multi-tenant?** | Each tenant has isolated data with tenant_id filtering at the query layer. |
| **What about historical data?** | ClickHouse retains 2 years by default. Older data moves to cold storage. |
| **Is this cloud or on-prem?** | Both. We support SaaS, private cloud, and fully on-prem deployments. |

---

## Tenant Switching

Switch between demo scenarios to show different use cases:

| Tenant | Use Case | Characteristics |
|--------|----------|-----------------|
| **Acme Corporate** | Office complex | Lower deny rates, stable operations |
| **BuildRight Construction** | Active job site | Higher compliance issues, more contractor activity |

**How**: Use the tenant selector in the top navigation bar.

---

## Backup Plan (ClickHouse Unavailable)

If ClickHouse is not running or data is missing:

1. **Use the static backup site**:
   ```bash
   make backup-dev
   # Opens at http://localhost:3000
   ```

2. **Show the architecture presentation**:
   - Open: `backup-site/public/architecture.html`
   - Use arrow keys to navigate slides
   - Covers full data flow from badge swipe to dashboard

3. **Talk through screenshots** (in this folder):
   - `screenshots/dashboard-overview.png`
   - `screenshots/command-center.png`

---

## Technical Deep-Dive (Optional)

For technical audiences, show the architecture presentation:

**File**: [backup-site/public/architecture.html](../../backup-site/public/architecture.html)

**Slides**:
1. Full stack layer diagram
2. ClickHouse tables and views
3. Next.js API routes
4. React hooks (useClickHouse)
5. Component-to-data mapping
6. 8-step data flow sequence

> **Tip**: Use arrow keys to navigate

---

## Pre-Demo Checklist

- [ ] Run `make quickstart` and verify services are healthy
- [ ] Run `make verify` to confirm data is loaded
- [ ] Test each dashboard view loads correctly
- [ ] Prepare backup site: `make backup-build`
- [ ] Have architecture.html ready in a separate tab
- [ ] Clear browser history/cache for clean demo

---

## Support

If issues arise during demo:
- Check service health: `make health`
- View logs: `make logs`
- Full reset: `make reset` (takes ~3 min)

---

*ClearView Intelligence - Unified Physical Security Intelligence*
