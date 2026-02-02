/**
 * ComplianceView - Workforce Compliance and Audit Dashboard
 *
 * This component provides a comprehensive compliance management interface
 * for tracking personnel certifications, safety training, background checks,
 * and site inductions. It includes an Audit Mode for generating compliance
 * evidence and identifying lifecycle exceptions.
 *
 * @component
 * @example
 * <ComplianceView tenant="acme" />
 * <ComplianceView tenant="buildright" useLiveData={true} />
 *
 * Architecture Notes:
 * - Multi-view dashboard: KPI cards, pie chart by type, expiring timeline bar chart
 * - Audit Mode toggle reveals privileged access evidence and lifecycle exceptions
 * - CSV export functionality for compliance, privileged access, and exceptions reports
 * - Filter by person type (all vs contractor) and date range (7d, 30d, 90d)
 * - Status tracking: Compliant, Expiring, Expired, Non-Compliant
 * - Requirement types: Safety Training, Background Check, Site Induction, Certification
 * - Side drawer shows detailed compliance info with avatar and status badge
 * - Timeline chart shows upcoming expirations by week for proactive management
 *
 * Data Flow:
 * - tenant prop selects data from contractorData record
 * - Filter state (personType, dateRange) narrows displayed contractor list
 * - auditMode boolean reveals privileged access and lifecycle exception tables
 * - Stats computed dynamically from filtered contractor array
 * - CSV export generates file download with current date stamp
 * - requirementPieData aggregated from contractor requirement types
 * - expiringTimelineData computed for 8-week lookahead
 *
 * @param {ComplianceViewProps} props - Component props
 * @param {string} props.tenant - The tenant identifier for data filtering
 * @param {boolean} [props.useLiveData=false] - Whether to use live data (future use)
 */
'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

/**
 * Props for the ComplianceView component
 */
