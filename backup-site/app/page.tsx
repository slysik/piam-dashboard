'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import KPICard from '@/components/KPICard';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import MapView from '@/components/MapView';
import AlertsPanel from '@/components/AlertsPanel';
import TenantSelector from '@/components/TenantSelector';
import EventsTable from '@/components/EventsTable';
import EvidenceDrawer from '@/components/EvidenceDrawer';
import ConnectorHealth from '@/components/ConnectorHealth';
import GovernanceView from '@/components/GovernanceView';
import ComplianceView from '@/components/ComplianceView';
import MusteringView from '@/components/MusteringView';
import GenAIView from '@/components/GenAIView';
import PersonaSelector, { Persona } from '@/components/PersonaSelector';
import ExecutiveOverview from '@/components/ExecutiveOverview';
import RealTimeRiskPanel from '@/components/RealTimeRiskPanel';
import HireToRetireView from '@/components/HireToRetireView';
import SelfServiceAnalytics from '@/components/SelfServiceAnalytics';
import SettingsPanel from '@/components/SettingsPanel';

const allTabs = [
  { id: 'executive', label: 'Executive Overview', icon: '📊' },
  { id: 'risk', label: 'Real-Time Risk', icon: '🚨' },
  { id: 'command', label: 'Command Center', icon: '🎯' },
  { id: 'hygiene', label: 'Access Hygiene', icon: '🔄' },
  { id: 'governance', label: 'Governance', icon: '🔐' },
  { id: 'compliance', label: 'Compliance & Audit', icon: '📋' },
  { id: 'requests', label: 'Access Requests', icon: '📝' },
  { id: 'mustering', label: 'Mustering', icon: '👥' },
  { id: 'genai', label: 'AI Builder', icon: '✨' },
];

const personaTabs: Record<Persona, string[]> = {
  ceo: ['executive', 'risk', 'compliance'],
  soc: ['risk', 'command', 'mustering'],
  facilities: ['mustering', 'command', 'requests'],
  ithr: ['hygiene', 'governance', 'requests'],
  compliance: ['compliance', 'hygiene', 'governance'],
};

