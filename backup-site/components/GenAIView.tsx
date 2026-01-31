'use client';

import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ReportWidget {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  type: 'kpi' | 'chart' | 'table' | 'alert';
}

const availableReports: ReportWidget[] = [
  { id: 'kpi-risk-score', name: 'Risk Score', description: 'Overall security risk indicator', category: 'KPIs', icon: '🎯', type: 'kpi' },
  { id: 'kpi-compliance', name: 'Compliance Rate', description: 'Policy compliance percentage', category: 'KPIs', icon: '✅', type: 'kpi' },
  { id: 'kpi-events', name: 'Events Today', description: 'Total access events count', category: 'KPIs', icon: '📊', type: 'kpi' },
  { id: 'kpi-deny-rate', name: 'Deny Rate', description: 'Access denial percentage', category: 'KPIs', icon: '🚫', type: 'kpi' },
  { id: 'kpi-active-doors', name: 'Active Doors', description: 'Doors with activity', category: 'KPIs', icon: '🚪', type: 'kpi' },
  { id: 'kpi-connectors', name: 'Connector Health', description: 'PACS system status', category: 'KPIs', icon: '🔌', type: 'kpi' },
  { id: 'chart-grants-denies', name: 'Grants vs Denies', description: 'Access trend over time', category: 'Charts', icon: '📈', type: 'chart' },
  { id: 'chart-risk-trend', name: 'Risk Trend', description: '7-day risk score history', category: 'Charts', icon: '📉', type: 'chart' },
  { id: 'chart-site-risk', name: 'Risk by Site', description: 'Risk distribution by location', category: 'Charts', icon: '🏢', type: 'chart' },
  { id: 'chart-compliance-pie', name: 'Compliance Breakdown', description: 'Compliance by category', category: 'Charts', icon: '🥧', type: 'chart' },
  { id: 'chart-request-funnel', name: 'Request Funnel', description: 'Access request stages', category: 'Charts', icon: '🔄', type: 'chart' },
  { id: 'table-recent-events', name: 'Recent Events', description: 'Latest access activity', category: 'Tables', icon: '📋', type: 'table' },
  { id: 'table-top-denies', name: 'Top Deny Locations', description: 'Doors with most denials', category: 'Tables', icon: '⚠️', type: 'table' },
  { id: 'table-expiring-access', name: 'Expiring Access', description: 'Soon-to-expire credentials', category: 'Tables', icon: '⏰', type: 'table' },
  { id: 'table-exceptions', name: 'Lifecycle Exceptions', description: 'HR/PIAM mismatches', category: 'Tables', icon: '🔍', type: 'table' },
  { id: 'alert-anomalies', name: 'Anomaly Alerts', description: 'Unusual activity detection', category: 'Alerts', icon: '🚨', type: 'alert' },
  { id: 'alert-connector', name: 'Connector Alerts', description: 'System health warnings', category: 'Alerts', icon: '🔔', type: 'alert' },
];

const categories = ['KPIs', 'Charts', 'Tables', 'Alerts'];

const kpiData: Record<string, { value: string; trend: string; color: string }> = {
  'kpi-risk-score': { value: '72', trend: '+3 from yesterday', color: 'text-orange-600' },
  'kpi-compliance': { value: '94.2%', trend: '+1.2% this week', color: 'text-green-600' },
  'kpi-events': { value: '12,847', trend: '+12% vs average', color: 'text-blue-600' },
  'kpi-deny-rate': { value: '2.5%', trend: '+0.8pp today', color: 'text-red-600' },
  'kpi-active-doors': { value: '127', trend: 'All reporting', color: 'text-gray-600' },
  'kpi-connectors': { value: '4/4 OK', trend: 'All healthy', color: 'text-green-600' },
};

const chartConfigs: Record<string, { type: string; data: any[] }> = {
  'chart-grants-denies': {
    type: 'bar',
    data: [
      { time: '00:00', grants: 120, denies: 3 },
      { time: '04:00', grants: 45, denies: 1 },
      { time: '08:00', grants: 890, denies: 24 },
      { time: '12:00', grants: 756, denies: 18 },
      { time: '16:00', grants: 634, denies: 15 },
      { time: '20:00', grants: 234, denies: 6 },
    ],
  },
  'chart-risk-trend': {
    type: 'line',
    data: [
      { day: 'Mon', score: 68 },
      { day: 'Tue', score: 71 },
      { day: 'Wed', score: 65 },
      { day: 'Thu', score: 74 },
      { day: 'Fri', score: 69 },
      { day: 'Sat', score: 62 },
      { day: 'Sun', score: 72 },
    ],
  },
  'chart-site-risk': {
    type: 'bar',
    data: [
      { site: 'Main Tower', risk: 72 },
      { site: 'Data Center', risk: 45 },
      { site: 'Parking', risk: 28 },
      { site: 'Warehouse', risk: 35 },
    ],
  },
  'chart-compliance-pie': {
    type: 'pie',
    data: [
      { name: 'Compliant', value: 94, color: '#22c55e' },
      { name: 'Expiring', value: 4, color: '#f59e0b' },
      { name: 'Non-Compliant', value: 2, color: '#ef4444' },
    ],
  },
  'chart-request-funnel': {
    type: 'bar',
    data: [
      { stage: 'Submitted', count: 156 },
      { stage: 'Approved', count: 142 },
      { stage: 'Provisioned', count: 138 },
    ],
  },
};

