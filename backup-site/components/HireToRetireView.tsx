'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HireToRetireViewProps {
  tenant: string;
}

interface Identity {
  id: string;
  name: string;
  hrStatus: 'Active' | 'Terminated' | 'Contractor' | 'Leave';
  badgeStatus: 'Active' | 'Disabled' | 'Expired';
  department: string;
  startDate: string;
  endDate: string | null;
  lastSwipe: string;
  badgeId: string;
  site: string;
}

const hygieneData: Identity[] = [
  { id: '1', name: 'Jane Doe', hrStatus: 'Terminated', badgeStatus: 'Active', department: 'Finance', startDate: '2021-03-15', endDate: '2024-10-01', lastSwipe: '2 hours ago', badgeId: 'B789012', site: 'HQ Tower' },
  { id: '2', name: 'Tom Harris', hrStatus: 'Contractor', badgeStatus: 'Active', department: 'IT', startDate: '2024-01-10', endDate: '2024-09-30', lastSwipe: '1 day ago', badgeId: 'C789012', site: 'Data Center' },
  { id: '3', name: 'Steve Clark', hrStatus: 'Contractor', badgeStatus: 'Active', department: 'Facilities', startDate: '2024-02-01', endDate: '2024-10-15', lastSwipe: '4 hours ago', badgeId: 'C345678', site: 'Warehouse A' },
  { id: '4', name: 'Maria Garcia', hrStatus: 'Terminated', badgeStatus: 'Active', department: 'Sales', startDate: '2020-06-20', endDate: '2024-09-28', lastSwipe: '3 days ago', badgeId: 'B111333', site: 'HQ Tower' },
  { id: '5', name: 'Robert Lee', hrStatus: 'Active', badgeStatus: 'Active', department: 'Engineering', startDate: '2022-08-01', endDate: null, lastSwipe: '45 days ago', badgeId: 'B567890', site: 'R&D Lab' },
  { id: '6', name: 'Nancy Taylor', hrStatus: 'Active', badgeStatus: 'Active', department: 'HR', startDate: '2019-11-15', endDate: null, lastSwipe: '1 hour ago', badgeId: 'B444555', site: 'HQ Tower' },
  { id: '7', name: 'Kevin Wright', hrStatus: 'Terminated', badgeStatus: 'Disabled', department: 'Marketing', startDate: '2021-07-01', endDate: '2024-08-15', lastSwipe: '60 days ago', badgeId: 'B666777', site: 'HQ Tower' },
  { id: '8', name: 'Lisa Park', hrStatus: 'Leave', badgeStatus: 'Active', department: 'Legal', startDate: '2020-02-10', endDate: null, lastSwipe: '30 days ago', badgeId: 'B888999', site: 'HQ Tower' },
];

const matrixData = [
  { combo: 'Active / Active', count: 847, color: '#22c55e' },
  { combo: 'Terminated / Active', count: 12, color: '#ef4444' },
  { combo: 'Terminated / Disabled', count: 156, color: '#6b7280' },
  { combo: 'Contractor Expired / Active', count: 8, color: '#f97316' },
  { combo: 'Leave / Active', count: 23, color: '#eab308' },
];

