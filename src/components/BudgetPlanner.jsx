import { useState } from 'react';
import WeeklyTracker from './WeeklyTracker';
import YearlyProjection from './YearlyProjection';

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

export default function BudgetPlanner() {
  const [activeTab, setActiveTab] = useState('weekly');

  return (
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen max-w-3xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex gap-2">
        <TabButton
          active={activeTab === 'weekly'}
          onClick={() => setActiveTab('weekly')}
        >
          Weekly Tracker
        </TabButton>
        <TabButton
          active={activeTab === 'projection'}
          onClick={() => setActiveTab('projection')}
        >
          Yearly Projection
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'weekly' ? <WeeklyTracker /> : <YearlyProjection />}
    </div>
  );
}
