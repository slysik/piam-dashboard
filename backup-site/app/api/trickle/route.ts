/**
 * Trickle API - Live Event Stream Generator
 *
 * Generates and inserts simulated PIAM (Physical Identity and Access Management)
 * access events into ClickHouse for demonstration and testing purposes. This endpoint
 * creates realistic access control events with randomized data including door access
 * attempts, grants/denials, anomaly detection, and associated video clips.
 *
 * @module api/trickle
 *
 * ## Purpose
 *
 * This API is designed for:
 * - Demo environments requiring realistic data flow
 * - Testing dashboard visualizations with live data
 * - Load testing the ClickHouse ingestion pipeline
 * - Simulating access control scenarios
 *
 * ## Generated Data
 *
 * Each event includes:
 * - Person identification (ID, name, badge)
 * - Location data (door, coordinates, building area)
 * - Access result (grant/deny with reason)
 * - PACS connector information (Lenel, C-CURE, S2, Genetec)
 * - Risk scoring and anomaly detection flags
 * - Optional video clip URLs
 *
 * ## Environment Variables
 *
 * Same as `/api/clickhouse`:
 * - `CLICKHOUSE_URL` or `CLICKHOUSE_HOST`/`CLICKHOUSE_PORT`
 * - `CLICKHOUSE_USER` (default: 'default')
 * - `CLICKHOUSE_PASSWORD` (default: '')
 *
 * @endpoint POST /api/trickle
 *
 * @example
 * // Start event generation (inserts 5-14 random events)
 * curl -X POST http://localhost:3000/api/trickle \
 *   -H "Content-Type: application/json" \
 *   -d '{"action": "start"}'
 *
 * @example
 * // Generate events for specific tenant
 * curl -X POST http://localhost:3000/api/trickle \
 *   -H "Content-Type: application/json" \
 *   -d '{"action": "start", "tenant": "demo-corp"}'
 *
 * @example
 * // Continuous trickle (call repeatedly with interval)
 * # In bash:
 * while true; do
 *   curl -X POST http://localhost:3000/api/trickle \
 *     -H "Content-Type: application/json" \
 *     -d '{"action": "start"}' && sleep 5
 * done
 */
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles POST requests to generate and insert simulated access events.
 *
 * @async
 * @function POST
 * @param {NextRequest} request - The incoming HTTP request
 *
 * @requestBody
 * ```typescript
 * {
 *   action: 'start';     // Action to perform (required, only 'start' supported)
 *   tenant?: string;     // Tenant identifier (default: 'acme-corp')
 * }
 * ```
 *
 * @returns {Promise<NextResponse>} JSON response with insertion results or error
 *
 * @response 200 - Success
 * ```typescript
 * {
 *   success: true,
 *   eventsInserted: number,  // Number of events inserted (5-14)
 *   message: string          // "Inserted N events"
 * }
 * ```
 *
 * @response 400 - Invalid Action
 * ```typescript
 * {
 *   error: "Unknown action"
 * }
 * ```
 *
 * @response 500 - Database Error
 * ```typescript
 * {
 *   error: string  // ClickHouse error message
 * }
 * ```
 *
 * @response 500 - Server Error
 * ```typescript
 * {
 *   error: string  // "Trickle failed: <error message>"
 * }
 * ```
 *
 * ## Generated Event Schema
 *
 * Events are inserted into `piam.access_events` with these fields:
 *
 * | Field | Type | Description |
 * |-------|------|-------------|
 * | event_id | UUID | Auto-generated unique identifier |
 * | tenant_id | String | Tenant identifier |
 * | event_time | DateTime64(3) | Current timestamp with milliseconds |
 * | person_id | String | Person identifier (P100-P999) |
 * | person_name | String | Full name from sample list |
 * | badge_id | String | Badge number (B1000-B9999) |
 * | location_id | String | Location identifier (L0-L19) |
 * | location_name | String | Human-readable location name |
 * | door_id | String | Door identifier (D0-D49) |
 * | lat | Float64 | Latitude coordinate |
 * | lon | Float64 | Longitude coordinate |
 * | result | String | 'grant' or 'deny' |
 * | deny_reason | Nullable(String) | Reason if denied |
 * | connector_id | String | PACS connector ID |
 * | pacs_type | String | PACS system type |
 * | suspicious_flag | UInt8 | 0 or 1 |
 * | anomaly_type | Nullable(String) | Type of anomaly detected |
 * | risk_score | UInt8 | 0-100 risk score |
 * | video_clip_url | Nullable(String) | Associated video clip URL |
 * | raw_payload | String | Empty object '{}' |
 *
 * ## Probability Distribution
 *
 * - ~85% of events are 'grant', ~15% are 'deny'
 * - ~30% of denied events are flagged as suspicious
 * - ~70% of events have associated video clips
 *
 * @throws {Error} When ClickHouse connection or insertion fails
 */
