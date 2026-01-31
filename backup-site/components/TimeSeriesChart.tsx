'use client';

import { useMemo } from 'react';
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
import { useTimeSeriesWithFallback } from '@/hooks/useDashboardData';

interface TimeSeriesChartProps {
  tenant: string;
  timeRange?: '15m' | '60m' | '24h';
  useLiveData?: boolean;
}

function generateTimeSeriesData(tenant: string, timeRange: '15m' | '60m' | '24h' = '24h') {
  const data = [];
  const now = new Date();
  const baseGrants = tenant === 'acme' ? 45 : 35;
  const baseDenies = tenant === 'acme' ? 2 : 5;

  if (timeRange === '15m') {
    for (let i = 14; i >= 0; i--) {
      const minute = new Date(now.getTime() - i * 60 * 1000);
      const minStr = minute.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      data.push({
        time: minStr,
        grants: Math.floor(baseGrants / 4 + Math.random() * 10),
        denies: Math.floor(baseDenies / 4 + Math.random() * (tenant === 'acme' ? 2 : 4)),
      });
    }
  } else if (timeRange === '60m') {
    for (let i = 11; i >= 0; i--) {
      const fiveMin = new Date(now.getTime() - i * 5 * 60 * 1000);
      const timeStr = fiveMin.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      data.push({
        time: timeStr,
        grants: Math.floor(baseGrants + Math.random() * 20),
        denies: Math.floor(baseDenies + Math.random() * (tenant === 'acme' ? 4 : 8)),
      });
    }
  } else {
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const hourOfDay = hour.getHours();
      const activityMultiplier = hourOfDay >= 8 && hourOfDay <= 18 ? 1.5 : 0.3;

      data.push({
        time: hourStr,
        grants: Math.floor((baseGrants + Math.random() * 30) * activityMultiplier),
        denies: Math.floor((baseDenies + Math.random() * (tenant === 'acme' ? 5 : 10)) * activityMultiplier),
      });
    }
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

export default function TimeSeriesChart({ tenant, timeRange = '24h', useLiveData = false }: TimeSeriesChartProps) {
  const demoData = useMemo(() => generateTimeSeriesData(tenant, timeRange), [tenant, timeRange]);
  const { data, loading, isLive } = useTimeSeriesWithFallback(tenant, useLiveData, timeRange, demoData);

  return (
    <div className="relative w-full h-full">
      {isLive && (
        <div className="absolute top-0 right-0 z-10">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
            Live
          </span>
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
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
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="denies"
            stroke="#ef4444"
            strokeWidth={2}
            isAnimationActive={false}
            dot={false}
            name="Denies"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
