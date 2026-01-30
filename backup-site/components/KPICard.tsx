'use client';

interface KPICardProps {
  label: string;
  value: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
}

export default function KPICard({ label, value, trend }: KPICardProps) {
  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-red-600';
      case 'down':
        return 'text-green-600';
      case 'neutral':
        return 'text-gray-500';
    }
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'neutral':
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
      {trend && (
        <div className={`text-sm mt-1 ${getTrendColor(trend.direction)}`}>
          {getTrendIcon(trend.direction)} {trend.value}
        </div>
      )}
    </div>
  );
}
