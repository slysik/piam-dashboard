'use client';

interface TenantSelectorProps {
  value: 'acme' | 'buildright';
  onChange: (tenant: 'acme' | 'buildright') => void;
}

const tenants = [
  { id: 'acme' as const, name: 'Acme Corporate', description: 'Office complex' },
  { id: 'buildright' as const, name: 'BuildRight Construction', description: 'Active job site' },
];

export default function TenantSelector({ value, onChange }: TenantSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'acme' | 'buildright')}
      className="bg-white text-gray-900 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
    >
      {tenants.map((tenant) => (
        <option key={tenant.id} value={tenant.id}>
          {tenant.name}
        </option>
      ))}
    </select>
  );
}
