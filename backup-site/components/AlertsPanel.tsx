'use client';

interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: Date;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

const severityStyles = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-700',
    icon: '!!',
  },
  high: {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-700',
    icon: '!',
  },
  medium: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-700',
    icon: '*',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    icon: 'i',
  },
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <div className="bg-anthropic-surface rounded-lg shadow-lg p-4 border border-anthropic-surface-light">
      <h3 className="text-sm font-medium text-anthropic-text-muted mb-3">Top Insights</h3>
      <div className="space-y-2">
        {alerts.map((alert) => {
          const styles = severityStyles[alert.severity];
          return (
            <div
              key={alert.id}
              className={`p-3 rounded border ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className={`${styles.text} font-bold text-lg leading-none`}>
                    {styles.icon}
                  </span>
                  <div>
                    <div className={`font-medium text-sm ${styles.text}`}>
                      {alert.title}
                    </div>
                    <div className="text-xs text-anthropic-text-muted mt-0.5">
                      {alert.description}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-anthropic-text-muted whitespace-nowrap">
                  {formatTimeAgo(alert.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
