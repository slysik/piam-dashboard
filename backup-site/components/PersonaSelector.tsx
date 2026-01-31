'use client';

export type Persona = 'ceo' | 'soc' | 'facilities' | 'ithr' | 'compliance';

interface PersonaSelectorProps {
  value: Persona;
  onChange: (persona: Persona) => void;
}

const personas: { id: Persona; label: string; icon: string }[] = [
  { id: 'ceo', label: 'Executive', icon: '👔' },
  { id: 'soc', label: 'SOC', icon: '🛡️' },
  { id: 'facilities', label: 'Facilities', icon: '🏢' },
  { id: 'ithr', label: 'IT/HR', icon: '👤' },
  { id: 'compliance', label: 'Compliance', icon: '📋' },
];

export default function PersonaSelector({ value, onChange }: PersonaSelectorProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Persona)}
        className="appearance-none bg-gradient-to-r from-indigo-600 to-purple-600 text-white pl-3 pr-8 py-1.5 rounded-lg text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {personas.map((p) => (
          <option key={p.id} value={p.id} className="bg-gray-800 text-white">
            {p.icon} {p.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
