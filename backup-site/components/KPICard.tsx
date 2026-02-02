/**
 * KPICard - Key Performance Indicator Display Component
 *
 * This component renders a single KPI metric card with label, value, and
 * optional trend indicator. It provides a consistent visual pattern for
 * displaying important metrics across the dashboard, with color-coded
 * trend arrows to indicate positive or negative changes.
 *
 * @component
 * @example
 * // Basic KPI without trend
 * <KPICard label="Total Events" value="12,847" />
 *
 * // KPI with downward trend (green - positive for security metrics)
 * <KPICard
 *   label="Deny Rate"
 *   value="2.4%"
 *   trend={{ value: "-0.3% vs last week", direction: "down" }}
 * />
 *
 * // KPI with upward trend (red - concerning for security metrics)
 * <KPICard
 *   label="Risk Score"
 *   value="72"
 *   trend={{ value: "+5 from yesterday", direction: "up" }}
 * />
 *
 * Architecture Notes:
 * - Semantic coloring: 'up' is red (bad), 'down' is green (good) for security context
 * - This color scheme reflects physical security metrics where increases often indicate risk
 * - Neutral trend shows gray without directional arrow
 * - Consistent shadow and border styling matches dashboard design system
 * - Component is intentionally simple and reusable across all dashboard views
 *
 * Data Flow:
 * - Receives static props from parent component
 * - No internal state management - pure presentational component
 * - Trend object is optional for cases where comparison data unavailable
 *
 * @param {KPICardProps} props - Component props
 * @param {string} props.label - The metric label/name
 * @param {string} props.value - The formatted metric value
 * @param {object} [props.trend] - Optional trend indicator
 * @param {string} props.trend.value - Trend description text
 * @param {'up' | 'down' | 'neutral'} props.trend.direction - Trend direction for coloring
 */
'use client';

/**
 * Props for the KPICard component
 */
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
