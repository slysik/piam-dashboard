'use client';

import { useState, useEffect, useCallback } from 'react';
import { queryClickHouse, ClickHouseError } from '@/lib/clickhouse';

interface UseClickHouseOptions<T> {
  query: string;
  params?: Record<string, string | number>;
  enabled?: boolean;
  refreshInterval?: number;
  fallbackData?: T;
}

interface UseClickHouseResult<T> {
  data: T | null;
  loading: boolean;
  error: ClickHouseError | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useClickHouse<T>({
  query,
  params,
  enabled = true,
  refreshInterval,
  fallbackData,
}: UseClickHouseOptions<T>): UseClickHouseResult<T> {
  const [data, setData] = useState<T | null>(fallbackData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClickHouseError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await queryClickHouse<T>(query, params);
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      const clickhouseError = err as ClickHouseError;
      setError(clickhouseError);

      // Use fallback data if available
      if (fallbackData && !data) {
        setData(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  }, [query, params, enabled, fallbackData, data]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh interval
  useEffect(() => {
    if (!refreshInterval || !enabled) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, enabled, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    lastUpdated,
  };
}

// Hook for fetching KPI data
export function useKPIData(tenant: string) {
  return useClickHouse({
    query: `
      SELECT
        events_15m,
        denies_15m,
        deny_rate_15m,
        suspicious_15m
      FROM piam.v_kpi_current
      WHERE tenant_id = {tenant:String}
      LIMIT 1
    `,
    params: { tenant },
    refreshInterval: 2000,
    fallbackData: {
      events_15m: 0,
      denies_15m: 0,
      deny_rate_15m: 0,
      suspicious_15m: 0,
    },
  });
}

// Hook for fetching time series data
export function useTimeSeriesData(tenant: string, minutes: number = 60) {
  return useClickHouse({
    query: `
      SELECT
        minute,
        total_events,
        grants,
        denies,
        suspicious
      FROM piam.v_timeseries_minute
      WHERE tenant_id = {tenant:String}
        AND minute >= now() - INTERVAL {minutes:UInt32} MINUTE
      ORDER BY minute ASC
    `,
    params: { tenant, minutes },
    refreshInterval: 2000,
    fallbackData: [],
  });
}

// Hook for fetching door hotspots
export function useDoorHotspots(tenant: string) {
  return useClickHouse({
    query: `
      SELECT
        door_id,
        location_name,
        lat,
        lon,
        total_events,
        denies,
        deny_rate_pct,
        suspicious
      FROM piam.v_door_hotspots
      WHERE tenant_id = {tenant:String}
      ORDER BY denies DESC
      LIMIT 100
    `,
    params: { tenant },
    refreshInterval: 2000,
    fallbackData: [],
  });
}

// Hook for fetching recent events
export function useRecentEvents(tenant: string, limit: number = 50) {
  return useClickHouse({
    query: `
      SELECT
        event_id,
        event_time,
        person_name,
        location_name,
        result,
        suspicious_flag,
        deny_reason,
        raw_payload
      FROM piam.v_recent_events
      WHERE tenant_id = {tenant:String}
      ORDER BY event_time DESC
      LIMIT {limit:UInt32}
    `,
    params: { tenant, limit },
    refreshInterval: 2000,
    fallbackData: [],
  });
}

// Hook for connector health
export function useConnectorHealth(tenant: string) {
  return useClickHouse({
    query: `
      SELECT
        connector_name,
        pacs_type,
        status,
        latency_ms,
        last_check,
        events_per_minute
      FROM piam.v_connector_health_latest
      WHERE tenant_id = {tenant:String}
    `,
    params: { tenant },
    refreshInterval: 2000,
    fallbackData: [],
  });
}

// Hook for insights/deny spikes
export function useInsights(tenant: string) {
  return useClickHouse({
    query: `
      SELECT
        location_name,
        current_denies,
        baseline_denies,
        spike_ratio
      FROM piam.v_insight_deny_spikes
      WHERE tenant_id = {tenant:String}
        AND spike_ratio > 1.5
      ORDER BY spike_ratio DESC
      LIMIT 10
    `,
    params: { tenant },
    refreshInterval: 2000,
    fallbackData: [],
  });
}

// Hook for data freshness
export function useFreshness() {
  return useClickHouse({
    query: `
      SELECT
        age_seconds,
        events_last_5m
      FROM piam.v_freshness
      LIMIT 1
    `,
    refreshInterval: 2000,
    fallbackData: {
      age_seconds: 0,
      events_last_5m: 0,
    },
  });
}

export default useClickHouse;
