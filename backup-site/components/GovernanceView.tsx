'use client';

import { useState } from 'react';

interface GovernanceViewProps {
  tenant: string;
}

interface Entitlement {
  id: string;
  person: string;
  department: string;
  accessLevel: string;
  areas: string[];
  grantType: 'Policy' | 'Manual' | 'Exception';
  approvedBy: string;
  approvalDate: string;
  expiresAt: string;
  lastUsed: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Never Used';
}

const entitlementData: Record<string, Entitlement[]> = {
  acme: [
    { id: '1', person: 'John Smith', department: 'Engineering', accessLevel: 'L3 - Restricted', areas: ['Server Room', 'Lab A', 'Main Office'], grantType: 'Policy', approvedBy: 'HR System', approvalDate: '2024-01-15', expiresAt: '2025-01-15', lastUsed: '2 hours ago', status: 'Active' },
    { id: '2', person: 'Jane Doe', department: 'Finance', accessLevel: 'L2 - Standard', areas: ['Main Office', 'Finance Wing'], grantType: 'Manual', approvedBy: 'Sarah Wilson', approvalDate: '2024-06-20', expiresAt: '2024-12-20', lastUsed: '1 day ago', status: 'Expiring Soon' },
    { id: '3', person: 'Bob Wilson', department: 'Facilities', accessLevel: 'L4 - All Access', areas: ['All Areas'], grantType: 'Exception', approvedBy: 'CEO Office', approvalDate: '2024-03-01', expiresAt: '2024-09-01', lastUsed: 'Never', status: 'Never Used' },
    { id: '4', person: 'Alice Brown', department: 'HR', accessLevel: 'L2 - Standard', areas: ['HR Office', 'Main Office'], grantType: 'Policy', approvedBy: 'HR System', approvalDate: '2024-02-10', expiresAt: '2025-02-10', lastUsed: '3 hours ago', status: 'Active' },
    { id: '5', person: 'Charlie Davis', department: 'IT', accessLevel: 'L3 - Restricted', areas: ['Server Room', 'Network Closet', 'IT Office'], grantType: 'Policy', approvedBy: 'HR System', approvalDate: '2024-04-05', expiresAt: '2025-04-05', lastUsed: '30 min ago', status: 'Active' },
    { id: '6', person: 'Diana Evans', department: 'Executive', accessLevel: 'L4 - All Access', areas: ['All Areas'], grantType: 'Policy', approvedBy: 'Board', approvalDate: '2023-01-01', expiresAt: '2026-01-01', lastUsed: '5 hours ago', status: 'Active' },
    { id: '7', person: 'Edward Foster', department: 'Sales', accessLevel: 'L1 - Basic', areas: ['Main Lobby', 'Sales Floor'], grantType: 'Manual', approvedBy: 'Sales Director', approvalDate: '2024-07-15', expiresAt: '2024-10-15', lastUsed: '2 days ago', status: 'Expired' },
    { id: '8', person: 'Fiona Garcia', department: 'R&D', accessLevel: 'L3 - Restricted', areas: ['Lab A', 'Lab B', 'R&D Office'], grantType: 'Exception', approvedBy: 'CTO', approvalDate: '2024-05-20', expiresAt: '2025-05-20', lastUsed: '1 hour ago', status: 'Active' },
  ],
  buildright: [
    { id: '1', person: 'Mike Johnson', department: 'Site Management', accessLevel: 'L4 - All Access', areas: ['All Sites'], grantType: 'Policy', approvedBy: 'HR System', approvalDate: '2024-01-01', expiresAt: '2025-01-01', lastUsed: '1 hour ago', status: 'Active' },
    { id: '2', person: 'Tom Harris', department: 'Contractor - Electric', accessLevel: 'L2 - Restricted Zones', areas: ['Electrical Room', 'Main Site'], grantType: 'Manual', approvedBy: 'Site Supervisor', approvalDate: '2024-08-01', expiresAt: '2024-11-01', lastUsed: '4 hours ago', status: 'Expiring Soon' },
    { id: '3', person: 'Steve Clark', department: 'Contractor - HVAC', accessLevel: 'L2 - Restricted Zones', areas: ['Mechanical Room', 'Roof Access'], grantType: 'Exception', approvedBy: 'Project Manager', approvalDate: '2024-09-01', expiresAt: '2024-09-30', lastUsed: '2 days ago', status: 'Expired' },
    { id: '4', person: 'Lisa Martinez', department: 'Safety', accessLevel: 'L3 - Safety Override', areas: ['All Sites', 'Hazmat Storage'], grantType: 'Policy', approvedBy: 'HR System', approvalDate: '2024-02-15', expiresAt: '2025-02-15', lastUsed: '30 min ago', status: 'Active' },
  ],
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  'Active': { bg: 'bg-green-100', text: 'text-green-700' },
  'Expiring Soon': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Expired': { bg: 'bg-red-100', text: 'text-red-700' },
  'Never Used': { bg: 'bg-gray-100', text: 'text-gray-700' },
};

