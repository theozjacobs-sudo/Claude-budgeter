import { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const STORAGE_KEY = 'budget-planner-transactions';
const FIXED_EXPENSES_KEY = 'budget-planner-fixed-expenses';

// Default fixed expenses
const DEFAULT_FIXED_EXPENSES = [
  { id: 1, name: 'Rent', amount: 2425, color: '#6366f1' },
  { id: 2, name: 'Utilities', amount: 200, color: '#8b5cf6' },
  { id: 3, name: 'Internet', amount: 60, color: '#a855f7' },
  { id: 4, name: 'Phone', amount: 45, color: '#d946ef' },
  { id: 5, name: 'Insurance', amount: 150, color: '#ec4899' },
];

// Category definitions with keywords for auto-categorization
const CATEGORIES = {
  'Groceries': ['grocery', 'safeway', 'trader joe', 'whole foods', 'kroger', 'walmart', 'target', 'costco', 'aldi', 'publix', 'wegmans', 'heb', 'food', 'market'],
  'Dining': ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'chipotle', 'doordash', 'uber eats', 'grubhub', 'seamless', 'postmates', 'pizza', 'burger', 'taco', 'sushi', 'thai', 'indian', 'chinese', 'mexican'],
  'Transport': ['uber', 'lyft', 'gas', 'shell', 'chevron', 'exxon', 'bp', 'parking', 'transit', 'metro', 'subway', 'bart', 'caltrain', 'amtrak'],
  'Shopping': ['amazon', 'ebay', 'etsy', 'clothing', 'shoes', 'nordstrom', 'macys', 'gap', 'old navy', 'zara', 'h&m', 'uniqlo', 'best buy', 'apple store'],
  'Entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'hbo', 'movie', 'theater', 'concert', 'ticket', 'game', 'steam', 'playstation', 'xbox'],
  'Health': ['pharmacy', 'cvs', 'walgreens', 'doctor', 'medical', 'hospital', 'dental', 'vision', 'gym', 'fitness'],
  'Bills': ['electric', 'water', 'gas bill', 'internet', 'phone', 'verizon', 'at&t', 't-mobile', 'comcast', 'insurance'],
  'Subscriptions': ['subscription', 'monthly', 'annual', 'membership', 'patreon', 'substack'],
  'Bars': ['bar', 'pub', 'brewery', 'tavern', 'wine', 'liquor', 'beer', 'cocktail'],
  'Travel': ['airline', 'hotel', 'airbnb', 'vrbo', 'booking', 'expedia', 'flight', 'united', 'delta', 'american airlines', 'southwest'],
  'Other': []
};

const CATEGORY_COLORS = {
  'Groceries': '#22c55e',
  'Dining': '#f97316',
  'Transport': '#3b82f6',
  'Shopping': '#ec4899',
  'Entertainment': '#8b5cf6',
  'Health': '#14b8a6',
  'Bills': '#64748b',
  'Subscriptions': '#6366f1',
  'Bars': '#eab308',
  'Travel': '#06b6d4',
  'Other': '#9ca3af',
};

function categorizeTransaction(description) {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category;
    }
  }
  return 'Other';
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Try to detect header row and column positions
  const header = lines[0].toLowerCase();
  const transactions = [];

  // Common CSV formats: Date, Description, Amount or Date, Description, Debit, Credit
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle quoted CSV fields
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    if (fields.length >= 3) {
      // Try to find date, description, and amount
      let date = null;
      let description = '';
      let amount = 0;

      for (const field of fields) {
        // Check if it's a date
        if (!date && /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(field)) {
          date = field;
        }
        // Check if it's an amount (negative for expenses)
        else if (/^-?\$?[\d,]+\.?\d*$/.test(field.replace(/[()]/g, ''))) {
          const numStr = field.replace(/[$,()]/g, '');
          const num = parseFloat(numStr);
          if (!isNaN(num)) {
            // Negative or in parentheses = expense
            amount = field.includes('(') || field.includes('-') ? -Math.abs(num) : num;
          }
        }
        // Otherwise it's probably the description
        else if (field.length > 2 && !date) {
          description = field;
        } else if (field.length > description.length) {
          description = field;
        }
      }

      if (date && description && amount !== 0) {
        transactions.push({
          id: Date.now() + i,
          date,
          description,
          amount,
          category: categorizeTransaction(description),
        });
      }
    }
  }

  return transactions;
}

