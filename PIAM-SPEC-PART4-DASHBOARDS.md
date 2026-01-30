# PIAM Analytics Demo — Build Specification (Part 4 of 4)
# Superset Dashboards & Vercel Backup Site

---

## Task 4.1: Superset Database Connection

After `make up` and `make generate`, manually configure in Superset UI:

1. Open http://localhost:8088 (admin/admin)
2. Go to **Settings → Database Connections → + Database**
3. Select **ClickHouse Connect**
4. Enter connection details:
   - **Host:** `clickhouse` (Docker network name)
   - **Port:** `8123`
   - **Database:** `piam`
   - **Username:** `default`
   - **Password:** (leave empty)
5. Test connection and save as "PIAM ClickHouse"

---

## Task 4.2: Create Superset Datasets

Create these datasets in Superset (Data → Datasets → + Dataset):

### Dataset 1: KPIs Current
- **Database:** PIAM ClickHouse
- **Schema:** piam
- **Table:** v_kpi_current
- **Metrics to add:**
  - `events_15m`, `denies_15m`, `deny_rate_15m`, `suspicious_15m`
  - `events_60m`, `denies_60m`

### Dataset 2: Time Series Minute
- **Table:** v_timeseries_minute
- **Metrics:** `total_events`, `grants`, `denies`, `suspicious`

### Dataset 3: Door Hotspots
- **Table:** v_door_hotspots
- **Metrics:** `total_events`, `denies`, `deny_rate_pct`, `suspicious`

### Dataset 4: Recent Events
- **Table:** v_recent_events
- **Enable:** Row-level security filters by tenant_id

### Dataset 5: Connector Health
- **Table:** v_connector_health_latest
- **Metrics:** `latency_ms`, `events_per_minute`

### Dataset 6: Compliance Summary
- **Table:** v_compliance_summary
- **Metrics:** Count by status

### Dataset 7: Insight Deny Spikes
- **Table:** v_insight_deny_spikes
- **Metrics:** `current_denies`, `spike_ratio`

### Dataset 8: Freshness (for data age indicator)
- **Table:** v_freshness
- **Metrics:** `age_seconds`, `events_last_5m`
- **Use for:** Big Number chart in top-right showing data freshness

---

## Task 4.3: Create Command Center Dashboard

### Layout Specification

```
┌─────────────────────────────────────────────────────────────────┐
│  [Tenant Filter ▼]  [Time Range: 15m/60m/24h]  [Freshness: 12s] │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │Events   │ │Denies   │ │Deny %   │ │Suspicious│ │Connectors│   │
│ │  1,247  │ │   31    │ │  2.5%   │ │    3    │ │  4/4 OK │   │
│ │ +12%    │ │ 2.1× ▲  │ │+0.8pp ▲ │ │  1.5×   │ │         │   │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────┐ ┌─────────────────────────┐  │
│ │                                │ │                         │  │
│ │   Grants vs Denies (60m)       │ │    Door Hotspot Map     │  │
│ │   [Line Chart - ECharts]       │ │    [Deck.gl Scatter]    │  │
│ │                                │ │                         │  │
│ └────────────────────────────────┘ └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────┐ ┌─────────────────────────┐  │
│ │  Top Insights                  │ │  Connector Health       │  │
│ │  • Main Lobby 3.2× baseline    │ │  Name    Status  Latency│  │
│ │  • 2 expired contractors       │ │  Lenel   ✓      45ms   │  │
│ │  • PACS-02 latency elevated    │ │  C-CURE  ✓      62ms   │  │
│ └────────────────────────────────┘ └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  Recent Events                                              │ │
│ │  Time       Person          Door              Result  Susp  │ │
│ │  10:23:45   John Smith      Main Lobby D1     GRANT   -     │ │
│ │  10:23:41   Jane Doe        Parking G2        DENY    ⚠     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Chart Configurations

**Chart 1: KPI Tiles (Big Number with Trendline)**
- Create 5 separate Big Number charts
- Dataset: v_kpi_current
- Metrics: events_15m, denies_15m, deny_rate_15m, suspicious_15m
- Subheader: Show comparison text (configure manually)

**Chart 2: Time Series (ECharts Line)**
- Dataset: v_timeseries_minute
- X-axis: minute
- Y-axis: grants (green), denies (red)
- Refresh: 15 seconds
- Time grain: 1 minute

**Chart 3: Door Hotspot Map (deck.gl Scatter)**
- Dataset: v_door_hotspots
- Latitude: lat
- Longitude: lon
- Point size: denies (scaled)
- Point color: deny_rate_pct (red gradient)
- Tooltip: location_name, denies, deny_rate_pct

**Mapbox-less Fallback Styling** (if no Mapbox token):
When running without a Mapbox token, enhance visibility with these settings:
- Point Radius: `30` (larger for visibility on blank background)
- Point Color: Use a bright red (`#E53935`) for high deny rates
- Stroke Color: White (`#FFFFFF`) for point borders
- Stroke Width: `2` (helps points stand out)
- Ensure tooltips are enabled (essential for context without basemap)

