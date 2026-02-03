'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { queryClickHouse } from '@/lib/clickhouse';

interface UseDashboardDataOptions<T> {
  liveQuery: string;
  liveParams?: Record<string, string | number>;
  demoData: T;
  useLiveData: boolean;
  refreshInterval?: number;
  transformLiveData?: (data: unknown[]) => T;
}

interface UseDashboardDataResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  isLive: boolean;
}

export function useDashboardData<T>({
  liveQuery,
  liveParams,
  demoData,
  useLiveData,
  refreshInterval = 15000,
  transformLiveData,
}: UseDashboardDataOptions<T>): UseDashboardDataResult<T> {
  // Use ref to store demoData to avoid dependency changes triggering re-fetches
  const demoDataRef = useRef(demoData);
  const [data, setData] = useState<T>(demoData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLiveData, setHasLiveData] = useState(false);

  // Update ref when demoData changes (for fallback)
  useEffect(() => {
    demoDataRef.current = demoData;
  }, [demoData]);

  // Only reset to demoData when switching FROM live TO demo mode
  useEffect(() => {
    if (!useLiveData) {
      setData(demoDataRef.current);
      setHasLiveData(false);
    }
  }, [useLiveData]);

  const fetchLiveData = useCallback(async () => {
    if (!useLiveData) {
      return;
    }

    setLoading(true);
    try {
      const result = await queryClickHouse(liveQuery, liveParams);
      if (transformLiveData) {
        setData(transformLiveData(result as unknown[]));
      } else {
        setData(result as T);
      }
      setHasLiveData(true);
      setError(null);
    } catch (err) {
      console.error('ClickHouse query failed:', err);
      setError('Failed to fetch live data');
      // Don't reset to demoData on error - keep previous data to prevent flickering
      if (!hasLiveData) {
        setData(demoDataRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, [useLiveData, liveQuery, liveParams, transformLiveData, hasLiveData]);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  useEffect(() => {
    if (!useLiveData || !refreshInterval) return;
    const interval = setInterval(fetchLiveData, refreshInterval);
    return () => clearInterval(interval);
  }, [useLiveData, refreshInterval, fetchLiveData]);

  return {
    data,
    loading,
    error,
    isLive: useLiveData && !error,
  };
}

export function useKPIDataWithFallback(
  tenant: string,
  useLiveData: boolean,
  demoData: {
    eventsToday: number;
    denyRate: number;
    activeDoors: number;
    connectorsOnline: number;
    connectorsTotal: number;
    suspicious: number;
  }
) {
  const tenantId = tenant === 'acme' ? 'acme-corp' : 'buildright-construction';
  
  return useDashboardData({
    liveQuery: `
      SELECT
        events_24h as eventsToday,
        round(if(events_24h > 0, denies_24h * 100.0 / events_24h, 0), 1) as denyRate,
        suspicious_15m as suspicious
      FROM piam.v_kpi_current
      WHERE tenant_id = '${tenantId}'
      LIMIT 1
    `,
    demoData,
    useLiveData,
    refreshInterval: 2000,
    transformLiveData: (rows) => {
      if (rows.length === 0) return demoData;
      const row = rows[0] as Record<string, number>;
      return {
        eventsToday: row.eventsToday ?? demoData.eventsToday,
        denyRate: row.denyRate ?? demoData.denyRate,
        activeDoors: demoData.activeDoors,
        connectorsOnline: demoData.connectorsOnline,
        connectorsTotal: demoData.connectorsTotal,
        suspicious: row.suspicious ?? demoData.suspicious,
      };
    },
  });
}

export function useTimeSeriesWithFallback(
  tenant: string,
  useLiveData: boolean,
  timeRange: '15m' | '60m' | '24h',
  demoData: Array<{ time: string; grants: number; denies: number }>
) {
  const tenantId = tenant === 'acme' ? 'acme-corp' : 'buildright-construction';
  const minutes = timeRange === '15m' ? 15 : timeRange === '60m' ? 60 : 1440;
  
  const [data, setData] = useState(demoData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!useLiveData) {
      setData(demoData);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await queryClickHouse(`
          SELECT
            formatDateTime(minute, '%H:%i') as time,
            grants,
            denies
          FROM piam.v_timeseries_minute
          WHERE tenant_id = '${tenantId}'
            AND minute >= now() - INTERVAL ${minutes} MINUTE
          ORDER BY minute ASC
        `);
        if (Array.isArray(result) && result.length > 0) {
          setData(result.map((row: unknown) => {
            const r = row as Record<string, unknown>;
            return {
              time: String(r.time || ''),
              grants: Number(r.grants || 0),
              denies: Number(r.denies || 0),
            };
          }));
        } else {
          setData(demoData);
        }
        setError(null);
      } catch (err) {
        console.error('ClickHouse query failed:', err);
        setError('Failed to fetch live data');
        setData(demoData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [tenant, useLiveData, timeRange, demoData, tenantId, minutes]);

  return {
    data,
    loading,
    error,
    isLive: useLiveData && !error,
  };
}

export function useRecentEventsWithFallback(
  tenant: string,
  useLiveData: boolean,
  demoData: Array<{
    id: string;
    time: string;
    person: string;
    door: string;
    result: 'GRANT' | 'DENY';
    suspicious: boolean;
    rawPayload: object;
  }>
) {
  const tenantId = tenant === 'acme' ? 'acme-corp' : 'buildright-construction';
  
  return useDashboardData({
    liveQuery: `
      SELECT
        event_id as id,
        formatDateTime(event_time, '%H:%i:%S') as time,
        person_name as person,
        location_name as door,
        upper(result) as result,
        suspicious_flag as suspicious,
        raw_payload as rawPayload
      FROM piam.v_recent_events
      WHERE tenant_id = '${tenantId}'
      ORDER BY event_time DESC
      LIMIT 50
    `,
    demoData,
    useLiveData,
    refreshInterval: 2000,
    transformLiveData: (rows) => {
      if (rows.length === 0) return demoData;
      return rows.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id || ''),
          time: String(r.time || ''),
          person: String(r.person || 'Unknown'),
          door: String(r.door || ''),
          result: (String(r.result || 'GRANT').toUpperCase().includes('GRANT') ? 'GRANT' : 'DENY') as 'GRANT' | 'DENY',
          suspicious: Boolean(r.suspicious),
          rawPayload: typeof r.rawPayload === 'string' ? JSON.parse(r.rawPayload || '{}') : (r.rawPayload || {}),
        };
      });
    },
  });
}

export function useConnectorHealthWithFallback(
  tenant: string,
  useLiveData: boolean,
  demoData: Array<{
    name: string;
    type: string;
    status: 'healthy' | 'degraded' | 'offline';
    latency: number;
    eventsPerMin: number;
    lastCheck: string;
  }>
) {
  const tenantId = tenant === 'acme' ? 'acme-corp' : 'buildright-construction';
  
  return useDashboardData({
    liveQuery: `
      SELECT
        connector_name as name,
        pacs_type as type,
        lower(status) as status,
        latency_ms as latency,
        events_per_minute as eventsPerMin,
        formatDateTime(last_check, '%H:%i:%S') as lastCheck
      FROM piam.v_connector_health_latest
      WHERE tenant_id = '${tenantId}'
    `,
    demoData,
    useLiveData,
    refreshInterval: 2000,
    transformLiveData: (rows) => {
      if (rows.length === 0) return demoData;
      return rows.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          name: String(r.name || ''),
          type: String(r.type || ''),
          status: (String(r.status || 'healthy') as 'healthy' | 'degraded' | 'offline'),
          latency: Number(r.latency || 0),
          eventsPerMin: Number(r.eventsPerMin || 0),
          lastCheck: String(r.lastCheck || ''),
        };
      });
    },
  });
}