const grantTypeStyles: Record<string, { bg: string; text: string }> = {
  'Policy': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Manual': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Exception': { bg: 'bg-orange-100', text: 'text-orange-700' },
};

export default function GovernanceView({ tenant }: GovernanceViewProps) {
  const [selectedPerson, setSelectedPerson] = useState<Entitlement | null>(null);
  const [filter, setFilter] = useState<'all' | 'expiring' | 'exceptions'>('all');
  
  const entitlements = entitlementData[tenant] || entitlementData.acme;
  
  const filteredEntitlements = entitlements.filter(e => {
    if (filter === 'expiring') return e.status === 'Expiring Soon' || e.status === 'Expired';
    if (filter === 'exceptions') return e.grantType === 'Exception';
    return true;
  });

  const stats = {
    total: entitlements.length,
    active: entitlements.filter(e => e.status === 'Active').length,
    expiring: entitlements.filter(e => e.status === 'Expiring Soon' || e.status === 'Expired').length,
    exceptions: entitlements.filter(e => e.grantType === 'Exception').length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Total Entitlements</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Expiring/Expired</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.expiring}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Exceptions</div>
          <div className="text-2xl font-bold text-orange-600">{stats.exceptions}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-600">Access Entitlements</h3>
          <div className="flex space-x-2">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('expiring')}
              className={`px-3 py-1 text-xs rounded ${filter === 'expiring' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Expiring
            </button>
            <button 
              onClick={() => setFilter('exceptions')}
              className={`px-3 py-1 text-xs rounded ${filter === 'exceptions' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Exceptions
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Person</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Access Level</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Grant Type</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Approved By</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Expires</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Last Used</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntitlements.map((ent) => (
                <tr
                  key={ent.id}
                  onClick={() => setSelectedPerson(ent)}
                  className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2">
                    <div className="text-gray-900 font-medium">{ent.person}</div>
                    <div className="text-xs text-gray-500">{ent.department}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-900">{ent.accessLevel}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${grantTypeStyles[ent.grantType].bg} ${grantTypeStyles[ent.grantType].text}`}>
                      {ent.grantType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-900">{ent.approvedBy}</td>
                  <td className="px-4 py-2 text-gray-900">{ent.expiresAt}</td>
                  <td className="px-4 py-2 text-gray-500">{ent.lastUsed}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[ent.status].bg} ${statusStyles[ent.status].text}`}>
                      {ent.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPerson && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedPerson(null)} />
          <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-xl z-50 border-l border-gray-200 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Access Details</h2>
              <button onClick={() => setSelectedPerson(null)} className="text-gray-500 hover:text-gray-700">X</button>
            </div>
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedPerson.person}</h3>
                <p className="text-sm text-gray-500">{selectedPerson.department}</p>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-600">Entitlement Details</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Access Level</span>
                    <span className="text-gray-900 font-medium">{selectedPerson.accessLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Grant Type</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${grantTypeStyles[selectedPerson.grantType].bg} ${grantTypeStyles[selectedPerson.grantType].text}`}>
                      {selectedPerson.grantType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Approved By</span>
                    <span className="text-gray-900">{selectedPerson.approvedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Approval Date</span>
                    <span className="text-gray-900">{selectedPerson.approvalDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expires</span>
                    <span className="text-gray-900">{selectedPerson.expiresAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Used</span>
                    <span className="text-gray-900">{selectedPerson.lastUsed}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-600">Authorized Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPerson.areas.map((area, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-600">Approval Chain</h4>
                <div className="border-l-2 border-gray-200 pl-4 space-y-3">
                  <div>
                    <div className="text-sm text-gray-900">Access Requested</div>
                    <div className="text-xs text-gray-500">{selectedPerson.approvalDate} - Self-service portal</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-900">Manager Approval</div>
                    <div className="text-xs text-gray-500">{selectedPerson.approvalDate} - Auto-approved by policy</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-900">Security Review</div>
                    <div className="text-xs text-gray-500">{selectedPerson.approvalDate} - {selectedPerson.approvedBy}</div>
                  </div>
                  <div>
                    <div className="text-sm text-green-600 font-medium">Access Granted</div>
                    <div className="text-xs text-gray-500">{selectedPerson.approvalDate} - Credential issued</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <button className="w-full text-left px-3 py-2 bg-gray-100 rounded text-sm text-gray-900 hover:bg-red-100 transition-colors">
                  View Access History
                </button>
                <button className="w-full text-left px-3 py-2 bg-gray-100 rounded text-sm text-gray-900 hover:bg-red-100 transition-colors">
                  Export Audit Trail
                </button>
                <button className="w-full text-left px-3 py-2 bg-red-100 rounded text-sm text-red-700 hover:bg-red-200 transition-colors">
                  Revoke Access
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