**Chart 4: Insights Table**
- Dataset: v_insight_deny_spikes
- Columns: location_name, current_denies, spike_ratio
- Conditional formatting: spike_ratio > 2 = red

**Chart 5: Connector Health Table**
- Dataset: v_connector_health_latest
- Columns: connector_name, pacs_type, status, latency_ms, last_check
- Conditional formatting: status = DEGRADED/DOWN = red

**Chart 6: Recent Events Table**
- Dataset: v_recent_events
- Columns: event_time, person_name, location_name, result, suspicious_flag
- Row limit: 50
- Enable click-to-filter

### Dashboard Filters

Configure these native filters (Edit Dashboard → Filters):

| Filter | Column | Default Value | Scope |
|--------|--------|---------------|-------|
| **Tenant** | `tenant_id` | `acme` | All charts |
| **Time Range** | `event_time` | Last 60 minutes | All charts |
| **Site** (optional) | `site_id` | None | Map, Events table |
| **Person Type** (optional) | `person_type` | None | Events table, Compliance |
| **Deny Reason** (optional) | `deny_reason` | None | Events table |

**Important: Filter Scoping**
1. Edit Dashboard → Click Filters icon
2. For each filter, expand "Scoping" section
3. Verify it's applied to **all charts** (especially Tenant filter)
4. Charts without filter mapping will show unfiltered data!

**Auto-refresh:** Set dashboard refresh to 15–30 seconds

### KPI Chart Enhancement (Big Number with Trendline)

For a more dynamic demo feel, use **Big Number with Trendline** instead of plain Big Number:

1. Create chart → Select "Big Number with Trendline"
2. Dataset: `v_kpi_current`
3. Metric: e.g., `denies_15m`
4. Time Column: Use current timestamp or leave blank for point-in-time
5. Comparison Period: Leave blank (trendline shows recent change)
6. Subheader: `2.1× baseline ▲` (hardcode for demo)

This adds a small sparkline showing directional trend.

### Annotation Layer (Replay Window)

To highlight the `make replay` injection window on Time Series charts:

1. Edit Time Series chart → Annotations
2. Add Annotation Layer:
   - Name: "Replay Window"
   - Formula: Manual time range (last 30 minutes)
   - Color: Light yellow (#FFF3CD)
   - Opacity: 0.3
3. During demo, this highlights where replay incidents occurred

---

## Task 4.4: Create Compliance Dashboard

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Tenant Filter]  [Person Type: All/Contractor]                 │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│ │Compliant│ │Expiring │ │Expired  │ │Non-Compl│                │
│ │   847   │ │   23    │ │   12    │ │    8    │                │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────┐ ┌─────────────────────────┐  │
│ │ Compliance by Type (Pie)       │ │ Expiring Timeline (Bar) │  │
│ └────────────────────────────────┘ └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  Non-Compliant / Expiring Details                          │ │
│ │  Name          Company       Requirement    Status   Expiry │ │
│ │  John Doe      TechStaff     Safety Train   EXPIRED  -5d   │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Charts

**Chart 1-4: KPI Big Numbers**
- Dataset: v_compliance_summary
- Metric: COUNT(*) with filters for each status

**Chart 5: Compliance by Type (Pie)**
- Dataset: v_compliance_summary
- Dimension: requirement_type
- Metric: count

**Chart 6: Expiring Timeline (Bar)**
- Dataset: v_compliance_summary (filtered: expires_within_30d = 1)
- X-axis: expiry_date
- Y-axis: count

