'use client';

import { useState, useEffect, useCallback } from 'react';

interface RealTimeRiskPanelProps {
  tenant: string;
  isStreaming: boolean;
  onToggleStream: () => void;
}

interface LiveEvent {
  id: string;
  timestamp: string;
  person: string;
  badge: string;
  door: string;
  site: string;
  result: 'GRANT' | 'DENY';
  anomalyFlags: string[];
  riskScore: number;
  hasVideo: boolean;
}

const anomalyTypes = [
  'is_after_hours',
  'denied_streak',
  'impossible_travel',
  'unusual_zone',
  'expired_credential',
];

const samplePeople = [
  'John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown', 'Charlie Davis',
  'Diana Evans', 'Edward Foster', 'Fiona Garcia', 'George Harris', 'Helen Irving',
  'Ivan Petrov', 'Julia Chen', 'Kevin Wright', 'Laura Martinez', 'Michael Thompson',
];

const sampleDoors = [
  { door: 'Main Tower F1 D1', site: 'HQ Tower' },
  { door: 'Main Tower F2 D3', site: 'HQ Tower' },
  { door: 'Server Room D1', site: 'Data Center' },
  { door: 'Warehouse A D1', site: 'Warehouse A' },
  { door: 'R&D Lab D2', site: 'R&D Lab' },
  { door: 'Parking Garage D1', site: 'HQ Tower' },
  { door: 'Executive Suite D1', site: 'HQ Tower' },
  { door: 'Equipment Yard D1', site: 'Warehouse A' },
];

const generateRandomEvent = (id: number): LiveEvent => {
  const person = samplePeople[Math.floor(Math.random() * samplePeople.length)];
  const doorInfo = sampleDoors[Math.floor(Math.random() * sampleDoors.length)];
  const isDeny = Math.random() < 0.15;
  const hasAnomaly = Math.random() < 0.25;
  const anomalies: string[] = [];
  
  if (hasAnomaly) {
    const numAnomalies = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < numAnomalies; i++) {
      const anomaly = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
      if (!anomalies.includes(anomaly)) anomalies.push(anomaly);
    }
  }

  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return {
    id: `evt-${id}-${Date.now()}`,
    timestamp,
    person,
    badge: `B${Math.floor(Math.random() * 900000) + 100000}`,
    door: doorInfo.door,
    site: doorInfo.site,
    result: isDeny ? 'DENY' : 'GRANT',
    anomalyFlags: anomalies,
    riskScore: anomalies.length > 0 ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 30) + 10,
    hasVideo: Math.random() > 0.3,
  };
};

const initialEvents: LiveEvent[] = Array.from({ length: 15 }, (_, i) => generateRandomEvent(i));

const topRiskIdentities = [
  { name: 'Jane Doe', score: 87, anomalies: 5, lastAnomaly: 'impossible_travel' },
  { name: 'Tom Harris', score: 76, anomalies: 4, lastAnomaly: 'denied_streak' },
  { name: 'Unknown Badge', score: 72, anomalies: 3, lastAnomaly: 'is_after_hours' },
  { name: 'Mike Chen', score: 65, anomalies: 2, lastAnomaly: 'unusual_zone' },
];

const topRiskDoors = [
  { door: 'Server Room D1', site: 'Data Center', score: 82, denies: 12 },
  { door: 'Equipment Yard D1', site: 'Warehouse A', score: 74, denies: 8 },
  { door: 'Executive Suite D1', site: 'HQ Tower', score: 68, denies: 5 },
];

