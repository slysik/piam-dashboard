'use client';

import { useState, useEffect } from 'react';

interface MusteringViewProps {
  tenant: string;
}

interface Person {
  id: string;
  name: string;
  department: string;
  status: 'Accounted' | 'Missing' | 'En Route';
  lastSeen: string;
  lastLocation: string;
  checkInTime: string | null;
  badgeId: string;
  phone: string;
}

interface MusterPoint {
  id: string;
  name: string;
  capacity: number;
  current: number;
  status: 'Active' | 'Full' | 'Closed';
}

const musteringData: Record<string, { people: Person[]; musterPoints: MusterPoint[]; activeEmergency: boolean; emergencyType: string; startTime: string }> = {
  acme: {
    activeEmergency: true,
    emergencyType: 'Fire Alarm - Building A',
    startTime: '10:45 AM',
    musterPoints: [
      { id: '1', name: 'Parking Lot A - North', capacity: 200, current: 145, status: 'Active' },
      { id: '2', name: 'Parking Lot B - South', capacity: 150, current: 89, status: 'Active' },
      { id: '3', name: 'Athletic Field', capacity: 300, current: 12, status: 'Active' },
    ],
    people: [
      { id: '1', name: 'John Smith', department: 'Engineering', status: 'Accounted', lastSeen: '10:47 AM', lastLocation: 'Parking Lot A', checkInTime: '10:47 AM', badgeId: 'B123456', phone: '+1 (555) 123-4567' },
      { id: '2', name: 'Jane Doe', department: 'Finance', status: 'Missing', lastSeen: '10:32 AM', lastLocation: 'Floor 3 - Finance Wing', checkInTime: null, badgeId: 'B789012', phone: '+1 (555) 234-5678' },
      { id: '3', name: 'Bob Wilson', department: 'Facilities', status: 'Accounted', lastSeen: '10:48 AM', lastLocation: 'Parking Lot A', checkInTime: '10:48 AM', badgeId: 'B345678', phone: '+1 (555) 345-6789' },
      { id: '4', name: 'Alice Brown', department: 'HR', status: 'En Route', lastSeen: '10:46 AM', lastLocation: 'Stairwell B - Floor 2', checkInTime: null, badgeId: 'B901234', phone: '+1 (555) 456-7890' },
      { id: '5', name: 'Charlie Davis', department: 'IT', status: 'Accounted', lastSeen: '10:49 AM', lastLocation: 'Parking Lot B', checkInTime: '10:49 AM', badgeId: 'B567890', phone: '+1 (555) 567-8901' },
      { id: '6', name: 'Diana Evans', department: 'Executive', status: 'Missing', lastSeen: '10:15 AM', lastLocation: 'Executive Suite - Floor 5', checkInTime: null, badgeId: 'B111222', phone: '+1 (555) 678-9012' },
      { id: '7', name: 'Edward Foster', department: 'Sales', status: 'Accounted', lastSeen: '10:50 AM', lastLocation: 'Parking Lot A', checkInTime: '10:50 AM', badgeId: 'B333444', phone: '+1 (555) 789-0123' },
      { id: '8', name: 'Fiona Garcia', department: 'R&D', status: 'En Route', lastSeen: '10:47 AM', lastLocation: 'Emergency Exit - Lab A', checkInTime: null, badgeId: 'B555666', phone: '+1 (555) 890-1234' },
      { id: '9', name: 'George Harris', department: 'Marketing', status: 'Accounted', lastSeen: '10:51 AM', lastLocation: 'Parking Lot B', checkInTime: '10:51 AM', badgeId: 'B777888', phone: '+1 (555) 901-2345' },
      { id: '10', name: 'Helen Irving', department: 'Legal', status: 'Missing', lastSeen: '09:45 AM', lastLocation: 'Conference Room 3B', checkInTime: null, badgeId: 'B999000', phone: '+1 (555) 012-3456' },
    ],
  },
  buildright: {
    activeEmergency: true,
    emergencyType: 'Severe Weather Warning',
    startTime: '06:15 AM',
    musterPoints: [
      { id: '1', name: 'Site Office Shelter', capacity: 50, current: 42, status: 'Active' },
      { id: '2', name: 'Warehouse A Basement', capacity: 100, current: 67, status: 'Active' },
      { id: '3', name: 'Equipment Yard Gate', capacity: 30, current: 30, status: 'Full' },
    ],
    people: [
      { id: '1', name: 'Mike Johnson', department: 'Site Management', status: 'Accounted', lastSeen: '06:18 AM', lastLocation: 'Site Office Shelter', checkInTime: '06:18 AM', badgeId: 'C123456', phone: '+1 (555) 111-2222' },
      { id: '2', name: 'Tom Harris', department: 'Contractor - Electric', status: 'Missing', lastSeen: '06:10 AM', lastLocation: 'Tower Crane Area', checkInTime: null, badgeId: 'C789012', phone: '+1 (555) 222-3333' },
      { id: '3', name: 'Steve Clark', department: 'Contractor - Electric', status: 'Accounted', lastSeen: '06:20 AM', lastLocation: 'Warehouse A Basement', checkInTime: '06:20 AM', badgeId: 'C345678', phone: '+1 (555) 333-4444' },
      { id: '4', name: 'Lisa Martinez', department: 'Safety', status: 'Accounted', lastSeen: '06:16 AM', lastLocation: 'Site Office Shelter', checkInTime: '06:16 AM', badgeId: 'C901234', phone: '+1 (555) 444-5555' },
      { id: '5', name: 'Robert Lee', department: 'Contractor - Concrete', status: 'En Route', lastSeen: '06:19 AM', lastLocation: 'Foundation Zone B', checkInTime: null, badgeId: 'C567890', phone: '+1 (555) 555-6666' },
    ],
  },
};

