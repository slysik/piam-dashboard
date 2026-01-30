'use client';

interface ConnectorHealthProps {
  tenant: string;
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
};

export default function ConnectorHealth({ tenant }: ConnectorHealthProps) {
  const connectors = connectorData[tenant] || connectorData.acme;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-3">Connector Health</h3>
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
              const styles = statusStyles[connector.status];
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
