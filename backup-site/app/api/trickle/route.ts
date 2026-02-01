import { NextRequest, NextResponse } from 'next/server';

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

      const numEvents = 5 + Math.floor(Math.random() * 10);
      const events = [];
      
      for (let i = 0; i < numEvents; i++) {
        const door = doors[Math.floor(Math.random() * doors.length)];
        const person = people[Math.floor(Math.random() * people.length)];
        const connIdx = Math.floor(Math.random() * connectors.length);
        const isGrant = Math.random() > 0.15;
        const isSuspicious = !isGrant && Math.random() > 0.7;
        const anomalyTypes = ['after_hours', 'denied_streak', 'impossible_travel', 'tailgating'];
        
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
        });
      }

      const values = events.map(e => 
        `(generateUUIDv4(), '${e.tenant_id}', now64(3), '${e.person_id}', '${e.person_name}', '${e.badge_id}', '${e.location_id}', '${e.location_name}', '${e.door_id}', ${e.lat}, ${e.lon}, '${e.result}', ${e.deny_reason ? `'${e.deny_reason}'` : 'NULL'}, '${e.connector_id}', '${e.pacs_type}', ${e.suspicious_flag}, ${e.anomaly_type ? `'${e.anomaly_type}'` : 'NULL'}, ${e.risk_score}, '{}')`
      ).join(',\n');

      const insertQuery = `
        INSERT INTO piam.access_events 
        (event_id, tenant_id, event_time, person_id, person_name, badge_id, location_id, location_name, door_id, lat, lon, result, deny_reason, connector_id, pacs_type, suspicious_flag, anomaly_type, risk_score, raw_payload)
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
