/**
 * Navigation - Dashboard Tab Navigation Component
 *
 * This component renders a horizontal tab bar for navigating between
 * different dashboard views. It supports dynamic tab visibility based
 * on user persona and provides visual indication of the active tab
 * with an underline accent and background highlight.
 *
 * @component
 * @example
 * <Navigation
 *   activeTab="overview"
 *   onTabChange={(tabId) => setActiveTab(tabId)}
 *   visibleTabs={[
 *     { id: 'overview', label: 'Overview', icon: '📊' },
 *     { id: 'events', label: 'Events', icon: '📋' }
 *   ]}
 * />
 *
 * Architecture Notes:
 * - Tab visibility controlled by parent based on user persona/permissions
 * - Active tab indicated by blue border-bottom, text color, and background
 * - Icons appear before label text using emoji characters
 * - Consistent padding and spacing for touch-friendly click targets
 * - White background with bottom border matches dashboard design system
 * - Full-width container with horizontal padding for edge spacing
 *
 * Data Flow:
 * - visibleTabs: Array of Tab objects filtered by parent based on persona
 * - activeTab: String ID of currently selected tab from parent state
 * - onTabChange: Callback to notify parent when user clicks a different tab
 * - Parent typically uses this to conditionally render view components
 *
 * @param {NavigationProps} props - Component props
 * @param {string} props.activeTab - ID of the currently active tab
 * @param {(tab: string) => void} props.onTabChange - Callback when tab is clicked
 * @param {Tab[]} props.visibleTabs - Array of tabs to display
 */
'use client';

/**
 * Tab configuration for navigation
 */
interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  visibleTabs: Tab[];
}

export default function Navigation({ activeTab, onTabChange, visibleTabs }: NavigationProps) {
  // Separate Dashboard Builder (genai) from other tabs to render on far right
  const regularTabs = visibleTabs.filter(tab => tab.id !== 'genai');
  const dashboardBuilderTab = visibleTabs.find(tab => tab.id === 'genai');

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="w-full px-6">
        <div className="flex justify-between">
          {/* Left: Persona-specific tabs */}
          <div className="flex space-x-1">
            {regularTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Dashboard Builder (always visible, all personas) */}
          {dashboardBuilderTab && (
            <div className="flex">
              <button
                onClick={() => onTabChange(dashboardBuilderTab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === dashboardBuilderTab.id
                    ? 'border-purple-600 text-purple-600 bg-purple-50'
                    : 'border-transparent text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                }`}
              >
                <span className="mr-2">{dashboardBuilderTab.icon}</span>
                {dashboardBuilderTab.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
