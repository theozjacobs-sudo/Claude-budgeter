import { useState, useEffect } from 'react';
import { DEFAULT_WEEKLY_CATEGORIES, WEEKLY_DISCRETIONARY } from '../constants/budget';

const WEEKLY_STORAGE_KEY = 'budget-planner-weekly';

function ProgressBar({ spent, budget }) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const over = spent > budget;

  let gradientClass = 'from-emerald-400 to-green-500';
  if (over) gradientClass = 'from-red-400 to-rose-500';
  else if (pct > 80) gradientClass = 'from-amber-400 to-yellow-500';

  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-500`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function SpendingCategory({ category, spent, budget }) {
  const over = spent > budget;

  return (
    <div className="group">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-300 group-hover:text-white transition-colors">{category}</span>
        <span className={over ? 'text-red-400 font-semibold' : 'text-gray-400'}>
          ${spent.toFixed(0)} <span className="text-gray-400">/</span> ${budget}
        </span>
      </div>
      <ProgressBar spent={spent} budget={budget} />
    </div>
  );
}

export default function WeeklyTracker() {
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem(WEEKLY_STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return data.categories || DEFAULT_WEEKLY_CATEGORIES;
    }
    return DEFAULT_WEEKLY_CATEGORIES;
  });
  const [spendEntry, setSpendEntry] = useState({ categoryId: 1, amount: '' });

  // Save to localStorage whenever categories change
  useEffect(() => {
    localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify({ categories }));
  }, [categories]);

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
      <div className="glass-card rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-white">This Week</h2>
          <button
            onClick={handleResetWeek}
            className="text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1 rounded-lg hover:bg-red-500/10 transition-all"
          >
            Reset Week
          </button>
        </div>
        <div className="text-xs text-gray-400 mb-5">
          Fixed costs (rent $2,425 + utils $200) already budgeted
        </div>

        {/* Remaining Display */}
        <div className={`text-center p-6 rounded-xl mb-5 ${remaining >= 0 ? 'bg-emerald-500/10 glow-green' : 'bg-red-500/10 glow-red'}`}>
          <div className={`text-4xl font-bold ${remaining >= 0 ? 'gradient-text' : 'gradient-text-red'}`}>
            ${remaining.toFixed(0)}
          </div>
          <div className="text-sm text-gray-400 mt-1">remaining this week</div>
          <div className="text-xs text-gray-400 mt-2">
            ${totalSpent.toFixed(0)} spent of ${totalBudget} budget
          </div>
        </div>

        {/* Category Progress */}
        <div className="space-y-4">
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
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-4 text-white">Log Spending</h3>
        <div className="flex gap-2">
          <select
            value={spendEntry.categoryId}
            onChange={e => setSpendEntry(p => ({ ...p, categoryId: parseInt(e.target.value) }))}
            className="flex-1 rounded-xl px-3 py-2.5 text-sm min-w-0"
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
            className="w-24 rounded-xl px-3 py-2.5 text-sm"
          />
          <button
            onClick={handleAddSpend}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all"
          >
            +
          </button>
        </div>
      </div>

      {/* Adjust Budgets Card */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-4 text-white">Adjust Weekly Budgets</h3>
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 flex-1">{cat.category}</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={cat.budget}
                  onChange={e => handleBudgetChange(cat.id, e.target.value)}
                  className="w-24 rounded-xl px-3 py-2 text-sm text-right pl-7"
                />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-3 border-t border-white/10 mt-3">
            <span className="text-sm flex-1 font-medium text-white">Weekly Discretionary</span>
            <span className="text-lg font-bold text-indigo-400">${totalBudget}</span>
          </div>
          <div className="text-xs text-gray-400">
            Target: ~${WEEKLY_DISCRETIONARY}/week to hit $6,400/month
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-300">
        <span className="font-semibold">Weekly check-in:</span> Green = good. Yellow = slow down. Red = stop. Reset every Sunday.
      </div>
    </div>
  );
}
