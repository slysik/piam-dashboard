/**
 * MapView - Geographic Door Access Heatmap Visualization
 *
 * This component renders an interactive map showing the geographic distribution
 * of access points and their deny rates. Each door is represented as a marker
 * with size and color intensity based on the number and rate of access denials,
 * enabling spatial analysis of security hotspots.
 *
 * @component
 * @example
 * <MapView tenant="acme" />
 * <MapView tenant="buildright" />
 *
 * Architecture Notes:
 * - Uses Mapbox GL JS for interactive mapping when NEXT_PUBLIC_MAPBOX_TOKEN is set
 * - Graceful fallback to simple visual representation when token unavailable
 * - Marker size scales with deny count: min 20px, max 40px based on denies
 * - Marker opacity scales with deny rate: 0.4 to 1.0 based on denyRate/20
 * - Popups display door name, deny count, and deny rate percentage
 * - Map automatically flies to new center when tenant changes
 * - useCallback hooks prevent unnecessary marker recreations
 * - Cleanup functions properly remove markers and map instances
 *
 * Data Flow:
 * - tenant prop selects door data from sampleDoors record
 * - Each tenant has different geographic coordinates (acme: downtown, buildright: industrial)
 * - mapboxToken state checked on mount from environment variable
 * - markersRef maintains references for cleanup and updates
 * - flyTo animation transitions map between tenant locations
 *
 * @param {MapViewProps} props - Component props
 * @param {string} props.tenant - The tenant identifier to load door locations
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

/**
 * Door location and deny statistics for map visualization
 */
interface DoorData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  denies: number;
  denyRate: number;
}

interface MapViewProps {
  tenant: string;
}

const sampleDoors: Record<string, DoorData[]> = {
  acme: [
    { id: '1', name: 'Main Tower F1 D1', lat: 32.7876, lon: -79.9403, denies: 24, denyRate: 8.2 },
    { id: '2', name: 'Main Tower F2 D3', lat: 32.7878, lon: -79.9401, denies: 12, denyRate: 4.1 },
    { id: '3', name: 'Parking Garage D1', lat: 32.7872, lon: -79.9408, denies: 5, denyRate: 2.3 },
    { id: '4', name: 'Server Room D1', lat: 32.7874, lon: -79.9405, denies: 2, denyRate: 1.5 },
    { id: '5', name: 'Main Lobby D1', lat: 32.7877, lon: -79.9402, denies: 8, denyRate: 3.2 },
  ],
  buildright: [
    { id: '1', name: 'Site Entrance D1', lat: 32.8546, lon: -79.9748, denies: 38, denyRate: 12.5 },
    { id: '2', name: 'Equipment Yard D1', lat: 32.8548, lon: -79.9750, denies: 22, denyRate: 9.8 },
    { id: '3', name: 'Warehouse A D2', lat: 32.8544, lon: -79.9752, denies: 15, denyRate: 7.2 },
    { id: '4', name: 'Site Office D1', lat: 32.8550, lon: -79.9746, denies: 5, denyRate: 2.8 },
  ],
};

export default function MapView({ tenant }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  const doors = sampleDoors[tenant] || sampleDoors.acme;
  const center = doors[0] || { lat: 32.7876, lon: -79.9403 };

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    setMapboxToken(token && token !== 'pk.your_mapbox_token_here' ? token : null);
  }, []);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  }, []);

  const addMarkers = useCallback(() => {
    if (!map.current) return;

    clearMarkers();

    doors.forEach((door) => {
      // Create custom marker element
      const el = document.createElement('div');
      const size = Math.min(40, 20 + door.denies / 2);
      el.className = 'door-marker';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.backgroundColor = `rgba(233, 69, 96, ${Math.min(1, 0.4 + door.denyRate / 20)})`;
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: true })
        .setHTML(`
          <div style="padding: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${door.name}</div>
            <div style="font-size: 12px;">Denies: ${door.denies}</div>
            <div style="font-size: 12px; color: #E53935;">Rate: ${door.denyRate}%</div>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([door.lon, door.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [doors, clearMarkers]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [center.lon, center.lat],
      zoom: 15,
    });

    map.current.on('load', () => {
      addMarkers();
    });

    return () => {
      clearMarkers();
      map.current?.remove();
    };
  }, [mapboxToken, center.lon, center.lat, addMarkers, clearMarkers]);

  // Update markers when tenant changes
  useEffect(() => {
    if (map.current && mapboxToken) {
      map.current.flyTo({
        center: [center.lon, center.lat],
        zoom: 15,
        essential: true,
      });
      addMarkers();
    }
  }, [tenant, center.lon, center.lat, mapboxToken, addMarkers]);

  // Fallback when no Mapbox token
  if (!mapboxToken) {
    return (
      <div className="relative w-full h-full bg-gray-100 rounded flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Map preview (no Mapbox token)</div>
          <div className="relative w-64 h-48 bg-white rounded-lg mx-auto p-4 border border-gray-200">
            {/* Simple visual representation of doors */}
            <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-3 p-4">
              {doors.map((door) => (
                <div
                  key={door.id}
                  className="group relative"
                  title={`${door.name}: ${door.denies} denies (${door.denyRate}%)`}
                >
                  <div
                    className="rounded-full border-2 border-gray-800 shadow-lg transition-transform hover:scale-110"
                    style={{
                      width: `${Math.min(40, 16 + door.denies / 2)}px`,
                      height: `${Math.min(40, 16 + door.denies / 2)}px`,
                      backgroundColor: `rgba(220, 38, 38, ${Math.min(1, 0.4 + door.denyRate / 20)})`,
                    }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {door.name}
                    <br />
                    {door.denies} denies ({door.denyRate}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local for full map
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full rounded" />;
}
