/**
 * ExecutiveOverview - High-Level Security Metrics Dashboard for Executives
 *
 * This component presents a strategic view of physical access security
 * posture for C-level executives and senior leadership. It aggregates
 * key metrics including overall risk score, compliance rate, open incidents,
 * and site status into a single, scannable dashboard.
 *
 * @component
 * @example
 * <ExecutiveOverview tenant="acme" timeRange="24h" />
 * <ExecutiveOverview tenant="buildright" useLiveData={true} timeRange="15m" />
 *
 * Architecture Notes:
 * - KPI cards use gradient backgrounds for visual hierarchy and quick scanning
 * - Time range selector supports 15m, 60m, and 24h views for trend analysis
 * - Risk trend chart shows correlation between risk score and incident count
 * - Site risk horizontal bar chart enables quick identification of problem areas
 * - Compliance donut chart with legend for identity compliance status
 * - Recent alerts panel highlights critical/high priority security events
 * - All charts disable animations for consistent rendering and performance
 *
 * Data Flow:
 * - timeRange prop determines which risk trend dataset to display
 * - getRiskTrendData() selects appropriate time-series based on timeRange
 * - complianceData static array feeds pie chart and stats calculation
 * - siteRiskData static array provides per-site risk distribution
 * - Alert data inline for recent high-priority security events
 *
 * @param {ExecutiveOverviewProps} props - Component props
 * @param {string} props.tenant - The tenant identifier
 * @param {boolean} [props.useLiveData=false] - Whether to use live data (future use)
 * @param {'15m' | '60m' | '24h'} [props.timeRange='24h'] - Time range for trend data
 */
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

/**
 * Props for the ExecutiveOverview component
 */
interface ExecutiveOverviewProps {
  tenant: string;
  useLiveData?: boolean;
  timeRange?: '15m' | '60m' | '24h';
}

const riskTrendData15m = [
  { date: '19:30', riskScore: 45, incidents: 0 },
  { date: '19:31', riskScore: 48, incidents: 0 },
  { date: '19:32', riskScore: 52, incidents: 1 },
  { date: '19:33', riskScore: 49, incidents: 0 },
  { date: '19:34', riskScore: 55, incidents: 0 },
  { date: '19:35', riskScore: 58, incidents: 1 },
  { date: '19:36', riskScore: 54, incidents: 0 },
  { date: '19:37', riskScore: 51, incidents: 0 },
  { date: '19:38', riskScore: 47, incidents: 0 },
  { date: '19:39', riskScore: 50, incidents: 0 },
  { date: '19:40', riskScore: 53, incidents: 0 },
  { date: '19:41', riskScore: 56, incidents: 1 },
  { date: '19:42', riskScore: 52, incidents: 0 },
  { date: '19:43', riskScore: 48, incidents: 0 },
  { date: '19:44', riskScore: 46, incidents: 0 },
];

const riskTrendData60m = [
  { date: '18:45', riskScore: 42, incidents: 1 },
  { date: '18:50', riskScore: 45, incidents: 0 },
  { date: '18:55', riskScore: 48, incidents: 1 },
  { date: '19:00', riskScore: 52, incidents: 2 },
  { date: '19:05', riskScore: 55, incidents: 1 },
  { date: '19:10', riskScore: 51, incidents: 0 },
  { date: '19:15', riskScore: 48, incidents: 1 },
  { date: '19:20', riskScore: 53, incidents: 0 },
  { date: '19:25', riskScore: 56, incidents: 1 },
  { date: '19:30', riskScore: 52, incidents: 0 },
  { date: '19:35', riskScore: 49, incidents: 0 },
  { date: '19:40', riskScore: 47, incidents: 1 },
];

const riskTrendData24h = [
  { date: 'Mon', riskScore: 42, incidents: 2 },
  { date: 'Tue', riskScore: 38, incidents: 1 },
  { date: 'Wed', riskScore: 55, incidents: 4 },
  { date: 'Thu', riskScore: 48, incidents: 3 },
  { date: 'Fri', riskScore: 62, incidents: 5 },
  { date: 'Sat', riskScore: 35, incidents: 1 },
  { date: 'Sun', riskScore: 28, incidents: 0 },
];

function getRiskTrendData(timeRange: '15m' | '60m' | '24h') {
  if (timeRange === '15m') return riskTrendData15m;
  if (timeRange === '60m') return riskTrendData60m;
  return riskTrendData24h;
}

const siteRiskData = [
  { site: 'HQ Tower', risk: 72, events: 3420 },
  { site: 'Data Center', risk: 45, events: 890 },
  { site: 'Warehouse A', risk: 38, events: 1250 },
  { site: 'R&D Lab', risk: 65, events: 780 },
];

const complianceData = [
  { name: 'Compliant', value: 847, color: '#22c55e' },
  { name: 'Expiring', value: 42, color: '#eab308' },
  { name: 'Non-Compliant', value: 18, color: '#ef4444' },
];

export default function ExecutiveOverview({ tenant, useLiveData = false, timeRange = '24h' }: ExecutiveOverviewProps) {
  const riskTrendData = getRiskTrendData(timeRange);
  const totalIdentities = complianceData.reduce((a, b) => a + b.value, 0);
  const complianceRate = Math.round((complianceData[0].value / totalIdentities) * 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
          <div className="text-blue-100 text-sm font-medium">Overall Risk Score</div>
          <div className="text-4xl font-bold mt-1">48</div>
          <div className="text-blue-200 text-xs mt-2">↓ 8% from last week</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
          <div className="text-green-100 text-sm font-medium">Compliance Rate</div>
          <div className="text-4xl font-bold mt-1">{complianceRate}%</div>
          <div className="text-green-200 text-xs mt-2">{complianceData[0].value} of {totalIdentities} identities</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white shadow-lg">
          <div className="text-amber-100 text-sm font-medium">Open Incidents</div>
          <div className="text-4xl font-bold mt-1">7</div>
          <div className="text-amber-200 text-xs mt-2">3 high priority</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
          <div className="text-purple-100 text-sm font-medium">Active Sites</div>
          <div className="text-4xl font-bold mt-1">4</div>
          <div className="text-purple-200 text-xs mt-2">All connectors healthy</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Risk Trend ({timeRange === '15m' ? '15 Minutes' : timeRange === '60m' ? '1 Hour' : '7 Days'})
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis fontSize={12} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="riskScore" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6' }} name="Risk Score" isAnimationActive={false} />
                <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} name="Incidents" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk by Site</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={siteRiskData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" fontSize={12} tick={{ fill: '#6b7280' }} />
                <YAxis type="category" dataKey="site" fontSize={12} tick={{ fill: '#6b7280' }} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="risk" fill="#6366f1" radius={[0, 4, 4, 0]} name="Risk Score" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Overview</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={complianceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {complianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-2">
            {complianceData.map((item) => (
              <div key={item.name} className="flex items-center text-xs">
                <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: item.color }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent High-Priority Alerts</h3>
          <div className="space-y-3">
            {[
              { severity: 'critical', title: 'Impossible travel detected', user: 'J. Martinez', time: '12 min ago' },
              { severity: 'high', title: 'After-hours access to Data Center', user: 'R. Chen', time: '45 min ago' },
              { severity: 'high', title: '5 denied attempts at Server Room', user: 'Unknown Badge', time: '1h ago' },
            ].map((alert, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${
                alert.severity === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${alert.severity === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                  <div>
                    <div className="font-medium text-gray-900">{alert.title}</div>
                    <div className="text-xs text-gray-500">{alert.user}</div>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{alert.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