const tableData: Record<string, { columns: string[]; rows: string[][] }> = {
  'table-recent-events': {
    columns: ['Time', 'Person', 'Door', 'Result'],
    rows: [
      ['10:55:23', 'John Smith', 'Main Tower F1 D1', 'GRANT'],
      ['10:55:18', 'Jane Doe', 'Main Tower F2 D3', 'DENY'],
      ['10:55:12', 'Bob Wilson', 'Parking Garage D1', 'GRANT'],
    ],
  },
  'table-top-denies': {
    columns: ['Door', 'Denies (24h)', 'Rate', 'Trend'],
    rows: [
      ['Equipment Yard D1', '38', '12.4%', '+4.1x'],
      ['Main Tower F2 D3', '24', '8.2%', '+3.2x'],
      ['Server Room D1', '12', '4.5%', '+1.8x'],
    ],
  },
  'table-expiring-access': {
    columns: ['Person', 'Access Level', 'Expires', 'Status'],
    rows: [
      ['Mike Johnson', 'Contractor', '3 days', 'Warning'],
      ['Lisa Chen', 'Visitor', '1 day', 'Critical'],
      ['Tom Harris', 'Temp Staff', '7 days', 'Normal'],
    ],
  },
  'table-exceptions': {
    columns: ['Person', 'HR Status', 'PIAM Status', 'Issue'],
    rows: [
      ['Former Employee A', 'Terminated', 'Active Badge', 'Review Required'],
      ['Contractor B', 'Expired Contract', 'Active Access', 'Disable Access'],
      ['Visitor C', 'Not in HR', 'Active Badge', 'Investigate'],
    ],
  },
};

const alertData: Record<string, { severity: string; title: string; description: string }[]> = {
  'alert-anomalies': [
    { severity: 'high', title: 'Main Tower F2 D3 denies 3.2x baseline', description: '24 denies in last 60m vs typical 7.5' },
    { severity: 'medium', title: 'After-hours access detected', description: 'John Smith accessed Server Room at 23:45' },
  ],
  'alert-connector': [
    { severity: 'low', title: 'All connectors healthy', description: 'Lenel and C-CURE reporting normally' },
    { severity: 'info', title: 'Genetec sync complete', description: 'Last sync: 2 minutes ago' },
  ],
};