export default function HireToRetireView({ tenant }: HireToRetireViewProps) {
  const [selectedIdentity, setSelectedIdentity] = useState<Identity | null>(null);
  const [filter, setFilter] = useState<'all' | 'terminated' | 'expired' | 'dormant'>('all');

  const terminatedActive = hygieneData.filter(i => i.hrStatus === 'Terminated' && i.badgeStatus === 'Active');
  const contractorExpired = hygieneData.filter(i => i.hrStatus === 'Contractor' && i.endDate && new Date(i.endDate) < new Date());
  const dormantBadges = hygieneData.filter(i => i.lastSwipe.includes('days'));

  const filteredData = hygieneData.filter(i => {
    if (filter === 'terminated') return i.hrStatus === 'Terminated' && i.badgeStatus === 'Active';
    if (filter === 'expired') return i.hrStatus === 'Contractor' && i.endDate && new Date(i.endDate) < new Date();
    if (filter === 'dormant') return i.lastSwipe.includes('days');
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Hire-to-Retire Access Hygiene</h2>
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          {(['all', 'terminated', 'expired', 'dormant'] as const).map((f) => (
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setFilter('terminated')}
          className="bg-red-500 rounded-xl p-5 text-white shadow-lg cursor-pointer hover:bg-red-600 transition-colors"
        >
          <div className="text-red-100 text-sm font-medium">Terminated + Active Badge</div>
          <div className="text-4xl font-bold mt-1">{terminatedActive.length}</div>
          <div className="text-red-200 text-xs mt-2">⚠ Requires immediate action</div>
        </div>
        <div 
          onClick={() => setFilter('expired')}
          className="bg-orange-500 rounded-xl p-5 text-white shadow-lg cursor-pointer hover:bg-orange-600 transition-colors"
        >
          <div className="text-orange-100 text-sm font-medium">Contractors Past End Date</div>
          <div className="text-4xl font-bold mt-1">{contractorExpired.length}</div>
          <div className="text-orange-200 text-xs mt-2">Contract expired, badge active</div>
        </div>
        <div 
          onClick={() => setFilter('dormant')}
          className="bg-amber-500 rounded-xl p-5 text-white shadow-lg cursor-pointer hover:bg-amber-600 transition-colors"
        >
          <div className="text-amber-100 text-sm font-medium">Dormant Badges</div>
          <div className="text-4xl font-bold mt-1">{dormantBadges.length}</div>
          <div className="text-amber-200 text-xs mt-2">No activity in 30+ days</div>
        </div>
        <div className="bg-green-500 rounded-xl p-5 text-white shadow-lg">
          <div className="text-green-100 text-sm font-medium">Healthy Identities</div>
          <div className="text-4xl font-bold mt-1">847</div>
          <div className="text-green-200 text-xs mt-2">HR + PIAM aligned</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">HR ↔ PIAM State Matrix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matrixData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis type="category" dataKey="combo" fontSize={11} tick={{ fill: '#6b7280' }} width={150} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {matrixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Identity List</h3>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Name</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">HR Status</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Badge</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Last Swipe</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((identity) => (
                  <tr 
                    key={identity.id}
                    onClick={() => setSelectedIdentity(identity)}
                    className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      identity.hrStatus === 'Terminated' && identity.badgeStatus === 'Active' ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{identity.name}</div>
                      <div className="text-xs text-gray-500">{identity.department}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        identity.hrStatus === 'Active' ? 'bg-green-100 text-green-700' :
                        identity.hrStatus === 'Terminated' ? 'bg-red-100 text-red-700' :
                        identity.hrStatus === 'Contractor' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {identity.hrStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        identity.badgeStatus === 'Active' ? 'bg-green-100 text-green-700' :
                        identity.badgeStatus === 'Disabled' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {identity.badgeStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{identity.lastSwipe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedIdentity && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedIdentity(null)} />
          <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-xl z-50 border-l border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="font-semibold text-gray-900">Identity Details</h2>
              <button onClick={() => setSelectedIdentity(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto flex items-center justify-center text-2xl">
                  {selectedIdentity.name.charAt(0)}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-2">{selectedIdentity.name}</h3>
                <p className="text-sm text-gray-500">{selectedIdentity.department}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">HR Attributes</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Employment Status</span>
                    <span className={`font-medium ${
                      selectedIdentity.hrStatus === 'Terminated' ? 'text-red-600' : 'text-gray-900'
                    }`}>{selectedIdentity.hrStatus}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Start Date</span>
                    <span className="text-gray-900">{selectedIdentity.startDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">End Date</span>
                    <span className="text-gray-900">{selectedIdentity.endDate || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">PIAM Attributes</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Badge ID</span>
                    <span className="text-gray-900 font-mono">{selectedIdentity.badgeId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Badge Status</span>
                    <span className={`font-medium ${
                      selectedIdentity.badgeStatus === 'Active' ? 'text-green-600' : 'text-red-600'
                    }`}>{selectedIdentity.badgeStatus}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Primary Site</span>
                    <span className="text-gray-900">{selectedIdentity.site}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Swipe</span>
                    <span className="text-gray-900">{selectedIdentity.lastSwipe}</span>
                  </div>
                </div>
              </div>

              {selectedIdentity.hrStatus === 'Terminated' && selectedIdentity.badgeStatus === 'Active' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-red-700">
                    <span>⚠</span>
                    <span className="font-medium">Critical: Badge should be disabled</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">Employee was terminated but badge remains active.</p>
                  <button className="mt-3 w-full bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                    Disable Badge Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
