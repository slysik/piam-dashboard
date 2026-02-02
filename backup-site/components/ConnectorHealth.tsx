/**
 * ConnectorHealth - PACS System Connector Status Monitor
 *
 * This component displays the health status of physical access control system
 * (PACS) connectors that feed data into the PIAM platform. It shows connection
 * status, latency metrics, and last check timestamps for each integrated system
 * like Lenel, C-CURE, S2 NetBox, Genetec, HID, and Verkada.
 *
 * @component
 * @example
 * <ConnectorHealth tenant="acme" />
 * <ConnectorHealth tenant="buildright" useLiveData={true} />
 *
 * Architecture Notes:
 * - Uses useConnectorHealthWithFallback hook for live/demo data handling
 * - Three status levels: healthy (OK), degraded (!), down/offline (X)
 * - Latency displayed in milliseconds with warning highlight above 200ms
 * - Down connectors show dash instead of latency value
 * - Live indicator badge shown when connected to real-time health checks
 * - Loading spinner overlay during data refresh
 * - Per-tenant connector configurations (acme has different PACS than buildright)
 *
 * Data Flow:
 * - tenant prop selects connector list from connectorData record
 * - useLiveData triggers real API health checks vs static demo data
 * - Hook returns { data, loading, isLive } for UI state management
 * - Data transformed from hook format to component's expected Connector shape
 * - Status mapping: 'offline' from API -> 'down' for display
 *
 * @param {ConnectorHealthProps} props - Component props
 * @param {string} props.tenant - The tenant identifier for connector list
 * @param {boolean} [props.useLiveData=false] - Whether to fetch live health data
 */
'use client';

import { useMemo } from 'react';
import { useConnectorHealthWithFallback } from '@/hooks/useDashboardData';

/**
 * Props for the ConnectorHealth component
 */
interface ConnectorHealthProps {
  tenant: string;
  useLiveData?: boolean;
}

interface Connector {
  name: string;
  pacsType: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastCheck: string;
}

const connectorData: Record<string, Connector[]> = {
  acme: [
    { name: 'Lenel Primary', pacsType: 'Lenel OnGuard', status: 'healthy', latencyMs: 45, lastCheck: '12s ago' },
    { name: 'C-CURE Satellite', pacsType: 'C-CURE 9000', status: 'healthy', latencyMs: 62, lastCheck: '8s ago' },
    { name: 'S2 Building B', pacsType: 'S2 NetBox', status: 'healthy', latencyMs: 38, lastCheck: '15s ago' },
    { name: 'Genetec Campus', pacsType: 'Genetec Synergis', status: 'healthy', latencyMs: 55, lastCheck: '5s ago' },
  ],
  buildright: [
    { name: 'Site Main', pacsType: 'Lenel OnGuard', status: 'healthy', latencyMs: 52, lastCheck: '10s ago' },
    { name: 'Genetec Gate', pacsType: 'Genetec Synergis', status: 'degraded', latencyMs: 450, lastCheck: '3s ago' },
    { name: 'HID Warehouse', pacsType: 'HID Aero', status: 'healthy', latencyMs: 41, lastCheck: '18s ago' },
    { name: 'Mobile Units', pacsType: 'Verkada', status: 'down', latencyMs: 0, lastCheck: '5m ago' },
  ],
};

const statusStyles = {
  healthy: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    icon: 'OK',
  },
  degraded: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    icon: '!',
  },
  down: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: 'X',
  },
  offline: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: 'X',
  },
};

export default function ConnectorHealth({ tenant, useLiveData = false }: ConnectorHealthProps) {
  const demoConnectors = connectorData[tenant] || connectorData.acme;
  
  const demoDataForHook = useMemo(() => demoConnectors.map(c => ({
    name: c.name,
    type: c.pacsType,
    status: c.status as 'healthy' | 'degraded' | 'offline',
    latency: c.latencyMs,
    eventsPerMin: 0,
    lastCheck: c.lastCheck,
  })), [tenant]);

  const { data, loading, isLive } = useConnectorHealthWithFallback(tenant, useLiveData, demoDataForHook);

  const connectors = data.map(c => ({
    name: c.name,
    pacsType: c.type,
    status: c.status === 'offline' ? 'down' : c.status,
    latencyMs: c.latency,
    lastCheck: c.lastCheck,
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200 relative">
      {isLive && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
            Live
          </span>
        </div>
      )}
      <h3 className="text-sm font-medium text-gray-600 mb-3">Connector Health</h3>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10 rounded-lg">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="pb-2 font-medium">Connector</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Latency</th>
              <th className="pb-2 font-medium">Last Check</th>
            </tr>
          </thead>
          <tbody>
            {connectors.map((connector, idx) => {
              const styles = statusStyles[connector.status as keyof typeof statusStyles] || statusStyles.healthy;
              return (
                <tr key={idx} className="border-t border-gray-200">
                  <td className="py-2 text-gray-900">
                    <div>{connector.name}</div>
                    <div className="text-xs text-gray-500">{connector.pacsType}</div>
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles.bg} ${styles.text}`}
                    >
                      {styles.icon} {connector.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-900">
                    {connector.status === 'down' ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <span className={connector.latencyMs > 200 ? 'text-yellow-600' : ''}>
                        {connector.latencyMs}ms
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-gray-500">{connector.lastCheck}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
