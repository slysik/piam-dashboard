/**
 * ClickHouse Proxy API
 *
 * Proxies SQL queries to a ClickHouse database server. This endpoint acts as a
 * secure intermediary between the frontend application and the ClickHouse database,
 * handling authentication and connection details server-side.
 *
 * @module api/clickhouse
 *
 * ## Environment Variables
 *
 * The endpoint supports two connection modes:
 *
 * **Full URL mode (ClickHouse Cloud):**
 * - `CLICKHOUSE_URL` - Complete URL including protocol (e.g., https://xxx.clickhouse.cloud:8443)
 *
 * **Host/Port mode (Local/Self-hosted):**
 * - `CLICKHOUSE_HOST` - Database host (default: 'localhost')
 * - `CLICKHOUSE_PORT` - Database port (default: '8123')
 *
 * **Authentication (both modes):**
 * - `CLICKHOUSE_USER` - Database username (default: 'default')
 * - `CLICKHOUSE_PASSWORD` - Database password (default: '')
 *
 * ## Protocol Selection
 *
 * HTTPS is automatically used when:
 * - Port is 8443 (ClickHouse Cloud secure port)
 * - Host contains 'clickhouse.cloud'
 *
 * Otherwise, HTTP is used for local development.
 *
 * @endpoint POST /api/clickhouse
 *
 * @example
 * // Basic query
 * curl -X POST http://localhost:3000/api/clickhouse \
 *   -H "Content-Type: application/json" \
 *   -d '{"query": "SELECT * FROM piam.v_kpi_current"}'
 *
 * @example
 * // Query with custom database
 * curl -X POST http://localhost:3000/api/clickhouse \
 *   -H "Content-Type: application/json" \
 *   -d '{"query": "SELECT count() FROM events", "database": "analytics"}'
 *
 * @example
 * // Aggregation query
 * curl -X POST http://localhost:3000/api/clickhouse \
 *   -H "Content-Type: application/json" \
 *   -d '{"query": "SELECT location_name, count() as cnt FROM access_events GROUP BY location_name ORDER BY cnt DESC LIMIT 10"}'
 */
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles POST requests to execute ClickHouse SQL queries.
 *
 * @async
 * @function POST
 * @param {NextRequest} request - The incoming HTTP request
 *
 * @requestBody
 * ```typescript
 * {
 *   query: string;      // SQL query to execute (required)
 *   database?: string;  // Target database (default: 'piam')
 * }
 * ```
 *
 * @returns {Promise<NextResponse>} JSON response containing query results or error
 *
 * @response 200 - Success
 * ```typescript
 * // Array of row objects (JSONEachRow format)
 * [
 *   { column1: value1, column2: value2 },
 *   { column1: value3, column2: value4 }
 * ]
 * // Empty result returns: []
 * ```
 *
 * @response 4xx/5xx - ClickHouse Error
 * ```typescript
 * {
 *   error: string  // "ClickHouse query failed: <error details>"
 * }
 * ```
 *
 * @response 500 - Connection Error
 * ```typescript
 * {
 *   error: string  // "Failed to connect to ClickHouse: <error message>"
 * }
 * ```
 *
 * @throws {Error} When ClickHouse connection fails or query execution errors
 *
 * @security
 * - Credentials are read from environment variables, never exposed to client
 * - Connection URL is constructed server-side
 * - No SQL injection protection built-in - use parameterized queries where possible
 */
export async function POST(request: NextRequest) {
  try {
    const { query, database = 'piam' } = await request.json();

    const username = process.env.CLICKHOUSE_USER || 'default';
    const password = process.env.CLICKHOUSE_PASSWORD || '';

    // Support full URL (for ClickHouse Cloud) or construct from host/port (for local)
    let clickhouseUrl: string;
    if (process.env.CLICKHOUSE_URL) {
      clickhouseUrl = process.env.CLICKHOUSE_URL;
    } else {
      const host = process.env.CLICKHOUSE_HOST || 'localhost';
      const port = process.env.CLICKHOUSE_PORT || '8123';
      // Use HTTPS for ClickHouse Cloud (port 8443) or when host contains 'clickhouse.cloud'
      const protocol = port === '8443' || host.includes('clickhouse.cloud') ? 'https' : 'http';
      clickhouseUrl = `${protocol}://${host}:${port}`;
    }

    const url = new URL(clickhouseUrl);
    url.searchParams.set('database', database);
    url.searchParams.set('default_format', 'JSONEachRow');
    url.searchParams.set('user', username);
    url.searchParams.set('password', password);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: query,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `ClickHouse query failed: ${errorText}` },
        { status: response.status }
      );
    }

    const text = await response.text();

    if (!text.trim()) {
      return NextResponse.json([]);
    }

    const rows = text
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('ClickHouse proxy error:', error);
    return NextResponse.json(
      { error: `Failed to connect to ClickHouse: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