const statusStyles: Record<string, { bg: string; text: string; pulse?: boolean }> = {
  'Accounted': { bg: 'bg-green-100', text: 'text-green-700' },
  'Missing': { bg: 'bg-red-100', text: 'text-red-700', pulse: true },
  'En Route': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

export default function MusteringView({ tenant }: MusteringViewProps) {
  const [filter, setFilter] = useState<'all' | 'missing' | 'enroute'>('all');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const data = musteringData[tenant] || musteringData.acme;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredPeople = data.people.filter(p => {
    if (filter === 'missing') return p.status === 'Missing';
    if (filter === 'enroute') return p.status === 'En Route';
    return true;
  });

  const stats = {
    total: data.people.length,
    accounted: data.people.filter(p => p.status === 'Accounted').length,
    missing: data.people.filter(p => p.status === 'Missing').length,
    enRoute: data.people.filter(p => p.status === 'En Route').length,
  };

  const accountedPercentage = Math.round((stats.accounted / stats.total) * 100);

  return (
    <div className="space-y-6">
      {data.activeEmergency && (
        <div className="bg-red-600 text-white rounded-lg shadow-lg p-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="text-3xl">🚨</div>
            <div>
              <div className="font-bold text-lg">ACTIVE EMERGENCY: {data.emergencyType}</div>
              <div className="text-red-100">Started: {data.startTime} | Elapsed: {formatElapsed(elapsedTime + 300)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{accountedPercentage}%</div>
            <div className="text-red-100">Personnel Accounted</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Total On-Site</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-green-500">
          <div className="text-sm text-green-600">Accounted</div>
          <div className="text-3xl font-bold text-green-600">{stats.accounted}</div>
        </div>
        <div className={`bg-white rounded-lg shadow-lg p-4 border-2 ${stats.missing > 0 ? 'border-red-500 animate-pulse' : 'border-gray-200'}`}>
          <div className="text-sm text-red-600">Missing</div>
          <div className="text-3xl font-bold text-red-600">{stats.missing}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-yellow-500">
          <div className="text-sm text-yellow-600">En Route</div>
          <div className="text-3xl font-bold text-yellow-600">{stats.enRoute}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Personnel Status</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs rounded ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                All ({stats.total})
              </button>
              <button 
                onClick={() => setFilter('missing')}
                className={`px-3 py-1 text-xs rounded ${filter === 'missing' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Missing ({stats.missing})
              </button>
              <button 
                onClick={() => setFilter('enroute')}
                className={`px-3 py-1 text-xs rounded ${filter === 'enroute' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                En Route ({stats.enRoute})
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Person</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Last Location</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Last Seen</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Check-In</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((person) => (
                  <tr
                    key={person.id}
                    onClick={() => setSelectedPerson(person)}
                    className={`border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${
                      person.status === 'Missing' ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-4 py-2">
                      <div className="text-gray-900 font-medium">{person.name}</div>
                      <div className="text-xs text-gray-500">{person.department}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[person.status].bg} ${statusStyles[person.status].text}`}>
                        {person.status === 'Missing' && '⚠ '}{person.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-900">{person.lastLocation}</td>
                    <td className="px-4 py-2 text-gray-500">{person.lastSeen}</td>
                    <td className="px-4 py-2">
                      {person.checkInTime ? (
                        <span className="text-green-600">{person.checkInTime}</span>
                      ) : (
                        <span className="text-red-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-4">Muster Points</h3>
            <div className="space-y-3">
              {data.musterPoints.map((point) => (
                <div key={point.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-900 font-medium text-sm">{point.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      point.status === 'Full' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {point.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${point.current >= point.capacity ? 'bg-orange-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((point.current / point.capacity) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{point.current}/{point.capacity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {stats.missing > 0 && (
            <div className="bg-red-50 rounded-lg shadow-lg p-4 border-2 border-red-300">
              <h3 className="text-sm font-medium text-red-700 mb-3 flex items-center">
                <span className="mr-2">🚨</span> Priority: Missing Personnel
              </h3>
              <div className="space-y-2">
                {data.people.filter(p => p.status === 'Missing').map((person) => (
                  <div 
                    key={person.id} 
                    className="bg-white rounded p-2 border border-red-200 cursor-pointer hover:bg-red-100"
                    onClick={() => setSelectedPerson(person)}
                  >
                    <div className="font-medium text-gray-900">{person.name}</div>
                    <div className="text-xs text-gray-500">Last: {person.lastLocation}</div>
                    <div className="text-xs text-red-600">Last seen: {person.lastSeen}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedPerson && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedPerson(null)} />
          <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-xl z-50 border-l border-gray-200 overflow-y-auto">
            <div className={`flex items-center justify-between p-4 border-b ${
              selectedPerson.status === 'Missing' ? 'bg-red-50 border-red-200' : 'border-gray-200'
            }`}>
              <h2 className="font-semibold text-gray-900">Personnel Details</h2>
              <button onClick={() => setSelectedPerson(null)} className="text-gray-500 hover:text-gray-700">X</button>
            </div>
            <div className="p-4 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedPerson.name}</h3>
                  <p className="text-sm text-gray-500">{selectedPerson.department}</p>
                  <p className="text-xs text-gray-400">Badge: {selectedPerson.badgeId}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${statusStyles[selectedPerson.status].bg} ${statusStyles[selectedPerson.status].text}`}>
                  {selectedPerson.status}
                </span>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-600">Location Information</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Known Location</span>
                    <span className="text-gray-900 font-medium">{selectedPerson.lastLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Seen</span>
                    <span className="text-gray-900">{selectedPerson.lastSeen}</span>
                  </div>
                  {selectedPerson.checkInTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Check-In Time</span>
                      <span className="text-green-600">{selectedPerson.checkInTime}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-600">Contact Information</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Phone</span>
                    <a href={`tel:${selectedPerson.phone}`} className="text-blue-600 hover:underline">
                      {selectedPerson.phone}
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <button className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors">
                  📞 Call Now
                </button>
                <button className="w-full px-3 py-2 bg-gray-100 rounded text-sm text-gray-900 hover:bg-gray-200 transition-colors">
                  📍 View on Map
                </button>
                <button className="w-full px-3 py-2 bg-gray-100 rounded text-sm text-gray-900 hover:bg-gray-200 transition-colors">
                  📋 View Access History
                </button>
                {selectedPerson.status !== 'Accounted' && (
                  <button className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors">
                    ✓ Mark as Accounted
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
