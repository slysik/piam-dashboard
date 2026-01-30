'use client';

import { useState, useEffect } from 'react';
import KPICard from '@/components/KPICard';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import MapView from '@/components/MapView';
import AlertsPanel from '@/components/AlertsPanel';
import TenantSelector from '@/components/TenantSelector';
import EventsTable from '@/components/EventsTable';
import EvidenceDrawer from '@/components/EvidenceDrawer';
import ConnectorHealth from '@/components/ConnectorHealth';
import { useClickHouse } from '@/hooks/useClickHouse';

// Sample data for demo/fallback
const sampleKPIs = {
  acme: {
    eventsToday: 12847,
    denyRate: 2.5,
    activeDoors: 127,
    connectorsOnline: 4,
    connectorsTotal: 4,
    suspicious: 3,
  },
  buildright: {
    eventsToday: 8923,
    denyRate: 8.0,
    activeDoors: 45,
    connectorsOnline: 3,
    connectorsTotal: 4,
    suspicious: 7,
  },
};

const sampleAlerts = {
  acme: [
    { id: '1', severity: 'high' as const, title: 'Main Tower F2 D3 denies 3.2x baseline', description: '24 denies in last 60m vs typical 7.5', timestamp: new Date(Date.now() - 5 * 60000) },
    { id: '2', severity: 'medium' as const, title: '2 contractors with expired safety training', description: 'TechStaff Inc employees attempted restricted access', timestamp: new Date(Date.now() - 15 * 60000) },
    { id: '3', severity: 'low' as const, title: 'All connectors healthy', description: 'Lenel and C-CURE reporting normally', timestamp: new Date(Date.now() - 30 * 60000) },
  ],
  buildright: [
    { id: '1', severity: 'critical' as const, title: 'Equipment Yard denies 4.1x baseline', description: '38 denies in last 60m vs typical 9.2', timestamp: new Date(Date.now() - 2 * 60000) },
    { id: '2', severity: 'high' as const, title: 'Genetec connector degraded', description: 'Latency 450ms, 12 errors in last hour', timestamp: new Date(Date.now() - 10 * 60000) },
    { id: '3', severity: 'high' as const, title: '8 contractors non-compliant', description: 'Safety training expired for Reliable Electric crew', timestamp: new Date(Date.now() - 20 * 60000) },
  ],
};

const sampleEvents = {
  acme: [
    { id: '1', time: '10:55:23', person: 'John Smith', door: 'Main Tower F1 D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B123456' }, result: { granted: true } } },
    { id: '2', time: '10:55:18', person: 'Jane Doe', door: 'Main Tower F2 D3', result: 'DENY' as const, suspicious: true, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B789012' }, result: { granted: false, reason: 'ACCESS_NOT_GRANTED' } } },
    { id: '3', time: '10:55:12', person: 'Bob Wilson', door: 'Parking Garage D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B345678' }, result: { granted: true } } },
    { id: '4', time: '10:55:08', person: 'Alice Brown', door: 'Main Tower F3 D2', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B901234' }, result: { granted: true } } },
    { id: '5', time: '10:55:01', person: 'Charlie Davis', door: 'Main Tower F1 D2', result: 'DENY' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B567890' }, result: { granted: false, reason: 'EXPIRED_CREDENTIAL' } } },
    { id: '6', time: '10:54:55', person: 'Diana Evans', door: 'Server Room D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B111222' }, result: { granted: true } } },
    { id: '7', time: '10:54:48', person: 'Edward Foster', door: 'Main Lobby D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B333444' }, result: { granted: true } } },
    { id: '8', time: '10:54:42', person: 'Fiona Garcia', door: 'Parking Garage D2', result: 'DENY' as const, suspicious: true, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'B555666' }, result: { granted: false, reason: 'TAILGATING_DETECTED' } } },
  ],
  buildright: [
    { id: '1', time: '06:23:45', person: 'Mike Johnson', door: 'Site Entrance D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'C123456' }, result: { granted: true } } },
    { id: '2', time: '06:23:41', person: 'Tom Harris', door: 'Equipment Yard D1', result: 'DENY' as const, suspicious: true, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'C789012' }, result: { granted: false, reason: 'SCHEDULE_VIOLATION' } } },
    { id: '3', time: '06:23:38', person: 'Steve Clark', door: 'Warehouse A D2', result: 'DENY' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'C345678' }, result: { granted: false, reason: 'EXPIRED_CREDENTIAL' } } },
    { id: '4', time: '06:23:32', person: 'Lisa Martinez', door: 'Site Office D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'C901234' }, result: { granted: true } } },
    { id: '5', time: '06:23:25', person: 'Robert Lee', door: 'Equipment Yard D2', result: 'DENY' as const, suspicious: true, rawPayload: { eventType: 'ACCESS_ATTEMPT', badge: { id: 'C567890' }, result: { granted: false, reason: 'INVALID_CREDENTIAL' } } },
  ],
};

export interface Event {
  id: string;
  time: string;
  person: string;
  door: string;
  result: 'GRANT' | 'DENY';
  suspicious: boolean;
  rawPayload: object;
}

export default function Dashboard() {
  const [tenant, setTenant] = useState<'acme' | 'buildright'>('acme');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dataAge, setDataAge] = useState(12);

  // Simulate data freshness updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDataAge((prev) => {
        // Reset to a small value randomly to simulate fresh data
        if (prev > 25) {
          return Math.floor(Math.random() * 5) + 1;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const kpis = sampleKPIs[tenant];
  const alerts = sampleAlerts[tenant];
  const events = sampleEvents[tenant];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">PIAM Analytics</h1>
            <span className="text-gray-500">|</span>
            <span className="text-gray-500">Command Center</span>
          </div>
          <div className="flex items-center space-x-4">
            <TenantSelector value={tenant} onChange={setTenant} />
            <div className="flex items-center text-sm text-gray-500">
              <span className={`w-2 h-2 rounded-full mr-2 ${dataAge < 15 ? 'bg-green-500' : dataAge < 30 ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
              Data: {dataAge}s ago
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard
            label="Events Today"
            value={kpis.eventsToday.toLocaleString()}
            trend={{ value: '+12%', direction: 'neutral' }}
          />
          <KPICard
            label="Deny Rate"
            value={`${kpis.denyRate}%`}
            trend={{ value: tenant === 'acme' ? '+0.8pp' : '+1.2pp', direction: 'up' }}
          />
          <KPICard
            label="Active Doors"
            value={kpis.activeDoors.toString()}
            trend={{ value: 'All reporting', direction: 'neutral' }}
          />
          <KPICard
            label="Suspicious"
            value={kpis.suspicious.toString()}
            trend={{ value: tenant === 'acme' ? '1.5x baseline' : '2.3x baseline', direction: 'up' }}
          />
          <KPICard
            label="Connectors"
            value={`${kpis.connectorsOnline}/${kpis.connectorsTotal} OK`}
            trend={kpis.connectorsOnline < kpis.connectorsTotal ? { value: '1 degraded', direction: 'up' } : undefined}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-lg p-4 h-80">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Grants vs Denies (24h)</h3>
            <TimeSeriesChart tenant={tenant} />
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4 h-80">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Door Hotspots</h3>
            <MapView tenant={tenant} />
          </div>
        </div>

        {/* Insights + Connector Health Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AlertsPanel alerts={alerts} />
          <ConnectorHealth tenant={tenant} />
        </div>

        {/* Events Table */}
        <EventsTable events={events} onEventClick={setSelectedEvent} />
      </main>

      {/* Evidence Drawer */}
      {selectedEvent && (
        <EvidenceDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