const personaDefaults: Record<Persona, string> = {
  ceo: 'executive',
  soc: 'risk',
  facilities: 'mustering',
  ithr: 'hygiene',
  compliance: 'compliance',
};

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
    { id: '1', time: '10:55:23', person: 'John Smith', door: 'Main Tower F1 D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'Lenel OnGuard', badge: { id: 'B123456', facilityCode: '1001', format: 'H10301' }, door: { id: 'D-MT-F1-01', name: 'Main Tower F1 D1', readerSerial: 'LNL-RDR-2847' }, result: { granted: true, grantReason: 'VALID_CREDENTIAL' }, timestamp: '2024-10-15T10:55:23.456Z', rawHex: '0x4A6F686E20536D697468' } },
    { id: '2', time: '10:55:18', person: 'Jane Doe', door: 'Main Tower F2 D3', result: 'DENY' as const, suspicious: true, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'Lenel OnGuard', badge: { id: 'B789012', facilityCode: '1001', format: 'H10301' }, door: { id: 'D-MT-F2-03', name: 'Main Tower F2 D3', readerSerial: 'LNL-RDR-2849' }, result: { granted: false, denyReason: 'ACCESS_NOT_GRANTED', denyCode: 'E-1042' }, timestamp: '2024-10-15T10:55:18.234Z' } },
    { id: '3', time: '10:55:12', person: 'Bob Wilson', door: 'Parking Garage D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'C-CURE 9000', badge: { id: 'B345678', cardNumber: '345678' }, door: { id: 'PG-D1', name: 'Parking Garage D1' }, result: { granted: true }, timestamp: '2024-10-15T10:55:12.789Z' } },
    { id: '4', time: '10:55:08', person: 'Alice Brown', door: 'Main Tower F3 D2', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'Lenel OnGuard', badge: { id: 'B901234' }, door: { id: 'D-MT-F3-02', name: 'Main Tower F3 D2' }, result: { granted: true }, timestamp: '2024-10-15T10:55:08.123Z' } },
    { id: '5', time: '10:55:01', person: 'Charlie Davis', door: 'Main Tower F1 D2', result: 'DENY' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'Lenel OnGuard', badge: { id: 'B567890', status: 'EXPIRED' }, door: { id: 'D-MT-F1-02', name: 'Main Tower F1 D2' }, result: { granted: false, denyReason: 'EXPIRED_CREDENTIAL', expiryDate: '2024-09-30' }, timestamp: '2024-10-15T10:55:01.456Z' } },
    { id: '6', time: '10:54:55', person: 'Diana Evans', door: 'Server Room D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'S2 NetBox', badge: { id: 'B111222', clearanceLevel: 'L4' }, door: { id: 'SR-D1', name: 'Server Room D1', securityLevel: 'HIGH' }, result: { granted: true, multiFactorUsed: true }, timestamp: '2024-10-15T10:54:55.789Z' } },
    { id: '7', time: '10:54:48', person: 'Edward Foster', door: 'Main Lobby D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'Genetec Synergis', badge: { id: 'B333444' }, door: { id: 'ML-D1', name: 'Main Lobby D1' }, result: { granted: true }, timestamp: '2024-10-15T10:54:48.234Z' } },
    { id: '8', time: '10:54:42', person: 'Fiona Garcia', door: 'Parking Garage D2', result: 'DENY' as const, suspicious: true, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'C-CURE 9000', badge: { id: 'B555666' }, door: { id: 'PG-D2', name: 'Parking Garage D2' }, result: { granted: false, denyReason: 'TAILGATING_DETECTED', sensorData: { antiPassback: true, tailgateScore: 0.92 } }, timestamp: '2024-10-15T10:54:42.567Z' } },
  ],
  buildright: [
    { id: '1', time: '06:23:45', person: 'Mike Johnson', door: 'Site Entrance D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'Lenel OnGuard', badge: { id: 'C123456', type: 'CONTRACTOR' }, door: { id: 'SE-D1', name: 'Site Entrance D1' }, result: { granted: true }, timestamp: '2024-10-15T06:23:45.123Z' } },
    { id: '2', time: '06:23:41', person: 'Tom Harris', door: 'Equipment Yard D1', result: 'DENY' as const, suspicious: true, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'Genetec Synergis', badge: { id: 'C789012', type: 'CONTRACTOR', company: 'Reliable Electric' }, door: { id: 'EY-D1', name: 'Equipment Yard D1' }, result: { granted: false, denyReason: 'SCHEDULE_VIOLATION', scheduledHours: '07:00-18:00', attemptTime: '06:23' }, timestamp: '2024-10-15T06:23:41.456Z' } },
    { id: '3', time: '06:23:38', person: 'Steve Clark', door: 'Warehouse A D2', result: 'DENY' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'HID Aero', badge: { id: 'C345678', status: 'EXPIRED' }, door: { id: 'WA-D2', name: 'Warehouse A D2' }, result: { granted: false, denyReason: 'EXPIRED_CREDENTIAL' }, timestamp: '2024-10-15T06:23:38.789Z' } },
    { id: '4', time: '06:23:32', person: 'Lisa Martinez', door: 'Site Office D1', result: 'GRANT' as const, suspicious: false, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'Lenel OnGuard', badge: { id: 'C901234', role: 'SAFETY_OFFICER' }, door: { id: 'SO-D1', name: 'Site Office D1' }, result: { granted: true }, timestamp: '2024-10-15T06:23:32.234Z' } },
    { id: '5', time: '06:23:25', person: 'Robert Lee', door: 'Equipment Yard D2', result: 'DENY' as const, suspicious: true, rawPayload: { eventType: 'ACCESS_ATTEMPT', sourceSystem: 'Verkada', badge: { id: 'C567890', status: 'INVALID' }, door: { id: 'EY-D2', name: 'Equipment Yard D2' }, result: { granted: false, denyReason: 'INVALID_CREDENTIAL', errorCode: 'VRK-401' }, timestamp: '2024-10-15T06:23:25.567Z' } },
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
  const [persona, setPersona] = useState<Persona>('ceo');
  const [activeTab, setActiveTab] = useState('executive');
  const [tenant, setTenant] = useState<'acme' | 'buildright'>('acme');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dataAge, setDataAge] = useState(12);
  const [timeRange, setTimeRange] = useState<'15m' | '60m' | '24h'>('24h');
  const [isStreaming, setIsStreaming] = useState(false);
  const [useLiveData, setUseLiveData] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDataAge((prev) => {
        if (prev > 25) {
          return Math.floor(Math.random() * 5) + 1;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setActiveTab(personaDefaults[persona]);
  }, [persona]);

  const kpis = sampleKPIs[tenant];
  const alerts = sampleAlerts[tenant];
  const events = sampleEvents[tenant];

  const visibleTabIds = personaTabs[persona];
  const visibleTabs = allTabs.filter(tab => visibleTabIds.includes(tab.id));

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">ClearView Intelligence</h1>
              <p className="text-xs text-gray-500">Physical Identity & Access Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <PersonaSelector value={persona} onChange={setPersona} />
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {(['15m', '60m', '24h'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    timeRange === range
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <TenantSelector value={tenant} onChange={setTenant} />
            <div className="flex items-center text-sm text-gray-500">
              <span className={`w-2 h-2 rounded-full mr-2 ${dataAge < 15 ? 'bg-green-500' : dataAge < 30 ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
              Data: {dataAge}s ago
            </div>
            <SettingsPanel
              useLiveData={useLiveData}
              onToggleLiveData={setUseLiveData}
                          />
          </div>
        </div>
      </header>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} visibleTabs={visibleTabs} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'executive' && (
          <ExecutiveOverview tenant={tenant} useLiveData={useLiveData} />
        )}

        {activeTab === 'risk' && (
          <RealTimeRiskPanel 
            tenant={tenant} 
            isStreaming={isStreaming} 
            onToggleStream={() => setIsStreaming(!isStreaming)}
            useLiveData={useLiveData}
          />
        )}

        {activeTab === 'command' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <KPICard
                label={timeRange === '15m' ? 'Events (15m)' : timeRange === '60m' ? 'Events (1h)' : 'Events Today'}
                value={timeRange === '15m' 
                  ? Math.round(kpis.eventsToday / 96).toLocaleString()
                  : timeRange === '60m'
                    ? Math.round(kpis.eventsToday / 24).toLocaleString()
                    : kpis.eventsToday.toLocaleString()
                }
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-lg p-4 h-80 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Grants vs Denies ({timeRange === '15m' ? '15m' : timeRange === '60m' ? '1h' : '24h'})
                </h3>
                <TimeSeriesChart tenant={tenant} timeRange={timeRange} useLiveData={useLiveData} />
              </div>
              <div className="bg-white rounded-lg shadow-lg p-4 h-80 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Door Hotspots</h3>
                <MapView tenant={tenant} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AlertsPanel alerts={alerts} />
              <ConnectorHealth tenant={tenant} useLiveData={useLiveData} />
            </div>

            <EventsTable events={events} onEventClick={setSelectedEvent} />
          </div>
        )}

        {activeTab === 'hygiene' && (
          <HireToRetireView tenant={tenant} />
        )}

        {activeTab === 'governance' && (
          <GovernanceView tenant={tenant} />
        )}

        {activeTab === 'compliance' && (
          <ComplianceView tenant={tenant} useLiveData={useLiveData} />
        )}

        {activeTab === 'requests' && (
          <SelfServiceAnalytics tenant={tenant} />
        )}

        {activeTab === 'mustering' && (
          <MusteringView tenant={tenant} />
        )}

        {activeTab === 'genai' && (
          <GenAIView />
        )}
      </main>

      {selectedEvent && (
        <EvidenceDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
