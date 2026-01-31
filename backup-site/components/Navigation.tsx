'use client';

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
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="w-full px-6">
        <div className="flex space-x-1">
          {visibleTabs.map((tab) => (
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
      </div>
    </nav>
  );
}
