'use client';

import { useState } from 'react';
import type { Event } from '@/app/page';

interface EvidenceDrawerProps {
  event: Event;
  onClose: () => void;
}

export default function EvidenceDrawer({ event, onClose }: EvidenceDrawerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(event.rawPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 border-l border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Event Evidence</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            X
          </button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto h-full pb-20">
          {/* Event Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-600">Event Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="text-gray-900">{event.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Person</span>
                <span className="text-gray-900">{event.person}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Door</span>
                <span className="text-gray-900">{event.door}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Result</span>
                <span
                  className={
                    event.result === 'GRANT' ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {event.result}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Suspicious</span>
                <span className={event.suspicious ? 'text-yellow-600' : 'text-gray-900'}>
                  {event.suspicious ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Raw Payload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Raw PACS Payload</h3>
              <button
                onClick={handleCopyJson}
                className="text-xs text-red-600 hover:text-red-700 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto text-gray-900 border border-gray-200">
              {JSON.stringify(event.rawPayload, null, 2)}
            </pre>
          </div>

          {/* Investigation Actions */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Investigation Actions
            </h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 bg-gray-100 rounded text-sm text-gray-900 hover:bg-red-100 transition-colors">
                View person&apos;s recent activity
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-100 rounded text-sm text-gray-900 hover:bg-red-100 transition-colors">
                View door&apos;s recent events
              </button>
              <button className="w-full text-left px-3 py-2 bg-gray-100 rounded text-sm text-gray-900 hover:bg-red-100 transition-colors">
                Export evidence packet
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