**Chart 7: Details Table**
- Dataset: v_compliance_summary
- Filter: status IN ('EXPIRED', 'EXPIRING_SOON', 'NON_COMPLIANT')
- Columns: full_name, contractor_company, requirement_name, status, days_until_expiry
- Enable CSV export

---

## Task 4.5: Vercel Backup Site Setup

### Initialize Next.js project

```bash
cd piam-demo
npx create-next-app@14 backup-site --typescript --tailwind --eslint --app=false --src-dir --import-alias="@/*"
cd backup-site
npm install recharts react-map-gl mapbox-gl @types/mapbox-gl
```

### Create `.env.local` (REQUIRED for map)

**Important:** Next.js reads environment variables from `.env.local` in the backup-site directory, NOT from the root `.env` file.

Create `backup-site/.env.local`:

```bash
# Mapbox token for map basemap (same token as root .env)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

> **Without this file:** The map will render data points on a blank/gray background. Functional but sparse.

### File: `backup-site/src/pages/index.tsx`

```tsx
import { useState } from 'react';
import Layout from '@/components/Layout';
import KPIRow from '@/components/KPIRow';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import DoorMap from '@/components/DoorMap';
import InsightsPanel from '@/components/InsightsPanel';
import EventsTable from '@/components/EventsTable';
import EvidenceDrawer from '@/components/EvidenceDrawer';
import { sampleKPIs } from '@/data/sample-kpis';
import { sampleEvents } from '@/data/sample-events';
import { sampleInsights } from '@/data/sample-insights';

export default function CommandCenter() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [tenant, setTenant] = useState('acme');

  return (
    <Layout title="Command Center" tenant={tenant} onTenantChange={setTenant}>
      {/* KPI Row */}
      <KPIRow kpis={sampleKPIs[tenant]} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4 h-80">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Grants vs Denies (60m)</h3>
          <TimeSeriesChart tenant={tenant} />
        </div>
        <div className="bg-white rounded-lg shadow p-4 h-80">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Door Hotspots</h3>
          <DoorMap tenant={tenant} />
        </div>
      </div>

      {/* Insights + Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <InsightsPanel insights={sampleInsights[tenant]} />
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Connector Health</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2">Connector</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Latency</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Lenel Primary</td><td className="text-green-600">✓ Healthy</td><td>45ms</td></tr>
              <tr><td>C-CURE Satellite</td><td className="text-green-600">✓ Healthy</td><td>62ms</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Events Table */}
      <EventsTable 
        events={sampleEvents[tenant]} 
        onEventClick={(e) => setSelectedEvent(e)} 
      />

      {/* Evidence Drawer */}
      {selectedEvent && (
        <EvidenceDrawer 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}
    </Layout>
  );
}
```

### File: `backup-site/src/components/Layout.tsx`

```tsx
import Head from 'next/head';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  title: string;
  tenant: string;
  onTenantChange: (t: string) => void;
}

