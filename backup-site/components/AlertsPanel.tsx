/**
 * AlertsPanel - Security Insights and Anomaly Alert Display
 *
 * This component renders a list of security alerts and insights organized
 * by severity level. It provides real-time security awareness through
 * color-coded alert cards with dynamic "time ago" timestamps that update
 * automatically.
 *
 * @component
 * @example
 * <AlertsPanel alerts={[
 *   { id: '1', severity: 'critical', title: 'Impossible travel detected',
 *     description: 'Badge used in NY and LA within 30 minutes',
 *     timestamp: new Date() }
 * ]} />
 *
 * Architecture Notes:
 * - Four severity levels: critical, high, medium, low - each with distinct styling
 * - Severity icons: !! (critical), ! (high), * (medium), i (low)
 * - TimeAgo component auto-updates every minute for live timestamps
 * - Color scheme follows security convention (red=critical, orange=high, etc.)
 * - Uses custom Anthropic design tokens for muted text colors
 * - formatTimeAgo helper handles seconds, minutes, hours, and days
 *
 * Data Flow:
 * - alerts prop: Array of Alert objects from parent component
 * - Each alert has: id, severity, title, description, timestamp (Date object)
 * - TimeAgo component maintains its own state for real-time updates
 * - Updates via setInterval every 60 seconds to refresh relative times
 *
 * @param {AlertsPanelProps} props - Component props
 * @param {Alert[]} props.alerts - Array of security alerts to display
 */
'use client';

import { useState, useEffect } from 'react';

/**
 * Security alert data structure
 */
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

function TimeAgo({ date }: { date: Date }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const update = () => {
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      else if (seconds < 86400) setTimeAgo(`${Math.floor(seconds / 3600)}h ago`);
      else setTimeAgo(`${Math.floor(seconds / 86400)}d ago`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [date]);

  return <>{timeAgo}</>;
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
                  <TimeAgo date={alert.timestamp} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
