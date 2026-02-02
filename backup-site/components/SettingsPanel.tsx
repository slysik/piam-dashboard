/**
 * SettingsPanel - Data Source Configuration Dropdown
 *
 * This component provides a settings dropdown for configuring the dashboard's
 * data source. It allows toggling between demo data and live ClickHouse data,
 * testing the database connection, and controlling real-time event trickle
 * for demonstration purposes.
 *
 * @component
 * @example
 * <SettingsPanel
 *   useLiveData={isLiveMode}
 *   onToggleLiveData={(enabled) => setIsLiveMode(enabled)}
 *   tenant="acme"
 * />
 *
 * Architecture Notes:
 * - Gear icon button with pulse indicator when trickle is active
 * - Click-outside behavior closes dropdown panel
 * - Connection test hits /api/clickhouse with SELECT 1 query
 * - Trickle feature: Generates synthetic events every 3 seconds for demos
 * - Trickle calls /api/trickle endpoint with tenant identifier
 * - Visual feedback: Live badge when connected, error message on failure
 * - Toggle switch for demo vs live data mode
 * - Session trickle count displayed for event generation tracking
 *
 * Data Flow:
 * - useLiveData prop: Boolean controlling data source mode from parent
 * - onToggleLiveData callback: Notifies parent when mode changes
 * - tenant prop: Used for trickle endpoint tenant identification
 * - connectionStatus state: 'unknown', 'connected', or 'error'
 * - trickleActive state: Controls interval-based event generation
 * - trickleCount state: Accumulates events generated this session
 * - trickleIntervalRef: Cleanup reference for interval on unmount
 *
 * @param {SettingsPanelProps} props - Component props
 * @param {boolean} props.useLiveData - Whether live data mode is enabled
 * @param {(value: boolean) => void} props.onToggleLiveData - Mode toggle callback
 * @param {string} [props.tenant='acme'] - Tenant ID for trickle data generation
 */
'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Props for the SettingsPanel component
 */
interface SettingsPanelProps {
  useLiveData: boolean;
  onToggleLiveData: (value: boolean) => void;
  tenant?: string;
}

export default function SettingsPanel({
  useLiveData,
  onToggleLiveData,
  tenant = 'acme',
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [testing, setTesting] = useState(false);
  const [trickleActive, setTrickleActive] = useState(false);
  const [trickleCount, setTrickleCount] = useState(0);
  const trickleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/clickhouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'SELECT 1' }),
      });
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    }
    setTesting(false);
  };

  useEffect(() => {
    if (useLiveData && connectionStatus === 'unknown') {
      testConnection();
    }
  }, [useLiveData, connectionStatus]);

  const tenantId = tenant === 'acme' ? 'acme-corp' : 'buildright-construction';

  const triggerTrickle = async () => {
    try {
      const response = await fetch('/api/trickle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', tenant: tenantId }),
      });
      if (response.ok) {
        const data = await response.json();
        setTrickleCount(prev => prev + (data.eventsInserted || 0));
      }
    } catch (err) {
      console.error('Trickle failed:', err);
    }
  };

  const toggleTrickle = () => {
    if (trickleActive) {
      if (trickleIntervalRef.current) {
        clearInterval(trickleIntervalRef.current);
        trickleIntervalRef.current = null;
      }
      setTrickleActive(false);
    } else {
      triggerTrickle();
      trickleIntervalRef.current = setInterval(triggerTrickle, 3000);
      setTrickleActive(true);
    }
  };

  useEffect(() => {
    return () => {
      if (trickleIntervalRef.current) {
        clearInterval(trickleIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors relative ${
          trickleActive
            ? 'text-green-600 bg-green-50 hover:bg-green-100'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title={trickleActive ? 'Live Trickle Active - Click to manage' : 'Settings'}
      >
        <svg className={`w-5 h-5 ${trickleActive ? 'animate-spin-slow' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {trickleActive && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Data Settings</h3>
          </div>

          <div className="p-4 space-y-4">
            {/* Live Trickle - Featured at top when connected */}
            {useLiveData && connectionStatus === 'connected' && (
              <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-green-800">Real-Time Demo</span>
                    <span className="flex items-center text-xs text-green-600">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                      Connected
                    </span>
                  </div>
                </div>
                <button
                  onClick={toggleTrickle}
                  className={`w-full px-3 py-3 text-sm font-medium rounded-lg flex items-center justify-center space-x-2 transition-all shadow-sm ${
                    trickleActive
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                  }`}
                >
                  {trickleActive ? (
                    <>
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      <span>Stop Live Events</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Start Live Events</span>
                    </>
                  )}
                </button>
                {trickleCount > 0 && (
                  <p className="mt-2 text-xs text-center text-green-700">
                    {trickleCount} events generated this session
                  </p>
                )}
                <p className="mt-2 text-xs text-green-600/80">
                  Simulates real-time access events for demo purposes
                </p>
              </div>
            )}

            {/* Data Source Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 text-sm">Data Source</div>
                <div className="text-xs text-gray-500">Toggle between demo and live data</div>
              </div>
              <button
                onClick={() => {
                  onToggleLiveData(!useLiveData);
                  if (!useLiveData) {
                    setConnectionStatus('unknown');
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useLiveData ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useLiveData ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                useLiveData
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {useLiveData ? 'Live Data' : 'Demo Data'}
              </span>
              {useLiveData && connectionStatus === 'error' && (
                <span className="flex items-center text-xs text-red-600">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></span>
                  Connection Failed
                </span>
              )}
              {useLiveData && testing && (
                <span className="flex items-center text-xs text-gray-500">
                  <span className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-1"></span>
                  Testing...
                </span>
              )}
            </div>

            {useLiveData && (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <button
                  onClick={testConnection}
                  disabled={testing}
                  className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
                >
                  {testing ? 'Testing Connection...' : 'Test Connection'}
                </button>
                {connectionStatus === 'error' && (
                  <p className="mt-2 text-xs text-red-600">
                    Could not connect to ClickHouse. Using demo data as fallback.
                  </p>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>{useLiveData ? 'Queries ClickHouse Cloud via server' : 'Demo mode uses hardcoded sample data'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
