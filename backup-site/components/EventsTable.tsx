'use client';

import type { Event } from '@/app/page';

interface EventsTableProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

export default function EventsTable({ events, onEventClick }: EventsTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-600">Recent Events</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-gray-600 font-medium">Time</th>
              <th className="px-4 py-2 text-left text-gray-600 font-medium">Person</th>
              <th className="px-4 py-2 text-left text-gray-600 font-medium">Door</th>
              <th className="px-4 py-2 text-left text-gray-600 font-medium">Result</th>
              <th className="px-4 py-2 text-left text-gray-600 font-medium">Suspicious</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 10).map((event) => (
              <tr
                key={event.id}
                onClick={() => onEventClick(event)}
                className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2 text-gray-900">{event.time}</td>
                <td className="px-4 py-2 text-gray-900">{event.person}</td>
                <td className="px-4 py-2 text-gray-900">{event.door}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      event.result === 'GRANT'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {event.result}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-900">
                  {event.suspicious ? (
                    <span className="text-yellow-600" title="Suspicious activity detected">
                      !
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
