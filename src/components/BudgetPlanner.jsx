import { useState } from 'react';
import WeeklyTracker from './WeeklyTracker';
import YearlyProjection from './YearlyProjection';
import BankStatements from './BankStatements';
import BalanceTracker from './BalanceTracker';

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg glow-blue'
          : 'glass-card text-gray-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function BudgetPlanner() {
  const [activeTab, setActiveTab] = useState('weekly');

  return (
    <div className="p-4 sm:p-6 space-y-6 min-h-screen max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          Budget Planner
        </h1>
        <p className="text-gray-400 text-sm">Track spending, plan your future</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-3 justify-center flex-wrap">
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
        <TabButton
          active={activeTab === 'balances'}
          onClick={() => setActiveTab('balances')}
        >
          Balance Tracker
        </TabButton>
        <TabButton
          active={activeTab === 'statements'}
          onClick={() => setActiveTab('statements')}
        >
          Statements
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'weekly' && <WeeklyTracker />}
      {activeTab === 'projection' && <YearlyProjection />}
      {activeTab === 'balances' && <BalanceTracker />}
      {activeTab === 'statements' && <BankStatements />}
    </div>
  );
}
