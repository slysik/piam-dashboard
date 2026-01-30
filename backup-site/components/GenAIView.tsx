'use client';

import { useState, useRef, useEffect } from 'react';

interface GeneratedKPI {
  label: string;
  value: string;
  trend?: string;
  color?: string;
}

interface GeneratedChart {
  type: string;
  title: string;
  data?: any[];
}

interface GeneratedTable {
  title: string;
  columns: string[];
  sampleRows: string[][];
}

interface GeneratedAlert {
  severity: string;
  title: string;
  description: string;
}

interface GeneratedDashboard {
  title: string;
  description: string;
  kpis: GeneratedKPI[];
  charts: GeneratedChart[];
  tables: GeneratedTable[];
  alerts: GeneratedAlert[];
}

const examplePrompts = [
  "Create a PIAM dashboard for a corporate headquarters with 500 employees",
  "Build a security command center dashboard for a construction site",
  "Design a compliance monitoring dashboard for contractor management",
  "Create an executive summary dashboard for physical security operations",
];

export default function GenAIView() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [dashboard, setDashboard] = useState<GeneratedDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationPhase, setGenerationPhase] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const phases = [
    'Analyzing requirements...',
    'Designing KPI metrics...',
    'Creating visualizations...',
    'Building data tables...',
    'Adding alert rules...',
    'Finalizing dashboard...',
  ];

  useEffect(() => {
    if (isGenerating) {
      let phaseIndex = 0;
      const interval = setInterval(() => {
        setGenerationPhase(phases[phaseIndex % phases.length]);
        phaseIndex++;
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setStreamedContent('');
    setDashboard(null);
    setError(null);

    try {
      const response = await fetch('/api/generate-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error('Failed to generate');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamedContent(fullContent);
              }
            } catch {}
          }
        }
      }

      try {
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setDashboard(parsed);
        }
      } catch (e) {
        setError('Could not parse dashboard specification');
      }
    } catch (e) {
      setError('Failed to generate dashboard. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationPhase('');
    }
  };

  const severityColors: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    info: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-2xl">✨</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Dashboard Builder</h2>
            <p className="text-purple-200 text-sm">Describe your dashboard and watch AI build it</p>
          </div>
        </div>

        <div className="space-y-4">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the PIAM dashboard you want to create..."
            className="w-full h-24 p-4 rounded-lg bg-white/10 text-white placeholder-purple-200 border border-white/20 focus:border-white/40 focus:outline-none resize-none"
            disabled={isGenerating}
          />

          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(example)}
                className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                disabled={isGenerating}
              >
                {example.slice(0, 40)}...
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span>{generationPhase || 'Generating...'}</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Generate Dashboard</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-purple-600">🤖</span>
            </div>
            <div className="text-sm text-gray-600">{generationPhase}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-600 max-h-40 overflow-y-auto">
            {streamedContent || 'Waiting for AI response...'}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {dashboard && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{dashboard.title}</h3>
                <p className="text-sm text-gray-500">{dashboard.description}</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                AI Generated
              </span>
            </div>
          </div>

          {dashboard.kpis && dashboard.kpis.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dashboard.kpis.map((kpi, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600">{kpi.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                  {kpi.trend && (
                    <div className={`text-xs ${kpi.color === 'red' ? 'text-red-600' : kpi.color === 'green' ? 'text-green-600' : 'text-gray-500'}`}>
                      {kpi.trend}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {dashboard.charts && dashboard.charts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard.charts.map((chart, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">{chart.title}</h4>
                  <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl mb-2">📊</div>
                      <div className="text-xs text-gray-500">{chart.type} chart</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {dashboard.alerts && dashboard.alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-600 mb-3">Alert Rules</h4>
              <div className="space-y-2">
                {dashboard.alerts.map((alert, idx) => {
                  const colors = severityColors[alert.severity?.toLowerCase()] || severityColors.info;
                  return (
                    <div key={idx} className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
                      <div className={`font-medium ${colors.text}`}>{alert.title}</div>
                      <div className="text-sm text-gray-600">{alert.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {dashboard.tables && dashboard.tables.length > 0 && (
            <div className="space-y-4">
              {dashboard.tables.map((table, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-600">{table.title}</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {table.columns.map((col, colIdx) => (
                            <th key={colIdx} className="px-4 py-2 text-left text-gray-600 font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.sampleRows?.map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-t border-gray-200">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="px-4 py-2 text-gray-900">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