function FileUpload({ onUpload }) {
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const transactions = parseCSV(e.target.result);
        onUpload(transactions);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  return (
    <div
      className={`glass-card rounded-2xl p-8 text-center border-2 border-dashed transition-all ${
        dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/20'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="text-4xl mb-4">📄</div>
      <h3 className="text-lg font-semibold text-white mb-2">Upload Bank Statement</h3>
      <p className="text-gray-400 text-sm mb-4">
        Drag & drop a CSV file or click to browse
      </p>
      <label className="inline-block bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-xl cursor-pointer hover:shadow-lg hover:scale-105 transition-all">
        Choose File
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
        />
      </label>
      <p className="text-gray-500 text-xs mt-4">
        Supports CSV exports from most banks (Chase, Bank of America, Wells Fargo, etc.)
      </p>
    </div>
  );
}

function TransactionList({ transactions, onUpdateCategory, onDelete }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter(t => t.category === filter);

  const expenses = filtered.filter(t => t.amount < 0);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-white">Transactions ({expenses.length})</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl px-3 py-1.5 text-sm"
        >
          <option value="all">All Categories</option>
          {Object.keys(CATEGORIES).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {expenses.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No transactions to show</p>
        ) : (
          expenses.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 group">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[t.category] }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-300 truncate">{t.description}</div>
                <div className="text-xs text-gray-500">{t.date}</div>
              </div>
              <select
                value={t.category}
                onChange={(e) => onUpdateCategory(t.id, e.target.value)}
                className="text-xs rounded-lg px-2 py-1 bg-white/5 border-none"
              >
                {Object.keys(CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="text-red-400 font-medium text-sm w-20 text-right">
                ${Math.abs(t.amount).toFixed(2)}
              </div>
              <button
                onClick={() => onDelete(t.id)}
                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SpendingChart({ transactions }) {
  const categoryTotals = useMemo(() => {
    const totals = {};
    transactions
      .filter(t => t.amount < 0)
      .forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
      });

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        color: CATEGORY_COLORS[name],
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalSpent = categoryTotals.reduce((sum, c) => sum + c.value, 0);

  if (categoryTotals.length === 0) {
    return null;
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold text-white mb-4">Spending by Category</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={categoryTotals}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {categoryTotals.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(value) => [`$${value.toFixed(2)}`, '']}
              labelStyle={{ color: 'white' }}
              itemStyle={{ color: '#e5e7eb' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2">
          {categoryTotals.slice(0, 6).map(cat => (
            <div key={cat.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="flex-1 text-sm text-gray-300">{cat.name}</span>
              <span className="text-sm font-medium text-white">${cat.value.toFixed(0)}</span>
              <span className="text-xs text-gray-500 w-12 text-right">
                {((cat.value / totalSpent) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
          {categoryTotals.length > 6 && (
            <div className="text-xs text-gray-500 pt-2">
              +{categoryTotals.length - 6} more categories
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
        <span className="text-gray-400">Total Spending</span>
        <span className="text-xl font-bold text-red-400">${totalSpent.toFixed(2)}</span>
      </div>
    </div>
  );
}

function SpendingInsights({ transactions }) {
  const insights = useMemo(() => {
    const expenses = transactions.filter(t => t.amount < 0);
    if (expenses.length === 0) return null;

    const total = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avgTransaction = total / expenses.length;

    // Find biggest expense
    const biggest = expenses.reduce((max, t) =>
      Math.abs(t.amount) > Math.abs(max.amount) ? t : max
    );

    // Category breakdown
    const categoryTotals = {};
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
    });
    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];

    // Daily spending
    const dailySpend = total / 30; // Rough estimate

    return { total, avgTransaction, biggest, topCategory, dailySpend, count: expenses.length };
  }, [transactions]);

  if (!insights) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-lg font-bold text-red-400">${insights.total.toFixed(0)}</div>
        <div className="text-xs text-gray-400">Total Spent</div>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-lg font-bold text-indigo-400">${insights.avgTransaction.toFixed(0)}</div>
        <div className="text-xs text-gray-400">Avg Transaction</div>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-lg font-bold text-yellow-400">${insights.dailySpend.toFixed(0)}</div>
        <div className="text-xs text-gray-400">Daily Average</div>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-lg font-bold text-emerald-400">{insights.count}</div>
        <div className="text-xs text-gray-400">Transactions</div>
      </div>
    </div>
  );
}

function FixedExpensesSection({ expenses, onUpdate }) {
  const totalFixed = expenses.reduce((sum, e) => sum + e.amount, 0);
  const [editing, setEditing] = useState(false);
  const [newExpense, setNewExpense] = useState({ name: '', amount: '' });

  const chartData = expenses.map(e => ({
    name: e.name,
    value: e.amount,
    color: e.color,
  }));

  const handleAmountChange = (id, value) => {
    const num = parseFloat(value) || 0;
    onUpdate(expenses.map(e => e.id === id ? { ...e, amount: num } : e));
  };

  const handleAddExpense = () => {
    if (newExpense.name && newExpense.amount) {
      const colors = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#06b6d4'];
      onUpdate([
        ...expenses,
        {
          id: Date.now(),
          name: newExpense.name,
          amount: parseFloat(newExpense.amount) || 0,
          color: colors[expenses.length % colors.length],
        }
      ]);
      setNewExpense({ name: '', amount: '' });
    }
  };

  const handleRemove = (id) => {
    onUpdate(expenses.filter(e => e.id !== id));
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-white">Monthly Fixed Expenses</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-500/10"
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stacked bar visualization */}
        <div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[{ name: 'Fixed', ...Object.fromEntries(expenses.map(e => [e.name, e.amount])) }]} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                contentStyle={{ background: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                formatter={(value) => [`$${value}`, '']}
                labelStyle={{ color: 'white' }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              {expenses.map((expense) => (
                <Bar key={expense.id} dataKey={expense.name} stackId="a" fill={expense.color} />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* Breakdown below chart */}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {expenses.map(e => (
              <div key={e.id} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="text-gray-400">{e.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense list */}
        <div className="space-y-2">
          {expenses.map(e => (
            <div key={e.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
              <span className="flex-1 text-sm text-gray-300">{e.name}</span>
              {editing ? (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={e.amount}
                    onChange={(ev) => handleAmountChange(e.id, ev.target.value)}
                    className="w-20 rounded-lg px-2 py-1 text-sm text-right"
                  />
                  <button
                    onClick={() => handleRemove(e.id)}
                    className="text-red-400 hover:text-red-300 ml-1"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <span className="text-sm font-medium text-white">${e.amount}</span>
              )}
            </div>
          ))}

          {/* Add new expense */}
          {editing && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/10 mt-2">
              <input
                type="text"
                placeholder="Name"
                value={newExpense.name}
                onChange={(ev) => setNewExpense(p => ({ ...p, name: ev.target.value }))}
                className="flex-1 rounded-lg px-2 py-1 text-sm"
              />
              <span className="text-gray-500">$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={newExpense.amount}
                onChange={(ev) => setNewExpense(p => ({ ...p, amount: ev.target.value }))}
                className="w-16 rounded-lg px-2 py-1 text-sm text-right"
              />
              <button
                onClick={handleAddExpense}
                className="bg-indigo-500 text-white px-2 py-1 rounded-lg text-sm hover:bg-indigo-400"
              >
                +
              </button>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-3">
            <span className="font-medium text-white">Total Fixed</span>
            <span className="text-xl font-bold text-indigo-400">${totalFixed.toLocaleString()}</span>
          </div>

          <div className="text-xs text-gray-500">
            Variable budget remaining: ${(6400 - totalFixed).toLocaleString()}/month
          </div>
        </div>
      </div>
    </div>
  );
}

function TopSpendingWarnings({ transactions, monthlyBudget = 6400 }) {
  const categoryTotals = useMemo(() => {
    const totals = {};
    transactions
      .filter(t => t.amount < 0)
      .forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
      });
    return totals;
  }, [transactions]);

  // Define budget targets (rough percentages of monthly budget)
  const budgetTargets = {
    'Groceries': monthlyBudget * 0.12,
    'Dining': monthlyBudget * 0.08,
    'Bars': monthlyBudget * 0.04,
    'Shopping': monthlyBudget * 0.08,
    'Entertainment': monthlyBudget * 0.05,
    'Transport': monthlyBudget * 0.06,
  };

  const warnings = Object.entries(categoryTotals)
    .filter(([cat, amount]) => budgetTargets[cat] && amount > budgetTargets[cat])
    .map(([cat, amount]) => ({
      category: cat,
      spent: amount,
      budget: budgetTargets[cat],
      over: amount - budgetTargets[cat],
      pct: ((amount / budgetTargets[cat]) * 100).toFixed(0),
    }))
    .sort((a, b) => b.over - a.over);

  if (warnings.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
      <h3 className="font-semibold text-red-300 mb-3">Overspending Alerts</h3>
      <div className="space-y-2">
        {warnings.map(w => (
          <div key={w.category} className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{w.category}</span>
            <span className="text-red-400">
              ${w.spent.toFixed(0)} / ${w.budget.toFixed(0)} ({w.pct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BankStatements() {
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [fixedExpenses, setFixedExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(FIXED_EXPENSES_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_FIXED_EXPENSES;
    } catch {
      return DEFAULT_FIXED_EXPENSES;
    }
  });

  // Save fixed expenses to localStorage
  useEffect(() => {
    localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(fixedExpenses));
  }, [fixedExpenses]);

  const handleUpload = (newTransactions) => {
    setTransactions(prev => {
      const updated = [...prev, ...newTransactions];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateCategory = (id, category) => {
    setTransactions(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, category } : t);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleDelete = (id) => {
    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAll = () => {
    if (confirm('Clear all transactions?')) {
      setTransactions([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">Bank Statement Analysis</h1>
        {transactions.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-lg hover:bg-red-500/10"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Fixed Expenses Section */}
      <FixedExpensesSection expenses={fixedExpenses} onUpdate={setFixedExpenses} />

      <FileUpload onUpload={handleUpload} />

      {transactions.length > 0 && (
        <>
          <SpendingInsights transactions={transactions} />
          <TopSpendingWarnings transactions={transactions} />
          <SpendingChart transactions={transactions} />
          <TransactionList
            transactions={transactions}
            onUpdateCategory={handleUpdateCategory}
            onDelete={handleDelete}
          />
        </>
      )}

      <div className="text-center text-xs text-gray-400 space-y-1">
        <p>Your data stays in your browser - nothing is sent to any server</p>
        <p>Tip: Download CSV from your bank's website, usually under "Statements" or "Activity"</p>
      </div>
    </div>
  );
}
