import { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PAYCHECK, PAYDATES, MONTHS, DEFAULT_ONE_TIME_EXPENSES } from '../constants/budget';

const STORAGE_KEY = 'budget-planner-data';

function ParametersCard({ params, onChange }) {
  const { startingCash, monthlySpend, bonus, bonusMonth, subletterAmount } = params;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <h2 className="font-semibold text-sm text-white">Parameters</h2>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Starting cash</label>
        <input
          type="number"
          value={startingCash}
          onChange={e => onChange('startingCash', +e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Monthly spend</label>
        <input
          type="number"
          value={monthlySpend}
          onChange={e => onChange('monthlySpend', +e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Bonus amount</label>
        <input
          type="number"
          value={bonus}
          onChange={e => onChange('bonus', +e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Bonus month</label>
        <select
          value={bonusMonth}
          onChange={e => onChange('bonusMonth', e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm"
        >
          {MONTHS.slice(1).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Subletter $</label>
        <input
          type="number"
          value={subletterAmount}
          onChange={e => onChange('subletterAmount', +e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

function ExpensesCard({ expenses, onToggle, onRemove, onAdd }) {
  const [newExpense, setNewExpense] = useState({ name: '', amount: '', month: 'Jan' });

  const handleAdd = () => {
    if (newExpense.name && newExpense.amount) {
      onAdd({
        id: Date.now(),
        name: newExpense.name,
        amount: parseFloat(newExpense.amount),
        month: newExpense.month,
        enabled: true,
        priority: 'custom'
      });
      setNewExpense({ name: '', amount: '', month: 'Jan' });
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <h2 className="font-semibold text-sm mb-3 text-white">One-Time Expenses</h2>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {expenses.map(e => (
          <div key={e.id} className="flex items-center gap-2 text-sm group">
            <input
              type="checkbox"
              checked={e.enabled}
              onChange={() => onToggle(e.id)}
              className="shrink-0"
            />
            <span className={`flex-1 truncate ${!e.enabled ? 'text-gray-600 line-through' : 'text-gray-300'}`}>
              {e.name}
            </span>
            <span className={`text-xs shrink-0 font-medium ${e.priority === 'must' ? 'text-red-400' : 'text-gray-500'}`}>
              ${e.amount}
            </span>
            <span className="text-xs text-indigo-400 shrink-0 bg-indigo-500/10 px-2 py-0.5 rounded-full">{e.month}</span>
            {e.priority === 'custom' && (
              <button
                onClick={() => onRemove(e.id)}
                className="text-red-400 text-sm shrink-0 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center hover:bg-red-500/10 rounded"
              >
                x
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-2">
        <input
          placeholder="Expense name"
          value={newExpense.name}
          onChange={e => setNewExpense(p => ({ ...p, name: e.target.value }))}
          className="flex-1 min-w-[100px] rounded-xl px-3 py-2 text-sm"
        />
        <input
          placeholder="$"
          type="number"
          value={newExpense.amount}
          onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))}
          className="w-20 rounded-xl px-3 py-2 text-sm"
        />
        <select
          value={newExpense.month}
          onChange={e => setNewExpense(p => ({ ...p, month: e.target.value }))}
          className="rounded-xl px-2 py-2 text-sm"
        >
          {MONTHS.slice(1).map(m => <option key={m}>{m}</option>)}
        </select>
        <button
          onClick={handleAdd}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}

function MonthlyTable({ projection }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h2 className="font-semibold text-sm mb-3 text-white">Monthly Breakdown</h2>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-xs min-w-[400px]">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/10">
              <th className="py-2 font-medium">Month</th>
              <th className="text-right font-medium">Income</th>
              <th className="text-right font-medium">Expenses</th>
              <th className="text-right font-medium">Net</th>
              <th className="text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {projection.map((row, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-2.5 text-gray-300">{row.month}</td>
                <td className="text-right text-emerald-400">${row.income.toLocaleString()}</td>
                <td className="text-right text-red-400">${row.expenses.toLocaleString()}</td>
                <td className={`text-right font-medium ${row.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {row.net >= 0 ? '+' : ''}${row.net.toLocaleString()}
                </td>
                <td className={`text-right font-semibold ${row.balance < 0 ? 'text-red-400' : 'text-white'}`}>
                  ${row.balance.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card rounded-lg p-3 text-sm">
        <p className="text-white font-medium mb-1">{label}</p>
        <p className="text-indigo-400">Balance: ${payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
}

export default function YearlyProjection() {
  const [params, setParams] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return data.params || {
        startingCash: 1500,
        monthlySpend: 6400,
        bonus: 12000,
        bonusMonth: 'Jan',
        subletterMonths: ['Feb'],
        subletterAmount: 2000,
      };
    }
    return {
      startingCash: 1500,
      monthlySpend: 6400,
      bonus: 12000,
      bonusMonth: 'Jan',
      subletterMonths: ['Feb'],
      subletterAmount: 2000,
    };
  });

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return data.expenses || DEFAULT_ONE_TIME_EXPENSES;
    }
    return DEFAULT_ONE_TIME_EXPENSES;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ params, expenses }));
  }, [params, expenses]);

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const toggleExpense = (id) => {
    setExpenses(prev => prev.map(e =>
      e.id === id ? { ...e, enabled: !e.enabled } : e
    ));
  };

  const removeExpense = (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addExpense = (expense) => {
    setExpenses(prev => [...prev, expense]);
  };

  const projection = useMemo(() => {
    const data = [];
    let balance = params.startingCash;

    for (let i = 0; i < 13; i++) {
      const monthName = MONTHS[i];
      const year = i === 0 ? 2025 : 2026;
      const monthNum = i === 0 ? 11 : i - 1;

      const paychecks = PAYDATES.filter(d => {
        const date = new Date(d);
        return date.getMonth() === monthNum && date.getFullYear() === year;
      }).length;

      const paycheckIncome = paychecks * PAYCHECK;
      const bonusIncome = monthName === params.bonusMonth ? params.bonus : 0;
      const subletterIncome = params.subletterMonths.includes(monthName) ? params.subletterAmount : 0;
      const totalIncome = paycheckIncome + bonusIncome + subletterIncome;

      const oneTimeThisMonth = expenses
        .filter(e => e.enabled && e.month === monthName)
        .reduce((sum, e) => sum + e.amount, 0);
      const totalExpenses = params.monthlySpend + oneTimeThisMonth;

      const net = totalIncome - totalExpenses;
      balance += net;

      data.push({
        month: monthName + (i === 0 ? " '25" : ''),
        balance: Math.round(balance),
        income: Math.round(totalIncome),
        expenses: Math.round(totalExpenses),
        net: Math.round(net)
      });
    }
    return data;
  }, [params, expenses]);

  const lowestPoint = Math.min(...projection.map(p => p.balance));
  const endBalance = projection[projection.length - 1].balance;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <h1 className="text-xl font-bold text-white">2025/26 Projection</h1>
        <div className="glass-card rounded-xl px-4 py-3 text-right">
          <div className={`text-2xl font-bold ${endBalance >= 0 ? 'gradient-text' : 'gradient-text-red'}`}>
            ${endBalance.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Dec '26 balance</div>
        </div>
      </div>

      {/* Warning */}
      {lowestPoint < 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm glow-red">
          <span className="font-semibold">Warning:</span> You'll go negative (lowest: ${lowestPoint.toLocaleString()})
        </div>
      )}

      {/* Chart */}
      <div className="glass-card rounded-2xl p-5">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={projection}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#818cf8', strokeWidth: 0 }}
            />
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Parameters and Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ParametersCard params={params} onChange={handleParamChange} />
        <ExpensesCard
          expenses={expenses}
          onToggle={toggleExpense}
          onRemove={removeExpense}
          onAdd={addExpense}
        />
      </div>

      {/* Monthly Table */}
      <MonthlyTable projection={projection} />

      {/* Auto-save indicator */}
      <div className="text-center text-xs text-gray-600">
        Changes are automatically saved to your browser
      </div>
    </div>
  );
}
