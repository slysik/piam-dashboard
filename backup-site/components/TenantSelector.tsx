/**
 * TenantSelector - Multi-Tenant Organization Dropdown
 *
 * This component provides a dropdown selector for switching between different
 * tenant organizations in the PIAM dashboard. It enables users to view data
 * for different companies/sites that the system manages, demonstrating the
 * multi-tenant architecture of the platform.
 *
 * @component
 * @example
 * <TenantSelector
 *   value={selectedTenant}
 *   onChange={(tenant) => setSelectedTenant(tenant)}
 * />
 *
 * Architecture Notes:
 * - Controlled component: value and onChange managed by parent
 * - Currently supports two demo tenants: 'acme' (corporate office) and 'buildright' (construction)
 * - Tenant IDs are typed as literal union for type safety
 * - Simple select element with focus ring matching brand colors
 * - Tenant metadata (name, description) available for future tooltip/display use
 *
 * Data Flow:
 * - value prop: Current selected tenant ID
 * - onChange callback: Notifies parent when selection changes
 * - Parent typically lifts this state to propagate across all dashboard components
 * - Changing tenant triggers data refresh in all tenant-aware components
 *
 * @param {TenantSelectorProps} props - Component props
 * @param {'acme' | 'buildright'} props.value - Currently selected tenant ID
 * @param {(tenant: 'acme' | 'buildright') => void} props.onChange - Selection change callback
 */
'use client';

/**
 * Props for the TenantSelector component
 */
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
