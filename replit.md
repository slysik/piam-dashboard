# PIAM Dashboard Demo

## Overview
A multi-tenant Physical Identity and Access Management (PIAM) analytics dashboard demonstrating real-time credential and access event visualization. Built with Next.js 14, TypeScript, Tailwind CSS, and Recharts.

## Project Structure
```
/
├── backup-site/          # Next.js frontend application
│   ├── app/              # App router pages
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   └── next.config.js    # Next.js configuration
├── datagen/              # Python data generation scripts (Docker-dependent)
├── clickhouse/           # ClickHouse schema and config (Docker-dependent)
├── scripts/              # Utility shell scripts
└── superset/             # Superset dashboard config (Docker-dependent)
```

## Running the App
The main frontend runs via the "PIAM Dashboard" workflow on port 5000.

## Key Features
- Real-time KPI metrics display
- Access event visualization (grants vs denies)
- Door hotspots map (requires Mapbox token for full functionality)
- Connector health monitoring
- Top security insights

## Environment Variables (Optional)
- `NEXT_PUBLIC_MAPBOX_TOKEN`: Mapbox API token for full map functionality
- `NEXT_PUBLIC_CLICKHOUSE_URL`: ClickHouse URL for live data mode

## Tech Stack
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Recharts (charts)
- Mapbox GL (maps)

## Recent Changes
- 2026-01-30: Initial Replit setup with Next.js workflow configured