export default function GenAIView() {
  const [dashboardWidgets, setDashboardWidgets] = useState<string[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const handleDragStart = (widgetId: string) => {
    setDraggedWidget(widgetId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnDashboard = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedWidget && !dashboardWidgets.includes(draggedWidget)) {
      setDashboardWidgets([...dashboardWidgets, draggedWidget]);
    }
    setDraggedWidget(null);
  };

  const handleRemoveWidget = (widgetId: string) => {
    setDashboardWidgets(dashboardWidgets.filter(id => id !== widgetId));
  };

  const addWidget = (widgetId: string) => {
    if (!dashboardWidgets.includes(widgetId)) {
      setDashboardWidgets([...dashboardWidgets, widgetId]);
    }
  };

  const filteredReports = selectedCategory === 'All' 
    ? availableReports 
    : availableReports.filter(r => r.category === selectedCategory);

  const renderWidget = (widgetId: string) => {
    const widget = availableReports.find(r => r.id === widgetId);
    if (!widget) return null;

    if (widget.type === 'kpi') {
      const data = kpiData[widgetId];
      return (
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-gray-600">{widget.name}</div>
              <div className={`text-2xl font-bold ${data?.color || 'text-gray-900'}`}>{data?.value || '—'}</div>
              <div className="text-xs text-gray-500">{data?.trend || ''}</div>
            </div>
            <button onClick={() => handleRemoveWidget(widgetId)} className="text-gray-400 hover:text-red-500 text-lg">×</button>
          </div>
        </div>
      );
    }

    if (widget.type === 'chart') {
      const config = chartConfigs[widgetId];
      return (
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-sm font-medium text-gray-700">{widget.name}</h4>
            <button onClick={() => handleRemoveWidget(widgetId)} className="text-gray-400 hover:text-red-500 text-lg">×</button>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              {config?.type === 'line' ? (
                <LineChart data={config.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey={Object.keys(config.data[0])[0]} fontSize={10} tick={{ fill: '#6b7280' }} />
                  <YAxis fontSize={10} tick={{ fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey={Object.keys(config.data[0])[1]} stroke="#3b82f6" strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              ) : config?.type === 'pie' ? (
                <PieChart>
                  <Pie data={config.data} cx="50%" cy="50%" outerRadius={60} dataKey="value" isAnimationActive={false}>
                    {config.data.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                </PieChart>
              ) : (
                <BarChart data={config?.data || []} layout={widgetId === 'chart-request-funnel' ? 'vertical' : 'horizontal'}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  {widgetId === 'chart-request-funnel' ? (
                    <>
                      <XAxis type="number" fontSize={10} tick={{ fill: '#6b7280' }} />
                      <YAxis type="category" dataKey="stage" fontSize={10} tick={{ fill: '#6b7280' }} width={80} />
                    </>
                  ) : (
                    <>
                      <XAxis dataKey={Object.keys(config?.data[0] || {})[0]} fontSize={10} tick={{ fill: '#6b7280' }} />
                      <YAxis fontSize={10} tick={{ fill: '#6b7280' }} />
                    </>
                  )}
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  {widgetId === 'chart-grants-denies' ? (
                    <>
                      <Bar dataKey="grants" fill="#22c55e" isAnimationActive={false} />
                      <Bar dataKey="denies" fill="#ef4444" isAnimationActive={false} />
                    </>
                  ) : widgetId === 'chart-request-funnel' ? (
                    <Bar dataKey="count" fill="#3b82f6" isAnimationActive={false} />
                  ) : (
                    <Bar dataKey={Object.keys(config?.data[0] || {})[1]} fill="#3b82f6" isAnimationActive={false} />
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (widget.type === 'table') {
      const data = tableData[widgetId];
      return (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-700">{widget.name}</h4>
            <button onClick={() => handleRemoveWidget(widgetId)} className="text-gray-400 hover:text-red-500 text-lg">×</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {data?.columns.map((col, i) => (
                    <th key={i} className="px-4 py-2 text-left text-gray-600 font-medium">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((row, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    {row.map((cell, j) => (
                      <td key={j} className={`px-4 py-2 ${cell === 'DENY' ? 'text-red-600 font-medium' : cell === 'GRANT' ? 'text-green-600 font-medium' : 'text-gray-900'}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (widget.type === 'alert') {
      const alerts = alertData[widgetId];
      const severityColors: Record<string, string> = {
        high: 'bg-red-50 border-red-200 text-red-700',
        medium: 'bg-orange-50 border-orange-200 text-orange-700',
        low: 'bg-green-50 border-green-200 text-green-700',
        info: 'bg-blue-50 border-blue-200 text-blue-700',
      };
      return (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-700">{widget.name}</h4>
            <button onClick={() => handleRemoveWidget(widgetId)} className="text-gray-400 hover:text-red-500 text-lg">×</button>
          </div>
          <div className="p-3 space-y-2">
            {alerts?.map((alert, i) => (
              <div key={i} className={`p-3 rounded-lg border ${severityColors[alert.severity] || severityColors.info}`}>
                <div className="font-medium">{alert.title}</div>
                <div className="text-sm opacity-80">{alert.description}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      <div className="w-80 flex-shrink-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">✨</span>
            <div>
              <h2 className="font-bold">Report Library</h2>
              <p className="text-purple-200 text-xs">Drag reports to build your dashboard</p>
            </div>
          </div>
        </div>
        
        <div className="p-3 border-b border-gray-200">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${selectedCategory === 'All' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${selectedCategory === cat ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredReports.map(report => (
            <div
              key={report.id}
              draggable
              onDragStart={() => handleDragStart(report.id)}
              onClick={() => addWidget(report.id)}
              className={`p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                dashboardWidgets.includes(report.id)
                  ? 'bg-purple-50 border-purple-200 opacity-50'
                  : 'bg-gray-50 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{report.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{report.name}</div>
                  <div className="text-xs text-gray-500 truncate">{report.description}</div>
                </div>
                {dashboardWidgets.includes(report.id) && (
                  <span className="text-purple-600 text-xs">Added</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Custom Dashboard</h2>
            <p className="text-sm text-gray-500">{dashboardWidgets.length} widgets added</p>
          </div>
          {dashboardWidgets.length > 0 && (
            <button
              onClick={() => setDashboardWidgets([])}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div
          onDragOver={handleDragOver}
          onDrop={handleDropOnDashboard}
          className={`flex-1 rounded-lg border-2 border-dashed transition-colors overflow-auto ${
            draggedWidget
              ? 'border-purple-400 bg-purple-50'
              : dashboardWidgets.length === 0
                ? 'border-gray-300 bg-gray-50'
                : 'border-transparent bg-transparent'
          }`}
        >
          {dashboardWidgets.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-3">📊</div>
                <div className="font-medium">Drop reports here</div>
                <div className="text-sm">or click on reports to add them</div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {dashboardWidgets.map(widgetId => {
                  const widget = availableReports.find(r => r.id === widgetId);
                  const isLargeWidget = widget?.type === 'table' || widget?.type === 'chart';
                  return (
                    <div key={widgetId} className={isLargeWidget ? 'md:col-span-1' : ''}>
                      {renderWidget(widgetId)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
