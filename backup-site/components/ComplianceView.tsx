'use client';

import { useState } from 'react';

interface ComplianceViewProps {
  tenant: string;
}

interface Contractor {
  id: string;
  name: string;
  company: string;
  trade: string;
  badgeId: string;
  safetyTraining: 'Valid' | 'Expiring' | 'Expired';
  safetyExpiry: string;
  backgroundCheck: 'Passed' | 'Pending' | 'Failed';
  siteInduction: boolean;
  lastAccess: string;
  accessCount7d: number;
  violations: number;
}

const contractorData: Record<string, Contractor[]> = {
  acme: [
    { id: '1', name: 'Mike Chen', company: 'TechStaff Inc', trade: 'IT Support', badgeId: 'C-001234', safetyTraining: 'Valid', safetyExpiry: '2025-06-15', backgroundCheck: 'Passed', siteInduction: true, lastAccess: '2 hours ago', accessCount7d: 23, violations: 0 },
    { id: '2', name: 'Sarah Miller', company: 'TechStaff Inc', trade: 'IT Support', badgeId: 'C-001235', safetyTraining: 'Expired', safetyExpiry: '2024-09-01', backgroundCheck: 'Passed', siteInduction: true, lastAccess: '1 day ago', accessCount7d: 12, violations: 2 },
    { id: '3', name: 'James Wilson', company: 'CleanCorp', trade: 'Janitorial', badgeId: 'C-002001', safetyTraining: 'Valid', safetyExpiry: '2025-03-20', backgroundCheck: 'Passed', siteInduction: true, lastAccess: '5 hours ago', accessCount7d: 35, violations: 0 },
    { id: '4', name: 'Lisa Park', company: 'SecureGuard', trade: 'Security', badgeId: 'C-003001', safetyTraining: 'Expiring', safetyExpiry: '2024-10-15', backgroundCheck: 'Passed', siteInduction: true, lastAccess: '30 min ago', accessCount7d: 42, violations: 0 },
    { id: '5', name: 'David Kim', company: 'HVAC Pros', trade: 'HVAC', badgeId: 'C-004001', safetyTraining: 'Valid', safetyExpiry: '2025-01-10', backgroundCheck: 'Pending', siteInduction: false, lastAccess: 'Never', accessCount7d: 0, violations: 0 },
  ],
  buildright: [
    { id: '1', name: 'Tom Harris', company: 'Reliable Electric', trade: 'Electrician', badgeId: 'C-100001', safetyTraining: 'Expired', safetyExpiry: '2024-08-15', backgroundCheck: 'Passed', siteInduction: true, lastAccess: '4 hours ago', accessCount7d: 28, violations: 3 },
    { id: '2', name: 'Steve Clark', company: 'Reliable Electric', trade: 'Electrician', badgeId: 'C-100002', safetyTraining: 'Expired', safetyExpiry: '2024-08-15', backgroundCheck: 'Passed', siteInduction: true, lastAccess: '2 days ago', accessCount7d: 15, violations: 1 },
    { id: '3', name: 'Maria Garcia', company: 'Reliable Electric', trade: 'Electrician', badgeId: 'C-100003', safetyTraining: 'Expired', safetyExpiry: '2024-08-15', backgroundCheck: 'Passed', siteInduction: true, lastAccess: '1 day ago', accessCount7d: 18, violations: 2 },
    { id: '4', name: 'John Brown', company: 'Steel Works LLC', trade: 'Ironworker', badgeId: 'C-200001', safetyTraining: 'Valid', safetyExpiry: '2025-04-01', backgroundCheck: 'Passed', siteInduction: true, lastAccess: '1 hour ago', accessCount7d: 31, violations: 0 },
    { id: '5', name: 'Amy White', company: 'Steel Works LLC', trade: 'Ironworker', badgeId: 'C-200002', safetyTraining: 'Valid', safetyExpiry: '2025-04-01', backgroundCheck: 'Passed', siteInduction: true, lastAccess: '2 hours ago', accessCount7d: 29, violations: 0 },
    { id: '6', name: 'Robert Lee', company: 'Concrete Masters', trade: 'Mason', badgeId: 'C-300001', safetyTraining: 'Expiring', safetyExpiry: '2024-10-01', backgroundCheck: 'Pending', siteInduction: true, lastAccess: '3 hours ago', accessCount7d: 22, violations: 1 },
    { id: '7', name: 'Nancy Taylor', company: 'Safety First Inc', trade: 'Safety Officer', badgeId: 'C-400001', safetyTraining: 'Valid', safetyExpiry: '2025-12-31', backgroundCheck: 'Passed', siteInduction: true, lastAccess: '30 min ago', accessCount7d: 45, violations: 0 },
    { id: '8', name: 'Chris Evans', company: 'Plumb Perfect', trade: 'Plumber', badgeId: 'C-500001', safetyTraining: 'Valid', safetyExpiry: '2025-02-28', backgroundCheck: 'Passed', siteInduction: true, lastAccess: '5 hours ago', accessCount7d: 16, violations: 0 },
  ],
};

const safetyStyles: Record<string, { bg: string; text: string }> = {
  'Valid': { bg: 'bg-green-100', text: 'text-green-700' },
  'Expiring': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Expired': { bg: 'bg-red-100', text: 'text-red-700' },
};