export async function POST(request: NextRequest) {
  try {
    const { action, tenant = 'acme-corp' } = await request.json();

    const username = process.env.CLICKHOUSE_USER || 'default';
    const password = process.env.CLICKHOUSE_PASSWORD || '';

    let clickhouseUrl: string;
    if (process.env.CLICKHOUSE_URL) {
      clickhouseUrl = process.env.CLICKHOUSE_URL;
    } else {
      const host = process.env.CLICKHOUSE_HOST || 'localhost';
      const port = process.env.CLICKHOUSE_PORT || '8123';
      const protocol = port === '8443' || host.includes('clickhouse.cloud') ? 'https' : 'http';
      clickhouseUrl = `${protocol}://${host}:${port}`;
    }

    const url = new URL(clickhouseUrl);
    url.searchParams.set('database', 'piam');
    url.searchParams.set('user', username);
    url.searchParams.set('password', password);

    if (action === 'start') {
      const doors = [
        { name: 'Main Lobby', lat: 37.7749, lon: -122.4194 },
        { name: 'Server Room', lat: 37.7751, lon: -122.4180 },
        { name: 'Loading Dock', lat: 37.7745, lon: -122.4200 },
        { name: 'Executive Floor', lat: 37.7755, lon: -122.4188 },
        { name: 'Parking Garage', lat: 37.7740, lon: -122.4210 },
        { name: 'Data Center', lat: 37.7748, lon: -122.4175 },
        { name: 'R&D Lab', lat: 37.7760, lon: -122.4195 },
        { name: 'Cafeteria', lat: 37.7743, lon: -122.4185 },
      ];

      const people = [
        'John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown', 'Charlie Davis',
        'Emma Johnson', 'Michael Chen', 'Sarah Miller', 'David Garcia', 'Lisa Wang'
      ];

      const connectors = ['lenel-01', 'ccure-01', 's2-01', 'genetec-01'];
      const pacsTypes = ['Lenel', 'C-CURE', 'S2', 'Genetec'];

      // Sample video clips for demo (hosted in /public/clips or external URLs)
      const sampleVideos = [
        '/clips/badge-access-lobby.mp4',
        '/clips/badge-access-server-room.mp4',
        '/clips/badge-denied-entry.mp4',
      ];

      const numEvents = 5 + Math.floor(Math.random() * 10);
      const events = [];
      
      for (let i = 0; i < numEvents; i++) {
        const door = doors[Math.floor(Math.random() * doors.length)];
        const person = people[Math.floor(Math.random() * people.length)];
        const connIdx = Math.floor(Math.random() * connectors.length);
        const isGrant = Math.random() > 0.15;
        const isSuspicious = !isGrant && Math.random() > 0.7;
        const anomalyTypes = ['after_hours', 'denied_streak', 'impossible_travel', 'tailgating'];
        
        // ~70% of events have video clips
        const hasVideo = Math.random() > 0.3;
        const videoUrl = hasVideo ? sampleVideos[Math.floor(Math.random() * sampleVideos.length)] : null;

        events.push({
          tenant_id: tenant,
          person_id: `P${100 + Math.floor(Math.random() * 900)}`,
          person_name: person,
          badge_id: `B${1000 + Math.floor(Math.random() * 9000)}`,
          location_id: `L${Math.floor(Math.random() * 20)}`,
          location_name: door.name,
          door_id: `D${Math.floor(Math.random() * 50)}`,
          lat: door.lat + (Math.random() - 0.5) * 0.001,
          lon: door.lon + (Math.random() - 0.5) * 0.001,
          result: isGrant ? 'grant' : 'deny',
          deny_reason: isGrant ? null : ['Invalid Badge', 'Expired', 'No Access', 'Time Restriction'][Math.floor(Math.random() * 4)],
          connector_id: connectors[connIdx],
          pacs_type: pacsTypes[connIdx],
          suspicious_flag: isSuspicious ? 1 : 0,
          anomaly_type: isSuspicious ? anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)] : null,
          risk_score: Math.floor(Math.random() * 100),
          video_clip_url: videoUrl,
        });
      }

      const values = events.map(e =>
        `(generateUUIDv4(), '${e.tenant_id}', now64(3), '${e.person_id}', '${e.person_name}', '${e.badge_id}', '${e.location_id}', '${e.location_name}', '${e.door_id}', ${e.lat}, ${e.lon}, '${e.result}', '${e.deny_reason || ''}', '${e.connector_id}', '${e.pacs_type}', ${e.suspicious_flag}, '${e.anomaly_type || ''}', ${e.risk_score}, '${e.video_clip_url || ''}', '{}')`
      ).join(',\n');

      const insertQuery = `
        INSERT INTO piam.access_events
        (event_id, tenant_id, event_time, person_id, person_name, badge_id, location_id, location_name, door_id, lat, lon, result, deny_reason, connector_id, pacs_type, suspicious_flag, anomaly_type, risk_score, video_clip_url, raw_payload)
        VALUES ${values}
      `;

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: insertQuery,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: errorText }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        eventsInserted: numEvents,
        message: `Inserted ${numEvents} events` 
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Trickle API error:', error);
    return NextResponse.json(
      { error: `Trickle failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
