'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface ComplianceViewProps {
  tenant: string;
}

interface Contractor {
  id: string;
  name: string;
  company: string;
  trade: string;
  badgeId: string;
  personType: 'contractor' | 'employee' | 'visitor';
  requirementType: 'Safety Training' | 'Background Check' | 'Site Induction' | 'Certification';
  status: 'Compliant' | 'Expiring' | 'Expired' | 'Non-Compliant';
  expiryDate: string;
  daysUntilExpiry: number;
  lastAccess: string;
}

const contractorData: Record<string, Contractor[]> = {
  acme: [
    { id: '1', name: 'Mike Chen', company: 'TechStaff Inc', trade: 'IT Support', badgeId: 'C-001234', personType: 'contractor', requirementType: 'Safety Training', status: 'Compliant', expiryDate: '2025-06-15', daysUntilExpiry: 137, lastAccess: '2 hours ago' },
    { id: '2', name: 'Sarah Miller', company: 'TechStaff Inc', trade: 'IT Support', badgeId: 'C-001235', personType: 'contractor', requirementType: 'Safety Training', status: 'Expired', expiryDate: '2024-09-01', daysUntilExpiry: -151, lastAccess: '1 day ago' },
    { id: '3', name: 'James Wilson', company: 'CleanCorp', trade: 'Janitorial', badgeId: 'C-002001', personType: 'contractor', requirementType: 'Background Check', status: 'Compliant', expiryDate: '2025-03-20', daysUntilExpiry: 50, lastAccess: '5 hours ago' },
    { id: '4', name: 'Lisa Park', company: 'SecureGuard', trade: 'Security', badgeId: 'C-003001', personType: 'employee', requirementType: 'Certification', status: 'Expiring', expiryDate: '2025-02-15', daysUntilExpiry: 17, lastAccess: '30 min ago' },
    { id: '5', name: 'David Kim', company: 'HVAC Pros', trade: 'HVAC', badgeId: 'C-004001', personType: 'contractor', requirementType: 'Site Induction', status: 'Non-Compliant', expiryDate: '-', daysUntilExpiry: 0, lastAccess: 'Never' },
    { id: '6', name: 'Emma Thompson', company: 'TechStaff Inc', trade: 'IT Support', badgeId: 'C-001236', personType: 'contractor', requirementType: 'Safety Training', status: 'Expiring', expiryDate: '2025-02-20', daysUntilExpiry: 22, lastAccess: '3 hours ago' },
    { id: '7', name: 'Robert Jones', company: 'CleanCorp', trade: 'Janitorial', badgeId: 'C-002002', personType: 'employee', requirementType: 'Background Check', status: 'Compliant', expiryDate: '2026-01-10', daysUntilExpiry: 345, lastAccess: '6 hours ago' },
  ],
  buildright: [
    { id: '1', name: 'Tom Harris', company: 'Reliable Electric', trade: 'Electrician', badgeId: 'C-100001', personType: 'contractor', requirementType: 'Safety Training', status: 'Expired', expiryDate: '2024-08-15', daysUntilExpiry: -168, lastAccess: '4 hours ago' },
    { id: '2', name: 'Steve Clark', company: 'Reliable Electric', trade: 'Electrician', badgeId: 'C-100002', personType: 'contractor', requirementType: 'Safety Training', status: 'Expired', expiryDate: '2024-08-15', daysUntilExpiry: -168, lastAccess: '2 days ago' },
    { id: '3', name: 'Maria Garcia', company: 'Reliable Electric', trade: 'Electrician', badgeId: 'C-100003', personType: 'contractor', requirementType: 'Certification', status: 'Expired', expiryDate: '2024-12-01', daysUntilExpiry: -60, lastAccess: '1 day ago' },
    { id: '4', name: 'John Brown', company: 'Steel Works LLC', trade: 'Ironworker', badgeId: 'C-200001', personType: 'contractor', requirementType: 'Safety Training', status: 'Compliant', expiryDate: '2025-04-01', daysUntilExpiry: 62, lastAccess: '1 hour ago' },
    { id: '5', name: 'Amy White', company: 'Steel Works LLC', trade: 'Ironworker', badgeId: 'C-200002', personType: 'contractor', requirementType: 'Safety Training', status: 'Compliant', expiryDate: '2025-04-01', daysUntilExpiry: 62, lastAccess: '2 hours ago' },
    { id: '6', name: 'Robert Lee', company: 'Concrete Masters', trade: 'Mason', badgeId: 'C-300001', personType: 'contractor', requirementType: 'Background Check', status: 'Expiring', expiryDate: '2025-02-10', daysUntilExpiry: 12, lastAccess: '3 hours ago' },
    { id: '7', name: 'Nancy Taylor', company: 'Safety First Inc', trade: 'Safety Officer', badgeId: 'C-400001', personType: 'employee', requirementType: 'Certification', status: 'Compliant', expiryDate: '2025-12-31', daysUntilExpiry: 336, lastAccess: '30 min ago' },
    { id: '8', name: 'Chris Evans', company: 'Plumb Perfect', trade: 'Plumber', badgeId: 'C-500001', personType: 'contractor', requirementType: 'Site Induction', status: 'Non-Compliant', expiryDate: '-', daysUntilExpiry: 0, lastAccess: '5 hours ago' },
    { id: '9', name: 'Kevin Wright', company: 'Reliable Electric', trade: 'Electrician', badgeId: 'C-100004', personType: 'contractor', requirementType: 'Safety Training', status: 'Expiring', expiryDate: '2025-02-25', daysUntilExpiry: 27, lastAccess: '1 hour ago' },
  ],
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  'Compliant': { bg: 'bg-green-100', text: 'text-green-700' },
  'Expiring': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Expired': { bg: 'bg-red-100', text: 'text-red-700' },
  'Non-Compliant': { bg: 'bg-orange-100', text: 'text-orange-700' },
};

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#f97316'];
const REQUIREMENT_COLORS: Record<string, string> = {
  'Safety Training': '#3b82f6',
  'Background Check': '#8b5cf6',
  'Site Induction': '#06b6d4',
  'Certification': '#ec4899',
};