export default function RealTimeRiskPanel({ tenant, isStreaming, onToggleStream }: RealTimeRiskPanelProps) {
  const [events, setEvents] = useState<LiveEvent[]>(initialEvents);
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'denies' | 'anomalies'>('all');
  const [eventCounter, setEventCounter] = useState(100);
  const [showVideoModal, setShowVideoModal] = useState<LiveEvent | null>(null);

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setEventCounter(prev => prev + 1);
      const newEvent = generateRandomEvent(eventCounter);
      setEvents(prev => [newEvent, ...prev.slice(0, 49)]);
    }, 15000);

    return () => clearInterval(interval);
  }, [isStreaming, eventCounter]);

  const filteredEvents = events.filter(e => {
    if (filter === 'denies') return e.result === 'DENY';
    if (filter === 'anomalies') return e.anomalyFlags.length > 0;
    return true;
  });

  const getAnomalyLabel = (flag: string) => {
    const labels: Record<string, string> = {
      is_after_hours: 'After Hours',
      denied_streak: 'Denied Streak',
      impossible_travel: 'Impossible Travel',
      unusual_zone: 'Unusual Zone',
      expired_credential: 'Expired Credential',
    };
    return labels[flag] || flag;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">Real-Time Risk & Anomaly Panel</h2>
          <button
            onClick={onToggleStream}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isStreaming 
                ? 'bg-green-500 text-white animate-pulse' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-white' : 'bg-gray-500'}`} />
            <span>{isStreaming ? 'Live Streaming' : 'Start Live Feed'}</span>
          </button>
        </div>
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          {(['all', 'denies', 'anomalies'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Live Event Stream</h3>
            <span className="text-xs text-gray-500">{filteredEvents.length} events</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Time</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Person</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Door / Site</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Result</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Anomalies</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Risk</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Video</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr 
                    key={event.id} 
                    className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${
                      event.anomalyFlags.length > 0 ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-gray-500 font-mono text-xs">{event.timestamp}</td>
                    <td className="px-4 py-2">
                      <button 
                        onClick={() => setSelectedIdentity(event.person)}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {event.person}
                      </button>
                      <div className="text-xs text-gray-400">{event.badge}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-gray-900">{event.door}</div>
                      <div className="text-xs text-gray-400">{event.site}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        event.result === 'GRANT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {event.result}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {event.anomalyFlags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {event.anomalyFlags.map((flag) => (
                            <span key={flag} className="inline-flex px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                              {getAnomalyLabel(flag)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className={`text-sm font-medium ${
                        event.riskScore >= 70 ? 'text-red-600' : event.riskScore >= 40 ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {event.riskScore}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {event.hasVideo ? (
                        <button 
                          onClick={() => setShowVideoModal(event)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Top Risk Identities (24h)</h3>
            <div className="space-y-2">
              {topRiskIdentities.map((identity) => (
                <div 
                  key={identity.name}
                  onClick={() => setSelectedIdentity(identity.name)}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{identity.name}</div>
                    <div className="text-xs text-gray-500">{identity.anomalies} anomalies</div>
                  </div>
                  <div className={`text-lg font-bold ${
                    identity.score >= 70 ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {identity.score}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Top Risk Doors (24h)</h3>
            <div className="space-y-2">
              {topRiskDoors.map((door) => (
                <div key={door.door} className="p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900 text-sm">{door.door}</div>
                    <div className={`text-lg font-bold ${
                      door.score >= 70 ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {door.score}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{door.site} • {door.denies} denies</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedIdentity && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedIdentity(null)} />
          <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-xl z-50 border-l border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="font-semibold text-gray-900">Anomaly Story: {selectedIdentity}</h2>
              <button onClick={() => setSelectedIdentity(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-700">Risk Score</span>
                  <span className="text-2xl font-bold text-red-600">76</span>
                </div>
                <div className="text-xs text-red-600 mt-1">4 anomalies in last 24 hours</div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Timeline (24h)</h3>
                <div className="space-y-2">
                  {[
                    { time: '10:55:18', event: 'DENY at Main Tower F2 D3', flags: ['is_after_hours'], hasVideo: true },
                    { time: '10:32:45', event: 'GRANT at Server Room D1', flags: ['unusual_zone'], hasVideo: true },
                    { time: '08:15:22', event: 'DENY at Equipment Yard D1', flags: ['denied_streak'], hasVideo: false },
                    { time: '06:45:10', event: 'GRANT at Parking Garage D1', flags: [], hasVideo: true },
                    { time: '23:55:00', event: 'DENY at Data Center D1', flags: ['is_after_hours', 'impossible_travel'], hasVideo: true },
                  ].map((item, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${item.flags.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-500">{item.time}</span>
                        {item.hasVideo && (
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="text-sm text-gray-900 mt-1">{item.event}</div>
                      {item.flags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.flags.map((flag) => (
                            <span key={flag} className="inline-flex px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                              {getAnomalyLabel(flag)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showVideoModal && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowVideoModal(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Video Evidence</h3>
                <button onClick={() => setShowVideoModal(null)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="bg-gray-900 aspect-video flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div className="text-sm">Video clip placeholder</div>
                  <div className="text-xs opacity-75">(VMS integration required)</div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Door:</span>
                  <span className="text-gray-900 font-medium">{showVideoModal.door}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Identity:</span>
                  <span className="text-gray-900 font-medium">{showVideoModal.person}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Timestamp:</span>
                  <span className="text-gray-900 font-medium">{showVideoModal.timestamp}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
