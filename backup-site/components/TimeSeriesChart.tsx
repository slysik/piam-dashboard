'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TimeSeriesChartProps {
  tenant: string;
}

// Generate sample time series data for 24 hours
function generateTimeSeriesData(tenant: string) {
  const data = [];
  const now = new Date();
  const baseGrants = tenant === 'acme' ? 45 : 35;
  const baseDenies = tenant === 'acme' ? 2 : 5;

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourStr = hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Add some variation based on hour (more activity during business hours)
    const hourOfDay = hour.getHours();
    const activityMultiplier = hourOfDay >= 8 && hourOfDay <= 18 ? 1.5 : 0.3;

    data.push({
      time: hourStr,
      grants: Math.floor((baseGrants + Math.random() * 30) * activityMultiplier),
      denies: Math.floor((baseDenies + Math.random() * (tenant === 'acme' ? 5 : 10)) * activityMultiplier),
    });
  }
  return data;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded border border-gray-200 shadow-lg">
        <p className="text-gray-900 text-sm font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function TimeSeriesChart({ tenant }: TimeSeriesChartProps) {
  const data = generateTimeSeriesData(tenant);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="time"
          fontSize={11}
          tick={{ fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          fontSize={11}
          tick={{ fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{
            paddingTop: '10px',
            fontSize: '12px',
          }}
        />
        <Line
          type="monotone"
          dataKey="grants"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          name="Grants"
        />
        <Line
          type="monotone"
          dataKey="denies"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          name="Denies"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