export default function Layout({ children, title, tenant, onTenantChange }: LayoutProps) {
  return (
    <>
      <Head>
        <title>{title} | PIAM Analytics</title>
      </Head>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">PIAM Analytics</h1>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">{title}</span>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={tenant} 
                onChange={(e) => onTenantChange(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="acme">Acme Corporate</option>
                <option value="buildright">BuildRight Construction</option>
              </select>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Data: 12s ago
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </>
  );
}
```

### File: `backup-site/src/components/KPIRow.tsx`

```tsx
interface KPI {
  label: string;
  value: number | string;
  delta?: string;
  deltaType?: 'up' | 'down' | 'neutral';
}

interface KPIRowProps {
  kpis: KPI[];
}

export default function KPIRow({ kpis }: KPIRowProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
      {kpis.map((kpi, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">{kpi.label}</div>
          <div className="text-2xl font-semibold mt-1">{kpi.value}</div>
          {kpi.delta && (
            <div className={`text-sm mt-1 ${
              kpi.deltaType === 'up' ? 'text-red-600' : 
              kpi.deltaType === 'down' ? 'text-green-600' : 'text-gray-500'
            }`}>
              {kpi.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### File: `backup-site/src/components/TimeSeriesChart.tsx`

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { time: '10:00', grants: 45, denies: 2 },
  { time: '10:05', grants: 52, denies: 3 },
  { time: '10:10', grants: 48, denies: 1 },
  { time: '10:15', grants: 61, denies: 5 },
  { time: '10:20', grants: 55, denies: 2 },
  { time: '10:25', grants: 67, denies: 8 },
  { time: '10:30', grants: 58, denies: 3 },
  { time: '10:35', grants: 72, denies: 4 },
  { time: '10:40', grants: 63, denies: 2 },
  { time: '10:45', grants: 69, denies: 6 },
  { time: '10:50', grants: 54, denies: 3 },
  { time: '10:55', grants: 71, denies: 2 },
];

export default function TimeSeriesChart({ tenant }: { tenant: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="grants" stroke="#22c55e" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="denies" stroke="#ef4444" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### File: `backup-site/src/components/DoorMap.tsx`

```tsx
import { useState, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface DoorData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  denies: number;
  denyRate: number;
}

const sampleDoors: Record<string, DoorData[]> = {
  acme: [
    { id: '1', name: 'Main Tower F1 D1', lat: 32.7876, lon: -79.9403, denies: 24, denyRate: 8.2 },
    { id: '2', name: 'Main Tower F2 D3', lat: 32.7878, lon: -79.9401, denies: 12, denyRate: 4.1 },
    { id: '3', name: 'Parking Garage D1', lat: 32.7872, lon: -79.9408, denies: 5, denyRate: 2.3 },
  ],
  buildright: [
    { id: '1', name: 'Site Entrance D1', lat: 32.8546, lon: -79.9748, denies: 38, denyRate: 12.5 },
    { id: '2', name: 'Equipment Yard D1', lat: 32.8548, lon: -79.9750, denies: 22, denyRate: 9.8 },
  ],
};

export default function DoorMap({ tenant }: { tenant: string }) {
  const [selectedDoor, setSelectedDoor] = useState<DoorData | null>(null);
  const doors = sampleDoors[tenant] || sampleDoors.acme;

  // Center map on first door
  const center = doors[0] || { lat: 32.7876, lon: -79.9403 };

  // Check if Mapbox token is configured
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken || mapboxToken === 'pk.your_mapbox_token_here') {
    // Fallback: show simple dot representation without basemap
    return (
      <div className="relative w-full h-full bg-gray-100 rounded flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="mb-2">Map preview (no Mapbox token)</div>
          <div className="flex gap-2 justify-center">
            {doors.map((d) => (
              <div
                key={d.id}
                className="w-4 h-4 rounded-full bg-red-500"
                style={{ opacity: Math.min(1, d.denies / 30) }}
                title={`${d.name}: ${d.denies} denies`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Map
      initialViewState={{
        latitude: center.lat,
        longitude: center.lon,
        zoom: 15,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={mapboxToken}
    >
      {doors.map((door) => (
        <Marker
          key={door.id}
          latitude={door.lat}
          longitude={door.lon}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedDoor(door);
          }}
        >
          <div
            className="w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow cursor-pointer"
            style={{
              opacity: Math.min(1, 0.3 + door.denies / 30),
              transform: `scale(${Math.min(2, 1 + door.denies / 20)})`,
            }}
          />
        </Marker>
      ))}

      {selectedDoor && (
        <Popup
          latitude={selectedDoor.lat}
          longitude={selectedDoor.lon}
          onClose={() => setSelectedDoor(null)}
          closeButton={true}
          closeOnClick={false}
        >
          <div className="p-2">
            <div className="font-semibold">{selectedDoor.name}</div>
            <div className="text-sm">Denies: {selectedDoor.denies}</div>
            <div className="text-sm text-red-600">Rate: {selectedDoor.denyRate}%</div>
          </div>
        </Popup>
      )}
    </Map>
  );
}
```

### File: `backup-site/src/components/InsightsPanel.tsx`

```tsx
interface Insight {
  severity: number; // 1-4 (1=info, 4=critical)
  title: string;
  description: string;
}

interface Props {
  insights: Insight[];
}

const severityColors: Record<number, string> = {
  1: 'bg-blue-100 border-blue-300 text-blue-800',
  2: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  3: 'bg-orange-100 border-orange-300 text-orange-800',
  4: 'bg-red-100 border-red-300 text-red-800',
};

const severityIcons: Record<number, string> = {
  1: 'ℹ️',
  2: '⚠️',
  3: '🔶',
  4: '🔴',
};

export default function InsightsPanel({ insights }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Top Insights</h3>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`p-3 rounded border ${severityColors[insight.severity] || severityColors[1]}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{severityIcons[insight.severity] || severityIcons[1]}</span>
              <div>
                <div className="font-medium text-sm">{insight.title}</div>
                <div className="text-xs opacity-80 mt-0.5">{insight.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### File: `backup-site/src/components/EventsTable.tsx`

```tsx
interface Event {
  id: string;
  time: string;
  person: string;
  door: string;
  result: 'GRANT' | 'DENY';
  suspicious: boolean;
  rawPayload: object;
}

interface Props {
  events: Event[];
  onEventClick: (e: Event) => void;
}

export default function EventsTable({ events, onEventClick }: Props) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-medium text-gray-500">Recent Events</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left">Time</th>
            <th className="px-4 py-2 text-left">Person</th>
            <th className="px-4 py-2 text-left">Door</th>
            <th className="px-4 py-2 text-left">Result</th>
            <th className="px-4 py-2 text-left">Suspicious</th>
          </tr>
        </thead>
        <tbody>
          {events.slice(0, 10).map((e) => (
            <tr 
              key={e.id} 
              onClick={() => onEventClick(e)}
              className="border-t hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-4 py-2">{e.time}</td>
              <td className="px-4 py-2">{e.person}</td>
              <td className="px-4 py-2">{e.door}</td>
              <td className="px-4 py-2">
                <span className={e.result === 'GRANT' ? 'text-green-600' : 'text-red-600'}>
                  {e.result}
                </span>
              </td>
              <td className="px-4 py-2">{e.suspicious ? '⚠️' : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### File: `backup-site/src/components/EvidenceDrawer.tsx`

```tsx
interface Props {
  event: any;
  onClose: () => void;
}

export default function EvidenceDrawer({ event, onClose }: Props) {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Event Evidence</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto h-full pb-20">
        {/* Event Details */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Time</span>
            <span>{event.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Person</span>
            <span>{event.person}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Door</span>
            <span>{event.door}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Result</span>
            <span className={event.result === 'GRANT' ? 'text-green-600' : 'text-red-600'}>
              {event.result}
            </span>
          </div>
        </div>

        {/* Raw Payload */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Raw PACS Payload</span>
            <button 
              onClick={() => navigator.clipboard.writeText(JSON.stringify(event.rawPayload, null, 2))}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Copy JSON
            </button>
          </div>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
            {JSON.stringify(event.rawPayload, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
```

### File: `backup-site/src/data/sample-kpis.ts`

```typescript
export const sampleKPIs: Record<string, any[]> = {
  acme: [
    { label: 'Events (15m)', value: '1,247', delta: '+12%', deltaType: 'neutral' },
    { label: 'Denies (15m)', value: '31', delta: '2.1× baseline', deltaType: 'up' },
    { label: 'Deny Rate', value: '2.5%', delta: '+0.8pp', deltaType: 'up' },
    { label: 'Suspicious', value: '3', delta: '1.5×', deltaType: 'up' },
    { label: 'Connectors', value: '4/4 OK', delta: '', deltaType: 'neutral' },
  ],
  buildright: [
    { label: 'Events (15m)', value: '892', delta: '+8%', deltaType: 'neutral' },
    { label: 'Denies (15m)', value: '71', delta: '1.8× baseline', deltaType: 'up' },
    { label: 'Deny Rate', value: '8.0%', delta: '+1.2pp', deltaType: 'up' },
    { label: 'Suspicious', value: '7', delta: '2.3×', deltaType: 'up' },
    { label: 'Connectors', value: '3/4 OK', delta: '1 degraded', deltaType: 'up' },
  ],
};
```

### File: `backup-site/src/data/sample-events.ts`

```typescript
export const sampleEvents: Record<string, any[]> = {
  acme: [
    { id: '1', time: '10:55:23', person: 'John Smith', door: 'Main Tower F1 D1', result: 'GRANT', suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B123456' }, result: { granted: true } } },
    { id: '2', time: '10:55:18', person: 'Jane Doe', door: 'Main Tower F2 D3', result: 'DENY', suspicious: true, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B789012' }, result: { granted: false, reason: 'ACCESS_NOT_GRANTED' } } },
    { id: '3', time: '10:55:12', person: 'Bob Wilson', door: 'Parking Garage D1', result: 'GRANT', suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B345678' }, result: { granted: true } } },
    { id: '4', time: '10:55:08', person: 'Alice Brown', door: 'Main Tower F3 D2', result: 'GRANT', suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B901234' }, result: { granted: true } } },
    { id: '5', time: '10:55:01', person: 'Charlie Davis', door: 'Main Tower F1 D2', result: 'DENY', suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B567890' }, result: { granted: false, reason: 'EXPIRED_CREDENTIAL' } } },
  ],
  buildright: [
    { id: '1', time: '06:23:45', person: 'Mike Johnson', door: 'Site Entrance D1', result: 'GRANT', suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'C123456' }, result: { granted: true } } },
    { id: '2', time: '06:23:41', person: 'Tom Harris', door: 'Equipment Yard D1', result: 'DENY', suspicious: true, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'C789012' }, result: { granted: false, reason: 'SCHEDULE_VIOLATION' } } },
    { id: '3', time: '06:23:38', person: 'Steve Clark', door: 'Warehouse A D2', result: 'DENY', suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'C345678' }, result: { granted: false, reason: 'EXPIRED_CREDENTIAL' } } },
  ],
};
```

### File: `backup-site/src/data/sample-insights.ts`

```typescript
export const sampleInsights: Record<string, any[]> = {
  acme: [
    { severity: 3, title: 'Main Tower F2 D3 denies 3.2× baseline', description: '24 denies in last 60m vs typical 7.5' },
    { severity: 2, title: '2 contractors with expired safety training', description: 'TechStaff Inc employees attempted restricted access' },
    { severity: 1, title: 'All connectors healthy', description: 'Lenel and C-CURE reporting normally' },
  ],
  buildright: [
    { severity: 4, title: 'Equipment Yard denies 4.1× baseline', description: '38 denies in last 60m vs typical 9.2' },
    { severity: 3, title: 'Genetec connector degraded', description: 'Latency 450ms, 12 errors in last hour' },
    { severity: 3, title: '8 contractors non-compliant', description: 'Safety training expired for Reliable Electric crew' },
  ],
};
```

### File: `backup-site/src/hooks/useLiveData.ts` (Optional: Live Mode Simulation)

Add this hook to simulate live data updates in the backup site:

```typescript
import { useState, useEffect } from 'react';

interface LiveDataConfig {
  enabled: boolean;
  intervalMs: number;
}

export function useLiveData<T>(initialData: T, config: LiveDataConfig = { enabled: true, intervalMs: 15000 }) {
  const [data, setData] = useState<T>(initialData);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!config.enabled) return;

    const interval = setInterval(() => {
      // Simulate small random changes to KPIs
      setData((prev: any) => {
        if (Array.isArray(prev)) {
          return prev.map((item: any) => ({
            ...item,
            value: typeof item.value === 'number'
              ? item.value + Math.floor(Math.random() * 10) - 5
              : item.value,
          }));
        }
        return prev;
      });
      setLastUpdate(new Date());
    }, config.intervalMs);

    return () => clearInterval(interval);
  }, [config.enabled, config.intervalMs]);

  return { data, lastUpdate, ageSeconds: Math.floor((Date.now() - lastUpdate.getTime()) / 1000) };
}
```

**Usage in index.tsx:**
```tsx
const { data: kpis, ageSeconds } = useLiveData(sampleKPIs[tenant], { enabled: true, intervalMs: 15000 });
// Display ageSeconds in the header freshness indicator
```

### File: `backup-site/vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

---

## Task 4.6: Deploy to Vercel

```bash
cd backup-site
npm install
npm run build  # Verify builds locally

# Deploy (--confirm avoids interactive prompts during live demos)
npx vercel login
npx vercel link
npx vercel --prod --confirm
# Note the deployment URL
```

### Vercel Environment Variables

To manage tokens securely:

```bash
# Pull environment variables from Vercel to local
npx vercel env pull .env.local

# List configured environment variables
npx vercel env ls

# Add Mapbox token to Vercel project (required for production map)
npx vercel env add NEXT_PUBLIC_MAPBOX_TOKEN
# Enter: pk.your_token_here
# Select: Production, Preview, Development
```

> **Security:** The Mapbox token is public (pk.*) and safe to expose in client-side code. Never add private tokens to NEXT_PUBLIC_* variables.

### Offline Backup Fallback

If network is unavailable during demo, you can serve the pre-built site:

```bash
# Pre-build (do this before demo day)
cd backup-site
npm run build

# Serve offline (no network required after build)
npm run start
# Opens at localhost:3000
```

### Offline Demo Pack

For a fully offline demo laptop, prepare this before the presentation:

```bash
cd backup-site

# 1. Install dependencies (requires network)
npm install

# 2. Build the production bundle
npm run build

# 3. Verify it works offline
# Disconnect network, then:
npm run start
# Open http://localhost:3000

# 4. (Optional) Create portable bundle
# The following directories contain everything needed:
#   - backup-site/.next/
#   - backup-site/node_modules/
#   - backup-site/package.json
#   - backup-site/src/data/*.ts (sample data)
```

**What works offline:**
- All sample data (KPIs, events, insights)
- Tenant switching
- Evidence drawer
- Map (data points on gray background without Mapbox)

**What requires network:**
- Mapbox basemap tiles (map shows data without them)
- Vercel deployment

---

## Acceptance Criteria (Part 4)

### Superset
1. Database connection works (Settings → Database Connections → "PIAM ClickHouse" shows green)
2. All **8 datasets** created and queryable (including `v_freshness`)
3. Command Center dashboard loads with all charts
4. Filters work (tenant, time range)
5. Auto-refresh active (15-30s)
6. Evidence drill-down: click event row → see raw payload
7. Freshness indicator shows data age in seconds

### Backup Site
1. `.env.local` exists with `NEXT_PUBLIC_MAPBOX_TOKEN`
2. `npm run dev` starts at localhost:3000
3. Tenant switcher works (acme ↔ buildright)
4. KPI tiles display sample data
5. Map shows door hotspots (or fallback dots if no Mapbox token)
6. Events table shows sample events
7. Evidence drawer opens on row click with JSON payload
8. Insights panel shows color-coded alerts
9. Vercel deployment accessible via URL (or local `npm run start` for offline)

---

## Demo Checklist (Final)

### Pre-Demo Setup (day before)
- [ ] `make quickstart` completes successfully (or `make reset && make generate`)
- [ ] Mapbox token configured in `.env` (root) and `backup-site/.env.local`
- [ ] Vercel backup deployed (`npx vercel --prod --confirm`)
- [ ] `make dashboards-export` to save dashboard backup

### Pre-Demo Verification (1 hour before)
- [ ] `make verify` passes all checks
- [ ] Superset: http://localhost:8088 loads (admin/admin)
- [ ] Command Center dashboard visible
- [ ] All 8 datasets show data in preview
- [ ] Freshness indicator shows < 30 seconds

### Demo Ready State (5 minutes before)
- [ ] Tenant filter works (acme ↔ buildright)
- [ ] Map shows door hotspots (red dots sized by denies)
- [ ] Events table populates (50+ rows)
- [ ] Evidence drawer opens on row click
- [ ] Compliance dashboard shows contractor issues
- [ ] Backup URL loads in separate tab (Vercel or localhost:3000)
- [ ] Start `make trickle` for live motion
- [ ] (Optional) Run `make replay` for guaranteed incidents

---

## Demo Script (15 minutes)

**0-2 min: Opening**
> "This is a PIAM command center. Executives see KPIs with baseline comparisons - this 2.1× tells me denies are elevated versus normal."

**2-5 min: Drill to Hotspot**
> Click red dot on map → events filter
> "The map shows hotspots. Main Lobby is red. Let me click it to see what's happening there."

**5-8 min: Evidence**
> Click event row → drawer opens
> "Two clicks from KPI to raw PACS payload. This is the evidence an investigator needs."
> Show JSON, click Copy.

**8-10 min: Insights**
> Point to insights panel
> "These insights are rule-based, not ML. I can explain exactly why this flagged."

**10-12 min: Compliance**
> Navigate to Compliance dashboard
> "Contractor compliance is critical. 12 have expired training."
> Click Export.

**12-14 min: Multi-tenant**
> Switch to BuildRight
> "Same dashboards, different tenant. BuildRight has higher deny rate - 8% vs 2.5%."

**14-15 min: Wrap**
> "Roadmap includes: mustering dashboards, floorplan overlays, GenAI dashboard creation."
