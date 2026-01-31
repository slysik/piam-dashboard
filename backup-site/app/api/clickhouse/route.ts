import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query, database = 'piam' } = await request.json();

    const clickhouseUrl = process.env.CLICKHOUSE_URL;
    const username = process.env.CLICKHOUSE_USER || 'default';
    const password = process.env.CLICKHOUSE_PASSWORD || '';

    if (!clickhouseUrl) {
      return NextResponse.json(
        { error: 'ClickHouse URL not configured' },
        { status: 500 }
      );
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
