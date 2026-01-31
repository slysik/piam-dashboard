/**
 * ClickHouse HTTP interface client for browser-based queries
 *
 * This module provides utilities for fetching data from ClickHouse's
 * HTTP interface (port 8123) directly from the browser.
 *
 * Note: For production use, you should proxy these requests through
 * your backend to avoid CORS issues and protect credentials.
 */

export interface ClickHouseConfig {
  url: string;
  database: string;
  username?: string;
  password?: string;
}

export interface ClickHouseError {
  message: string;
  code?: string;
  query?: string;
}

// Default configuration
const defaultConfig: ClickHouseConfig = {
  url: process.env.NEXT_PUBLIC_CLICKHOUSE_URL || 'http://localhost:8123',
  database: 'piam',
  username: 'default',
  password: '',
};

/**
 * Execute a query against ClickHouse HTTP interface
 */
export async function queryClickHouse<T = unknown>(
  query: string,
  params?: Record<string, string | number>,
  config: Partial<ClickHouseConfig> = {}
): Promise<T> {
  const finalConfig = { ...defaultConfig, ...config };

  // Substitute parameters in query
  let processedQuery = query;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      const replacement =
        typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : String(value);
      processedQuery = processedQuery.replace(
        new RegExp(`\\{${key}:(\\w+)\\}`, 'g'),
        replacement
      );
    }
  }

  try {
    // Use server-side API route for secure ClickHouse access
    const response = await fetch('/api/clickhouse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: processedQuery,
        database: finalConfig.database,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw {
        message: errorData.error || `ClickHouse query failed`,
        code: String(response.status),
        query: processedQuery,
      } as ClickHouseError;
    }

    const rows = await response.json();
    return rows as T;
  } catch (error) {
    if ((error as ClickHouseError).code) {
      throw error;
    }

    throw {
      message: `Failed to connect to ClickHouse: ${(error as Error).message}`,
      query: processedQuery,
    } as ClickHouseError;
  }
}

/**
 * Execute a query and return a single row
 */
export async function queryOne<T = unknown>(
  query: string,
  params?: Record<string, string | number>,
  config?: Partial<ClickHouseConfig>
): Promise<T | null> {
  const rows = await queryClickHouse<T[]>(query, params, config);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Check if ClickHouse is reachable
 */
export async function checkConnection(
  config: Partial<ClickHouseConfig> = {}
): Promise<boolean> {
  try {
    await queryClickHouse('SELECT 1', undefined, config);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get data freshness (seconds since last event)
 */
export async function getDataFreshness(
  config?: Partial<ClickHouseConfig>
): Promise<{ ageSeconds: number; eventsLast5m: number }> {
  const result = await queryOne<{
    age_seconds: number;
    events_last_5m: number;
  }>('SELECT age_seconds, events_last_5m FROM piam.v_freshness LIMIT 1', undefined, config);

  return {
    ageSeconds: result?.age_seconds ?? 0,
    eventsLast5m: result?.events_last_5m ?? 0,
  };
}

/**
 * Format a Date for ClickHouse DateTime
 */
export function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

/**
 * Build a WHERE clause for tenant filtering
 */
export function tenantFilter(tenant: string, column: string = 'tenant_id'): string {
  return `${column} = '${tenant.replace(/'/g, "\\'")}'`;
}

/**
 * Build a time range filter
 */
export function timeRangeFilter(
  column: string,
  minutes: number
): string {
  return `${column} >= now() - INTERVAL ${minutes} MINUTE`;
}

const clickhouseHelpers = {
  queryClickHouse,
  queryOne,
  checkConnection,
  getDataFreshness,
  formatDateTime,
  tenantFilter,
  timeRangeFilter,
};

export default clickhouseHelpers;