const bgCheckStyles: Record<string, { bg: string; text: string }> = {
  'Passed': { bg: 'bg-green-100', text: 'text-green-700' },
  'Pending': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Failed': { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function ComplianceView({ tenant }: ComplianceViewProps) {
  const [filter, setFilter] = useState<'all' | 'non-compliant' | 'pending'>('all');
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [exporting, setExporting] = useState(false);
  
  const contractors = contractorData[tenant] || contractorData.acme;
  
  const filteredContractors = contractors.filter(c => {
    if (filter === 'non-compliant') return c.safetyTraining === 'Expired' || c.violations > 0;
    if (filter === 'pending') return c.backgroundCheck === 'Pending' || !c.siteInduction;
    return true;
  });

  const stats = {
    total: contractors.length,
    compliant: contractors.filter(c => c.safetyTraining === 'Valid' && c.backgroundCheck === 'Passed' && c.siteInduction).length,
    nonCompliant: contractors.filter(c => c.safetyTraining === 'Expired' || c.violations > 0).length,
    pending: contractors.filter(c => c.backgroundCheck === 'Pending' || !c.siteInduction).length,
    totalViolations: contractors.reduce((sum, c) => sum + c.violations, 0),
  };

  const companyStats = contractors.reduce((acc, c) => {
    if (!acc[c.company]) {
      acc[c.company] = { total: 0, compliant: 0, violations: 0 };
    }
    acc[c.company].total++;
    if (c.safetyTraining === 'Valid' && c.backgroundCheck === 'Passed' && c.siteInduction) {
      acc[c.company].compliant++;
    }
    acc[c.company].violations += c.violations;
    return acc;
  }, {} as Record<string, { total: number; compliant: number; violations: number }>);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const headers = ['Name', 'Company', 'Trade', 'Badge ID', 'Safety Training', 'Safety Expiry', 'Background Check', 'Site Induction', 'Last Access', 'Access Count (7d)', 'Violations'];
      const rows = contractors.map(c => [
        c.name,
        c.company,
        c.trade,
        c.badgeId,
        c.safetyTraining,
        c.safetyExpiry,
        c.backgroundCheck,
        c.siteInduction ? 'Yes' : 'No',
        c.lastAccess,
        c.accessCount7d.toString(),
        c.violations.toString()
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
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Total Contractors</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Fully Compliant</div>
          <div className="text-2xl font-bold text-green-600">{stats.compliant}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Non-Compliant</div>
          <div className="text-2xl font-bold text-red-600">{stats.nonCompliant}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Pending Review</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Total Violations (7d)</div>
          <div className="text-2xl font-bold text-orange-600">{stats.totalViolations}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Contractor Compliance</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs rounded ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('non-compliant')}
                className={`px-3 py-1 text-xs rounded ${filter === 'non-compliant' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Non-Compliant
              </button>
              <button 
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 text-xs rounded ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Pending
              </button>
              <button 
                onClick={handleExport}
                disabled={exporting}
                className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Export Audit'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Contractor</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Safety Training</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Background</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Induction</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Violations</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Last Access</th>
                </tr>
              </thead>
              <tbody>
                {filteredContractors.map((contractor) => (
                  <tr
                    key={contractor.id}
                    onClick={() => setSelectedContractor(contractor)}
                    className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2">
                      <div className="text-gray-900 font-medium">{contractor.name}</div>
                      <div className="text-xs text-gray-500">{contractor.company} - {contractor.trade}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${safetyStyles[contractor.safetyTraining].bg} ${safetyStyles[contractor.safetyTraining].text}`}>
                        {contractor.safetyTraining}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bgCheckStyles[contractor.backgroundCheck].bg} ${bgCheckStyles[contractor.backgroundCheck].text}`}>
                        {contractor.backgroundCheck}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {contractor.siteInduction ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-red-600">No</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {contractor.violations > 0 ? (
                        <span className="text-red-600 font-medium">{contractor.violations}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{contractor.lastAccess}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Company Summary</h3>
          <div className="space-y-3">
            {Object.entries(companyStats).map(([company, stats]) => (
              <div key={company} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-medium">{company}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    stats.compliant === stats.total ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {stats.compliant}/{stats.total} compliant
                  </span>
                </div>
                {stats.violations > 0 && (
                  <div className="text-xs text-red-600 mt-1">{stats.violations} violation(s) this week</div>
                )}
              </div>
            ))}
          </div>
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
                <p className="text-sm text-gray-500">{selectedContractor.company}</p>
                <p className="text-xs text-gray-400">Badge: {selectedContractor.badgeId}</p>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-600">Compliance Status</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Safety Training</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${safetyStyles[selectedContractor.safetyTraining].bg} ${safetyStyles[selectedContractor.safetyTraining].text}`}>
                      {selectedContractor.safetyTraining} - Expires {selectedContractor.safetyExpiry}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Background Check</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bgCheckStyles[selectedContractor.backgroundCheck].bg} ${bgCheckStyles[selectedContractor.backgroundCheck].text}`}>
                      {selectedContractor.backgroundCheck}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Site Induction</span>
                    <span className={selectedContractor.siteInduction ? 'text-green-600' : 'text-red-600'}>
                      {selectedContractor.siteInduction ? 'Completed' : 'Required'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-600">Access Activity (7 days)</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Access Events</span>
                    <span className="text-gray-900">{selectedContractor.accessCount7d}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Access</span>
                    <span className="text-gray-900">{selectedContractor.lastAccess}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Violations</span>
                    <span className={selectedContractor.violations > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {selectedContractor.violations}
                    </span>
                  </div>
                </div>
              </div>

              {selectedContractor.violations > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-600">Recent Violations</h4>
                  <div className="space-y-2">
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                      <div className="text-sm text-red-700 font-medium">Attempted access to restricted area</div>
                      <div className="text-xs text-red-600">Server Room D1 - 2 days ago</div>
                    </div>
                    {selectedContractor.violations > 1 && (
                      <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                        <div className="text-sm text-yellow-700 font-medium">Access outside scheduled hours</div>
                        <div className="text-xs text-yellow-600">Main Entrance - 5 days ago</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