export function useDoorHotspotsWithFallback(
  tenant: string,
  useLiveData: boolean,
  demoData: Array<{
    id: string;
    name: string;
    lat: number;
    lon: number;
    denies: number;
    denyRate: number;
  }>
) {
  const tenantId = tenant === 'acme' ? 'acme-corp' : 'buildright-construction';
  
  return useDashboardData({
    liveQuery: `
      SELECT
        location_id as id,
        location_name as name,
        lat,
        lon,
        denies,
        deny_rate_pct as denyRate
      FROM piam.v_door_hotspots
      WHERE tenant_id = '${tenantId}'
      ORDER BY denies DESC
      LIMIT 20
    `,
    demoData,
    useLiveData,
    refreshInterval: 2000,
    transformLiveData: (rows) => {
      if (rows.length === 0) return demoData;
      return rows.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id || ''),
          name: String(r.name || ''),
          lat: Number(r.lat || 0),
          lon: Number(r.lon || 0),
          denies: Number(r.denies || 0),
          denyRate: Number(r.denyRate || 0),
        };
      });
    },
  });
}

export function useComplianceWithFallback(
  tenant: string,
  useLiveData: boolean,
  demoData: Array<{
    id: string;
    name: string;
    company: string;
    trade: string;
    badgeId: string;
    personType: 'contractor' | 'employee' | 'visitor';
    requirementType: string;
    status: 'Compliant' | 'Expiring' | 'Expired' | 'Non-Compliant';
    expiryDate: string;
    daysUntilExpiry: number;
    lastAccess: string;
  }>
) {
  const tenantId = tenant === 'acme' ? 'acme-corp' : 'buildright-construction';
  
  return useDashboardData({
    liveQuery: `
      SELECT
        person_id as id,
        full_name as name,
        coalesce(contractor_company, department) as company,
        '' as trade,
        person_id as badgeId,
        if(is_contractor = 1, 'contractor', 'employee') as personType,
        requirement_type as requirementType,
        if(is_expired = 1, 'Expired', if(expires_within_7d = 1, 'Expiring', 'Compliant')) as status,
        toString(expiry_date) as expiryDate,
        days_until_expiry as daysUntilExpiry,
        'Recently' as lastAccess
      FROM piam.v_compliance_summary
      WHERE tenant_id = '${tenantId}'
      LIMIT 50
    `,
    demoData,
    useLiveData,
    refreshInterval: 2000,
    transformLiveData: (rows) => {
      if (rows.length === 0) return demoData;
      return rows.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id || ''),
          name: String(r.name || ''),
          company: String(r.company || ''),
          trade: String(r.trade || ''),
          badgeId: String(r.badgeId || ''),
          personType: (String(r.personType || 'employee') as 'contractor' | 'employee' | 'visitor'),
          requirementType: String(r.requirementType || 'Safety Training'),
          status: (String(r.status || 'Compliant') as 'Compliant' | 'Expiring' | 'Expired' | 'Non-Compliant'),
          expiryDate: String(r.expiryDate || ''),
          daysUntilExpiry: Number(r.daysUntilExpiry || 0),
          lastAccess: String(r.lastAccess || ''),
        };
      });
    },
  });
}

export default useDashboardData;
