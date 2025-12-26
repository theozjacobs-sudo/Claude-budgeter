import { useState, useEffect } from 'react';

const BALANCE_STORAGE_KEY = 'budget-planner-balances';

function BalanceEntry({ entry, onDelete }) {
  const date = new Date(entry.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const totalBalance = entry.checking - entry.creditCard;
  const netPositive = totalBalance >= 0;

  return (
    <div className="glass-card rounded-xl p-4 group hover:scale-[1.02] transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="text-sm text-gray-400">{formattedDate}</div>
        <button
          onClick={onDelete}
          className="text-xs text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-all"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Checking</div>
          <div className="text-lg font-semibold text-emerald-400">
            ${entry.checking.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Credit Card</div>
          <div className="text-lg font-semibold text-red-400">
            ${entry.creditCard.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Net Balance</span>
          <span className={`text-lg font-bold ${netPositive ? 'gradient-text' : 'gradient-text-red'}`}>
            ${Math.abs(totalBalance).toFixed(2)} {!netPositive && 'in debt'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BalanceTracker() {
  const [balances, setBalances] = useState(() => {
    const saved = localStorage.getItem(BALANCE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [newEntry, setNewEntry] = useState({
    checking: '',
    creditCard: ''
  });

  // Save to localStorage whenever balances change
  useEffect(() => {
    localStorage.setItem(BALANCE_STORAGE_KEY, JSON.stringify(balances));
  }, [balances]);

  const handleAddBalance = () => {
    const checking = parseFloat(newEntry.checking);
    const creditCard = parseFloat(newEntry.creditCard);

    if (isNaN(checking) || isNaN(creditCard)) {
      alert('Please enter valid numbers for both balances');
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      checking,
      creditCard
    };

    setBalances(prev => [entry, ...prev]);
    setNewEntry({ checking: '', creditCard: '' });
  };

  const handleDeleteEntry = (id) => {
    setBalances(prev => prev.filter(entry => entry.id !== id));
  };

  // Calculate trends if we have multiple entries
  const trend = balances.length >= 2 ? {
    checkingChange: balances[0].checking - balances[1].checking,
    creditCardChange: balances[0].creditCard - balances[1].creditCard,
  } : null;

  return (
    <div className="space-y-4">
      {/* Add Balance Card */}
      <div className="glass-card rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">Add Balance Entry</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Checking Account Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newEntry.checking}
                onChange={e => setNewEntry(p => ({ ...p, checking: e.target.value }))}
                className="w-full rounded-xl px-3 py-2.5 text-sm pl-7"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Credit Card Balance</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newEntry.creditCard}
                onChange={e => setNewEntry(p => ({ ...p, creditCard: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddBalance()}
                className="w-full rounded-xl px-3 py-2.5 text-sm pl-7"
              />
            </div>
          </div>

          <button
            onClick={handleAddBalance}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            Add Entry
          </button>
        </div>
      </div>

      {/* Trend Summary (if available) */}
      {trend && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Since Last Entry</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Checking Change</div>
              <div className={`text-lg font-semibold ${trend.checkingChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend.checkingChange >= 0 ? '+' : ''}${trend.checkingChange.toFixed(2)}
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Credit Card Change</div>
              <div className={`text-lg font-semibold ${trend.creditCardChange <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend.creditCardChange >= 0 ? '+' : ''}${trend.creditCardChange.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Balance History */}
      {balances.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white px-1">Balance History</h3>
          {balances.map(entry => (
            <BalanceEntry
              key={entry.id}
              entry={entry}
              onDelete={() => handleDeleteEntry(entry.id)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="text-gray-400 mb-2">No balance entries yet</div>
          <div className="text-sm text-gray-500">Add your first entry to start tracking your balances over time</div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-300">
        <span className="font-semibold">Tip:</span> Add an entry once a week to track your financial progress over time. Net balance = Checking - Credit Card debt.
      </div>
    </div>
  );
}