interface ComplianceViewProps {
  tenant: string;
  useLiveData?: boolean;
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

interface PrivilegedAccess {
  id: string;
  person: string;
  badge: string;
  zone: string;
  door: string;
  timestamp: string;
  duration: string;
}

const privilegedAccessData: PrivilegedAccess[] = [
  { id: '1', person: 'Diana Evans', badge: 'B111222', zone: 'Data Center', door: 'Server Room D1', timestamp: '2024-10-15 09:45:23', duration: '2h 15m' },
  { id: '2', person: 'John Smith', badge: 'B123456', zone: 'Data Center', door: 'Network Cage D2', timestamp: '2024-10-15 08:30:00', duration: '45m' },
  { id: '3', person: 'Alice Brown', badge: 'B901234', zone: 'Executive Suite', door: 'Executive Floor D1', timestamp: '2024-10-14 16:20:00', duration: '3h 10m' },
  { id: '4', person: 'Charlie Davis', badge: 'B567890', zone: 'Data Center', door: 'Server Room D1', timestamp: '2024-10-14 11:00:00', duration: '1h 30m' },
  { id: '5', person: 'Edward Foster', badge: 'B333444', zone: 'R&D Lab', door: 'Secure Lab D1', timestamp: '2024-10-14 09:15:00', duration: '4h 00m' },
];

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

const REQUIREMENT_COLORS: Record<string, string> = {
  'Safety Training': '#3b82f6',
  'Background Check': '#8b5cf6',
  'Site Induction': '#06b6d4',
  'Certification': '#ec4899',
};

export default function ComplianceView({ tenant, useLiveData = false }: ComplianceViewProps) {
  // Selected contractor for detail drawer
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  // Export in progress flag to disable buttons
  const [exporting, setExporting] = useState(false);
  // Filter by person type (all or contractors only)
  const [personType, setPersonType] = useState<'all' | 'contractor'>('all');
  // Audit mode reveals privileged access evidence and lifecycle exceptions
  const [auditMode, setAuditMode] = useState(false);
  // Date range filter (affects which data would be shown in real implementation)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const allContractors = contractorData[tenant] || contractorData.acme;
  // Apply person type filter
  const contractors = personType === 'all'
    ? allContractors
    : allContractors.filter(c => c.personType === personType);

  // Compute compliance status counts for KPI cards
  const stats = {
    compliant: contractors.filter(c => c.status === 'Compliant').length,
    expiring: contractors.filter(c => c.status === 'Expiring').length,
    expired: contractors.filter(c => c.status === 'Expired').length,
    nonCompliant: contractors.filter(c => c.status === 'Non-Compliant').length,
  };

  // Aggregate contractors by requirement type for pie chart
  const requirementPieData = Object.entries(
    contractors.reduce((acc, c) => {
      acc[c.requirementType] = (acc[c.requirementType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, color: REQUIREMENT_COLORS[name] || '#6b7280' }));

  // Filter to contractors expiring within 60 days, sorted by urgency
  const expiringContractors = contractors
    .filter(c => c.daysUntilExpiry > 0 && c.daysUntilExpiry <= 60)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  // Generate week label for timeline chart x-axis
  const getWeekLabel = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Build 6-week timeline of upcoming expirations for bar chart
  const expiringTimelineData = Array.from({ length: 8 }, (_, weekIdx) => {
    const weekStart = weekIdx * 7;
    const weekEnd = weekStart + 7;
    const count = expiringContractors.filter(c =>
      c.daysUntilExpiry > weekStart && c.daysUntilExpiry <= weekEnd
    ).length;
    return {
      date: getWeekLabel(weekStart + 3), // Use mid-week date for label
      count,
    };
  }).slice(0, 6); // Only show 6 weeks

  // Filter for the non-compliant/expiring personnel table
  const nonCompliantList = contractors.filter(c =>
    c.status === 'Expired' || c.status === 'Expiring' || c.status === 'Non-Compliant'
  );

  const handleExport = (type: 'compliance' | 'privileged' | 'exceptions') => {
    setExporting(true);
    setTimeout(() => {
      let csvContent = '';
      let filename = '';
      
      if (type === 'compliance') {
        const headers = ['Name', 'Company', 'Trade', 'Badge ID', 'Requirement', 'Status', 'Expiry Date', 'Days Until Expiry', 'Last Access'];
        const rows = contractors.map(c => [c.name, c.company, c.trade, c.badgeId, c.requirementType, c.status, c.expiryDate, c.daysUntilExpiry.toString(), c.lastAccess]);
        csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = 'compliance_audit';
      } else if (type === 'privileged') {
        const headers = ['Person', 'Badge', 'Zone', 'Door', 'Timestamp', 'Duration'];
        const rows = privilegedAccessData.map(p => [p.person, p.badge, p.zone, p.door, p.timestamp, p.duration]);
        csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = 'privileged_access';
      } else {
        const headers = ['Name', 'Badge ID', 'HR Status', 'Badge Status', 'Issue'];
        const rows = [
          ['Jane Doe', 'B789012', 'Terminated', 'Active', 'Badge not disabled after termination'],
          ['Tom Harris', 'C789012', 'Contractor', 'Active', 'Contract expired, badge active'],
        ];
        csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = 'lifecycle_exceptions';
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      setExporting(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Compliance & Audit</h2>
            <button
              onClick={() => setAuditMode(!auditMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                auditMode 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {auditMode ? '🔍 Audit Mode ON' : 'Enable Audit Mode'}
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Date Range:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Person Type:</span>
              <select
                value={personType}
                onChange={(e) => setPersonType(e.target.value as 'all' | 'contractor')}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="all">All</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-500 rounded-xl p-5 text-white shadow-lg">
          <div className="text-green-100 text-sm font-medium">Compliant</div>
          <div className="text-4xl font-bold mt-1">{stats.compliant}</div>
        </div>
        <div className="bg-amber-500 rounded-xl p-5 text-white shadow-lg">
          <div className="text-amber-100 text-sm font-medium">Expiring Soon</div>
          <div className="text-4xl font-bold mt-1">{stats.expiring}</div>
        </div>
        <div className="bg-red-500 rounded-xl p-5 text-white shadow-lg">
          <div className="text-red-100 text-sm font-medium">Expired</div>
          <div className="text-4xl font-bold mt-1">{stats.expired}</div>
        </div>
        <div className="bg-orange-500 rounded-xl p-5 text-white shadow-lg">
          <div className="text-orange-100 text-sm font-medium">Non-Compliant</div>
          <div className="text-4xl font-bold mt-1">{stats.nonCompliant}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance by Type</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={requirementPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
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
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expiring Timeline</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expiringTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis fontSize={12} tick={{ fill: '#6b7280' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Expiring" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {auditMode && (
        <div className="space-y-6">
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-900">🔍 Privileged Zone Access Evidence</h3>
              <button
                onClick={() => handleExport('privileged')}
                disabled={exporting}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-purple-700 font-medium">Person</th>
                    <th className="px-4 py-2 text-left text-purple-700 font-medium">Badge</th>
                    <th className="px-4 py-2 text-left text-purple-700 font-medium">Zone</th>
                    <th className="px-4 py-2 text-left text-purple-700 font-medium">Door</th>
                    <th className="px-4 py-2 text-left text-purple-700 font-medium">Timestamp</th>
                    <th className="px-4 py-2 text-left text-purple-700 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {privilegedAccessData.map((access) => (
                    <tr key={access.id} className="border-t border-purple-100 hover:bg-purple-50">
                      <td className="px-4 py-2 font-medium text-gray-900">{access.person}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-600">{access.badge}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-medium">
                          {access.zone}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-900">{access.door}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{access.timestamp}</td>
                      <td className="px-4 py-2 text-gray-900">{access.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-900">⚠️ Lifecycle Exceptions</h3>
              <button
                onClick={() => handleExport('exceptions')}
                disabled={exporting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-red-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-red-700 font-medium">Name</th>
                    <th className="px-4 py-2 text-left text-red-700 font-medium">Badge ID</th>
                    <th className="px-4 py-2 text-left text-red-700 font-medium">HR Status</th>
                    <th className="px-4 py-2 text-left text-red-700 font-medium">Badge Status</th>
                    <th className="px-4 py-2 text-left text-red-700 font-medium">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-red-100 hover:bg-red-50">
                    <td className="px-4 py-2 font-medium text-gray-900">Jane Doe</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">B789012</td>
                    <td className="px-4 py-2"><span className="inline-flex px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium">Terminated</span></td>
                    <td className="px-4 py-2"><span className="inline-flex px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">Active</span></td>
                    <td className="px-4 py-2 text-red-700">Badge not disabled after termination</td>
                  </tr>
                  <tr className="border-t border-red-100 hover:bg-red-50">
                    <td className="px-4 py-2 font-medium text-gray-900">Tom Harris</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">C789012</td>
                    <td className="px-4 py-2"><span className="inline-flex px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">Contractor</span></td>
                    <td className="px-4 py-2"><span className="inline-flex px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">Active</span></td>
                    <td className="px-4 py-2 text-red-700">Contract expired, badge still active</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Non-Compliant & Expiring Personnel</h3>
          <button
            onClick={() => handleExport('compliance')}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export Full Report'}
          </button>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Name</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Company</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Requirement</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Expiry</th>
                <th className="px-4 py-2 text-left text-gray-600 font-medium">Last Access</th>
              </tr>
            </thead>
            <tbody>
              {nonCompliantList.map((person) => (
                <tr 
                  key={person.id}
                  onClick={() => setSelectedContractor(person)}
                  className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    person.status === 'Expired' ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{person.name}</div>
                    <div className="text-xs text-gray-500">{person.trade}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-900">{person.company}</td>
                  <td className="px-4 py-2 text-gray-900">{person.requirementType}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusStyles[person.status].bg} ${statusStyles[person.status].text}`}>
                      {person.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{person.expiryDate}</td>
                  <td className="px-4 py-2 text-gray-500">{person.lastAccess}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedContractor && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedContractor(null)} />
          <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-xl z-50 border-l border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h2 className="font-semibold text-gray-900">Compliance Details</h2>
              <button onClick={() => setSelectedContractor(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto flex items-center justify-center text-2xl">
                  {selectedContractor.name.charAt(0)}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-2">{selectedContractor.name}</h3>
                <p className="text-sm text-gray-500">{selectedContractor.company} • {selectedContractor.trade}</p>
              </div>

              <div className={`p-4 rounded-lg ${statusStyles[selectedContractor.status].bg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Compliance Status</span>
                  <span className={`font-bold ${statusStyles[selectedContractor.status].text}`}>
                    {selectedContractor.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Badge ID</span>
                    <span className="text-gray-900 font-mono">{selectedContractor.badgeId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Requirement</span>
                    <span className="text-gray-900">{selectedContractor.requirementType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Expiry Date</span>
                    <span className="text-gray-900">{selectedContractor.expiryDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Access</span>
                    <span className="text-gray-900">{selectedContractor.lastAccess}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
