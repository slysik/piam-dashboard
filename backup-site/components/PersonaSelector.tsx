/**
 * PersonaSelector - User Persona/Role Dropdown Selector
 *
 * This component provides a dropdown for switching between different user
 * personas (roles) in the dashboard. Each persona has different dashboard
 * views and features tailored to their job function, demonstrating the
 * platform's role-based access and customized experience capabilities.
 *
 * @component
 * @example
 * <PersonaSelector
 *   value={selectedPersona}
 *   onChange={(persona) => setSelectedPersona(persona)}
 * />
 *
 * Architecture Notes:
 * - Five persona types: ceo (Executive), soc (Security Operations Center),
 *   facilities, ithr (IT/HR), compliance
 * - Styled with gradient purple/indigo background for visual prominence
 * - Custom dropdown arrow icon overlays the select element
 * - Persona icons displayed as emoji in both selector and options
 * - Controlled component pattern with value/onChange props
 * - Persona type exported for use in parent components
 *
 * Data Flow:
 * - value prop: Current selected Persona type from parent state
 * - onChange callback: Notifies parent when persona selection changes
 * - Parent uses persona to filter visible navigation tabs and features
 * - personas array defines available roles with id, label, and icon
 *
 * @param {PersonaSelectorProps} props - Component props
 * @param {Persona} props.value - Currently selected persona
 * @param {(persona: Persona) => void} props.onChange - Selection change callback
 */
'use client';

/**
 * Available user persona/role types in the dashboard
 */
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
