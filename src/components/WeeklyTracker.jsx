import { useState } from 'react';
import { DEFAULT_WEEKLY_CATEGORIES, WEEKLY_DISCRETIONARY } from '../constants/budget';

function ProgressBar({ spent, budget }) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const over = spent > budget;

  let colorClass = 'bg-green-500';
  if (over) colorClass = 'bg-red-500';
  else if (pct > 80) colorClass = 'bg-yellow-500';

  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${colorClass}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function SpendingCategory({ category, spent, budget }) {
  const over = spent > budget;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{category}</span>
        <span className={over ? 'text-red-600 font-medium' : ''}>
          ${spent.toFixed(0)} / ${budget}
        </span>
      </div>
      <ProgressBar spent={spent} budget={budget} />
    </div>
  );
}

export default function WeeklyTracker() {
  const [categories, setCategories] = useState(DEFAULT_WEEKLY_CATEGORIES);
  const [spendEntry, setSpendEntry] = useState({ categoryId: 1, amount: '' });

  const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0);
  const remaining = totalBudget - totalSpent;

  const handleAddSpend = () => {
    const amount = parseFloat(spendEntry.amount);
    if (!amount || isNaN(amount)) return;

    setCategories(prev => prev.map(cat =>
      cat.id === spendEntry.categoryId
        ? { ...cat, spent: cat.spent + amount }
        : cat
    ));
    setSpendEntry(prev => ({ ...prev, amount: '' }));
  };

  const handleResetWeek = () => {
    setCategories(prev => prev.map(cat => ({ ...cat, spent: 0 })));
  };

  const handleBudgetChange = (id, newBudget) => {
    setCategories(prev => prev.map(c =>
      c.id === id ? { ...c, budget: parseFloat(newBudget) || 0 } : c
    ));
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">This Week</h2>
          <button
            onClick={handleResetWeek}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Reset Week
          </button>
        </div>
        <div className="text-xs text-gray-500 mb-4">
          Fixed costs (rent $2,425 + utils $200) already budgeted
        </div>

        {/* Remaining Display */}
        <div className={`text-center p-4 rounded-lg mb-4 ${remaining >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div
            className="text-3xl font-bold"
            style={{ color: remaining >= 0 ? '#16a34a' : '#dc2626' }}
          >
            ${remaining.toFixed(0)}
          </div>
          <div className="text-sm text-gray-500">remaining this week</div>
          <div className="text-xs text-gray-400 mt-1">
            ${totalSpent.toFixed(0)} spent of ${totalBudget} budget
          </div>
        </div>

        {/* Category Progress */}
        <div className="space-y-3">
          {categories.map(cat => (
            <SpendingCategory
              key={cat.id}
              category={cat.category}
              spent={cat.spent}
              budget={cat.budget}
            />
          ))}
        </div>
      </div>

      {/* Log Spending Card */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold text-sm mb-3">Log Spending</h3>
        <div className="flex gap-2">
          <select
            value={spendEntry.categoryId}
            onChange={e => setSpendEntry(p => ({ ...p, categoryId: parseInt(e.target.value) }))}
            className="flex-1 border rounded px-2 py-2 text-sm min-w-0"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.category}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="$"
            value={spendEntry.amount}
            onChange={e => setSpendEntry(p => ({ ...p, amount: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAddSpend()}
            className="w-20 border rounded px-2 py-2 text-sm"
          />
          <button
            onClick={handleAddSpend}
            className="bg-blue-500 text-white px-4 rounded text-sm hover:bg-blue-600 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Adjust Budgets Card */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold text-sm mb-3">Adjust Weekly Budgets</h3>
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2">
              <span className="text-xs flex-1">{cat.category}</span>
              <input
                type="number"
                value={cat.budget}
                onChange={e => handleBudgetChange(cat.id, e.target.value)}
                className="w-20 border rounded px-2 py-1 text-sm text-right"
              />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t mt-2">
            <span className="text-xs flex-1 font-medium">Weekly Discretionary</span>
            <span className="text-sm font-bold">${totalBudget}</span>
          </div>
          <div className="text-xs text-gray-500">
            Target: ~${WEEKLY_DISCRETIONARY}/week to hit $6,400/month
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
        <strong>Weekly check-in:</strong> Green = good. Yellow = slow down. Red = stop. Reset every Sunday.
      </div>
    </div>
  );
}