export default function ComplianceView({ tenant }: ComplianceViewProps) {
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [exporting, setExporting] = useState(false);
  const [personType, setPersonType] = useState<'all' | 'contractor'>('all');
  
  const allContractors = contractorData[tenant] || contractorData.acme;
  const contractors = personType === 'all' 
    ? allContractors 
    : allContractors.filter(c => c.personType === personType);
  
  const stats = {
    compliant: contractors.filter(c => c.status === 'Compliant').length,
    expiring: contractors.filter(c => c.status === 'Expiring').length,
    expired: contractors.filter(c => c.status === 'Expired').length,
    nonCompliant: contractors.filter(c => c.status === 'Non-Compliant').length,
  };

  const pieData = [
    { name: 'Compliant', value: stats.compliant, color: '#22c55e' },
    { name: 'Expiring', value: stats.expiring, color: '#eab308' },
    { name: 'Expired', value: stats.expired, color: '#ef4444' },
    { name: 'Non-Compliant', value: stats.nonCompliant, color: '#f97316' },
  ].filter(d => d.value > 0);

  const requirementPieData = Object.entries(
    contractors.reduce((acc, c) => {
      acc[c.requirementType] = (acc[c.requirementType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, color: REQUIREMENT_COLORS[name] || '#6b7280' }));

  const expiringContractors = contractors
    .filter(c => c.daysUntilExpiry > 0 && c.daysUntilExpiry <= 60)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const getWeekLabel = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const expiringTimelineData = Array.from({ length: 8 }, (_, weekIdx) => {
    const weekStart = weekIdx * 7;
    const weekEnd = weekStart + 7;
    const count = expiringContractors.filter(c => 
      c.daysUntilExpiry > weekStart && c.daysUntilExpiry <= weekEnd
    ).length;
    return {
      date: getWeekLabel(weekStart + 3),
      count,
    };
  }).filter(d => d.count > 0 || true).slice(0, 6);

  const nonCompliantList = contractors.filter(c => 
    c.status === 'Expired' || c.status === 'Expiring' || c.status === 'Non-Compliant'
  );

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const headers = ['Name', 'Company', 'Trade', 'Badge ID', 'Requirement', 'Status', 'Expiry Date', 'Days Until Expiry', 'Last Access'];
      const rows = contractors.map(c => [
        c.name,
        c.company,
        c.trade,
        c.badgeId,
        c.requirementType,
        c.status,
        c.expiryDate,
        c.daysUntilExpiry.toString(),
        c.lastAccess,
      ]);
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `compliance_audit_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      setExporting(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Person Type:</span>
          <select
            value={personType}
            onChange={(e) => setPersonType(e.target.value as 'all' | 'contractor')}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Compliant</div>
          <div className="text-3xl font-bold text-green-600">{stats.compliant}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Expiring</div>
          <div className="text-3xl font-bold text-yellow-600">{stats.expiring}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Expired</div>
          <div className="text-3xl font-bold text-red-600">{stats.expired}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Non-Compliant</div>
          <div className="text-3xl font-bold text-orange-600">{stats.nonCompliant}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200 h-72">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Compliance by Type</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={requirementPieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {requirementPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200 h-72">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Expiring Timeline (Next 60 Days)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={expiringTimelineData}>
              <XAxis dataKey="date" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#eab308" name="Expiring" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-600">Non-Compliant / Expiring Details</h3>
          <button 
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Name</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Company</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Requirement</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {nonCompliantList.map((contractor) => (
                <tr
                  key={contractor.id}
                  onClick={() => setSelectedContractor(contractor)}
                  className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2">
                    <div className="text-gray-900 font-medium">{contractor.name}</div>
                    <div className="text-xs text-gray-500">{contractor.badgeId}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{contractor.company}</td>
                  <td className="px-4 py-2">
                    <span className="text-gray-700">{contractor.requirementType}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[contractor.status].bg} ${statusStyles[contractor.status].text}`}>
                      {contractor.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={contractor.daysUntilExpiry < 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                      {contractor.daysUntilExpiry < 0 
                        ? `${Math.abs(contractor.daysUntilExpiry)}d overdue`
                        : contractor.daysUntilExpiry === 0 
                          ? 'N/A'
                          : `${contractor.daysUntilExpiry}d remaining`
                      }
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedContractor && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedContractor(null)} />
          <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-xl z-50 border-l border-gray-200 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Contractor Details</h2>
              <button onClick={() => setSelectedContractor(null)} className="text-gray-500 hover:text-gray-700">X</button>
            </div>
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedContractor.name}</h3>
                <p className="text-sm text-gray-500">{selectedContractor.company} - {selectedContractor.trade}</p>
                <p className="text-xs text-gray-400">Badge: {selectedContractor.badgeId}</p>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-600">Compliance Issue</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Requirement</span>
                    <span className="text-gray-900">{selectedContractor.requirementType}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Status</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[selectedContractor.status].bg} ${statusStyles[selectedContractor.status].text}`}>
                      {selectedContractor.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expiry Date</span>
                    <span className="text-gray-900">{selectedContractor.expiryDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Days</span>
                    <span className={selectedContractor.daysUntilExpiry < 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {selectedContractor.daysUntilExpiry < 0 
                        ? `${Math.abs(selectedContractor.daysUntilExpiry)} days overdue`
                        : selectedContractor.daysUntilExpiry === 0
                          ? 'Not applicable'
                          : `${selectedContractor.daysUntilExpiry} days remaining`
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-600">Last Access</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-gray-900">{selectedContractor.lastAccess}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <button className="w-full text-left px-3 py-2 bg-gray-100 rounded text-sm text-gray-900 hover:bg-blue-100 transition-colors">
                  View Full Access History
                </button>
                <button className="w-full text-left px-3 py-2 bg-gray-100 rounded text-sm text-gray-900 hover:bg-blue-100 transition-colors">
                  Export Evidence Packet
                </button>
                <button className="w-full text-left px-3 py-2 bg-gray-100 rounded text-sm text-gray-900 hover:bg-blue-100 transition-colors">
                  Contact Company Admin
                </button>
                <button className="w-full text-left px-3 py-2 bg-red-100 rounded text-sm text-red-700 hover:bg-red-200 transition-colors">
                  Suspend Badge
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
