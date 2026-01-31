'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface SelfServiceAnalyticsProps {
  tenant: string;
}

const funnelData = [
  { status: 'Submitted', count: 156, color: '#3b82f6' },
  { status: 'Pending Approval', count: 42, color: '#f59e0b' },
  { status: 'Approved', count: 89, color: '#22c55e' },
  { status: 'Rejected', count: 18, color: '#ef4444' },
  { status: 'Expired', count: 7, color: '#6b7280' },
];

const slaData = [
  { zone: 'General Access', avgHours: 4.2, target: 8 },
  { zone: 'Restricted Areas', avgHours: 18.5, target: 24 },
  { zone: 'Data Center', avgHours: 36.2, target: 48 },
  { zone: 'Executive Suite', avgHours: 52.1, target: 24 },
];

const weeklyTrend = [
  { week: 'W1', requests: 32, approved: 28 },
  { week: 'W2', requests: 45, approved: 38 },
  { week: 'W3', requests: 38, approved: 35 },
  { week: 'W4', requests: 41, approved: 37 },
];

interface AccessRequest {
  id: string;
  requester: string;
  department: string;
  zone: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Expired';
  riskLevel: 'Low' | 'Medium' | 'High';
  createdAt: string;
  approvedAt: string | null;
  approver: string | null;
  hoursToApprove: number | null;
}

const accessRequests: AccessRequest[] = [
  { id: 'REQ-001', requester: 'John Smith', department: 'Engineering', zone: 'R&D Lab', status: 'Pending', riskLevel: 'High', createdAt: '2024-10-15 09:30', approvedAt: null, approver: null, hoursToApprove: null },
  { id: 'REQ-002', requester: 'Jane Doe', department: 'Finance', zone: 'Data Center', status: 'Pending', riskLevel: 'High', createdAt: '2024-10-15 08:15', approvedAt: null, approver: null, hoursToApprove: null },
  { id: 'REQ-003', requester: 'Bob Wilson', department: 'HR', zone: 'General Access', status: 'Approved', riskLevel: 'Low', createdAt: '2024-10-14 14:20', approvedAt: '2024-10-14 16:45', approver: 'Sarah Manager', hoursToApprove: 2.4 },
  { id: 'REQ-004', requester: 'Alice Brown', department: 'Sales', zone: 'Executive Suite', status: 'Pending', riskLevel: 'High', createdAt: '2024-10-14 11:00', approvedAt: null, approver: null, hoursToApprove: null },
  { id: 'REQ-005', requester: 'Charlie Davis', department: 'IT', zone: 'Server Room', status: 'Approved', riskLevel: 'Medium', createdAt: '2024-10-13 16:30', approvedAt: '2024-10-14 09:15', approver: 'Mike Director', hoursToApprove: 16.75 },
  { id: 'REQ-006', requester: 'Diana Evans', department: 'Legal', zone: 'Restricted Areas', status: 'Rejected', riskLevel: 'High', createdAt: '2024-10-13 10:00', approvedAt: null, approver: 'Security Team', hoursToApprove: null },
  { id: 'REQ-007', requester: 'Edward Foster', department: 'Marketing', zone: 'General Access', status: 'Approved', riskLevel: 'Low', createdAt: '2024-10-12 09:00', approvedAt: '2024-10-12 11:30', approver: 'Lisa Manager', hoursToApprove: 2.5 },
];

export default function SelfServiceAnalytics({ tenant }: SelfServiceAnalyticsProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'high-risk'>('all');

  const filteredRequests = accessRequests.filter(r => {
    if (filter === 'pending') return r.status === 'Pending';
    if (filter === 'high-risk') return r.riskLevel === 'High';
    return true;
  });

  const pendingCount = accessRequests.filter(r => r.status === 'Pending').length;
  const highRiskPending = accessRequests.filter(r => r.status === 'Pending' && r.riskLevel === 'High').length;
  const avgApprovalTime = accessRequests
    .filter(r => r.hoursToApprove !== null)
    .reduce((sum, r) => sum + (r.hoursToApprove || 0), 0) / accessRequests.filter(r => r.hoursToApprove !== null).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Self-Service & Approval Analytics</h2>
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          {(['all', 'pending', 'high-risk'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-amber-500 rounded-xl p-5 text-white shadow-lg">
          <div className="text-amber-100 text-sm font-medium">Pending Requests</div>
          <div className="text-4xl font-bold mt-1">{pendingCount}</div>
          <div className="text-amber-200 text-xs mt-2">Awaiting approval</div>
        </div>
        <div className="bg-red-500 rounded-xl p-5 text-white shadow-lg">
          <div className="text-red-100 text-sm font-medium">High-Risk Pending</div>
          <div className="text-4xl font-bold mt-1">{highRiskPending}</div>
          <div className="text-red-200 text-xs mt-2">Requires security review</div>
        </div>
        <div className="bg-blue-500 rounded-xl p-5 text-white shadow-lg">
          <div className="text-blue-100 text-sm font-medium">Avg Approval Time</div>
          <div className="text-4xl font-bold mt-1">{avgApprovalTime.toFixed(1)}h</div>
          <div className="text-blue-200 text-xs mt-2">Target: 8h for general</div>
        </div>
        <div className="bg-green-500 rounded-xl p-5 text-white shadow-lg">
          <div className="text-green-100 text-sm font-medium">Approval Rate</div>
          <div className="text-4xl font-bold mt-1">83%</div>
          <div className="text-green-200 text-xs mt-2">Last 30 days</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Funnel</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis type="category" dataKey="status" fontSize={11} tick={{ fill: '#6b7280' }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SLA by Zone</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="zone" fontSize={10} tick={{ fill: '#6b7280' }} angle={-15} textAnchor="end" height={60} />
                <YAxis fontSize={12} tick={{ fill: '#6b7280' }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="avgHours" fill="#3b82f6" name="Avg Hours" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="target" fill="#d1d5db" name="Target" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Trend</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis fontSize={12} tick={{ fill: '#6b7280' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} name="Requests" isAnimationActive={false} />
                <Line type="monotone" dataKey="approved" stroke="#22c55e" strokeWidth={2} name="Approved" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Access Requests</h3>
          <span className="text-xs text-gray-500">{filteredRequests.length} requests</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Request ID</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Requester</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Zone</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Risk</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Created</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Time to Approve</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-900">{request.id}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{request.requester}</div>
                    <div className="text-xs text-gray-500">{request.department}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-900">{request.zone}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      request.status === 'Approved' ? 'bg-green-100 text-green-700' :
                      request.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                      request.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      request.riskLevel === 'High' ? 'bg-red-100 text-red-700' :
                      request.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {request.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{request.createdAt}</td>
                  <td className="px-4 py-2 text-gray-900">
                    {request.hoursToApprove ? `${request.hoursToApprove.toFixed(1)}h` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
