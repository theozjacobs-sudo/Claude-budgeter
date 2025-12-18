import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PAYCHECK, PAYDATES, MONTHS, DEFAULT_ONE_TIME_EXPENSES } from '../constants/budget';

function ParametersCard({ params, onChange }) {
  const { startingCash, monthlySpend, bonus, bonusMonth, subletterAmount } = params;

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
      <h2 className="font-semibold text-sm">Parameters</h2>
      <div>
        <label className="text-xs text-gray-500">Starting cash</label>
        <input
          type="number"
          value={startingCash}
          onChange={e => onChange('startingCash', +e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">Monthly spend</label>
        <input
          type="number"
          value={monthlySpend}
          onChange={e => onChange('monthlySpend', +e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">Bonus amount</label>
        <input
          type="number"
          value={bonus}
          onChange={e => onChange('bonus', +e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">Bonus month</label>
        <select
          value={bonusMonth}
          onChange={e => onChange('bonusMonth', e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          {MONTHS.slice(1).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Subletter $</label>
        <input
          type="number"
          value={subletterAmount}
          onChange={e => onChange('subletterAmount', +e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
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
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h2 className="font-semibold text-sm mb-2">One-Time Expenses</h2>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {expenses.map(e => (
          <div key={e.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={e.enabled}
              onChange={() => onToggle(e.id)}
              className="shrink-0"
            />
            <span className={`flex-1 truncate ${!e.enabled && 'text-gray-400 line-through'}`}>
              {e.name}
            </span>
            <span className={`text-xs shrink-0 ${e.priority === 'must' ? 'text-red-600' : 'text-gray-500'}`}>
              ${e.amount}
            </span>
            <span className="text-xs text-gray-400 shrink-0">{e.month}</span>
            {e.priority === 'custom' && (
              <button
                onClick={() => onRemove(e.id)}
                className="text-red-400 text-xs shrink-0 hover:text-red-600"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t flex flex-wrap gap-1">
        <input
          placeholder="Name"
          value={newExpense.name}
          onChange={e => setNewExpense(p => ({ ...p, name: e.target.value }))}
          className="flex-1 min-w-[80px] border rounded px-2 py-1 text-xs"
        />
        <input
          placeholder="$"
          type="number"
          value={newExpense.amount}
          onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))}
          className="w-16 border rounded px-2 py-1 text-xs"
        />
        <select
          value={newExpense.month}
          onChange={e => setNewExpense(p => ({ ...p, month: e.target.value }))}
          className="border rounded px-1 text-xs"
        >
          {MONTHS.slice(1).map(m => <option key={m}>{m}</option>)}
        </select>
        <button
          onClick={handleAdd}
          className="bg-blue-500 text-white px-2 rounded text-xs hover:bg-blue-600 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function MonthlyTable({ projection }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h2 className="font-semibold text-sm mb-2">Monthly Breakdown</h2>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs min-w-[400px]">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-1">Month</th>
              <th className="text-right">Income</th>
              <th className="text-right">Expenses</th>
              <th className="text-right">Net</th>
              <th className="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {projection.map((row, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1">{row.month}</td>
                <td className="text-right text-green-600">${row.income.toLocaleString()}</td>
                <td className="text-right text-red-600">${row.expenses.toLocaleString()}</td>
                <td className={`text-right ${row.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {row.net >= 0 ? '+' : ''}${row.net.toLocaleString()}
                </td>
                <td className={`text-right font-medium ${row.balance < 0 ? 'text-red-600' : ''}`}>
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

export default function YearlyProjection() {
  const [params, setParams] = useState({
    startingCash: 1500,
    monthlySpend: 6400,
    bonus: 12000,
    bonusMonth: 'Jan',
    subletterMonths: ['Feb'],
    subletterAmount: 2000,
  });

  const [expenses, setExpenses] = useState(DEFAULT_ONE_TIME_EXPENSES);

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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
        <h1 className="text-xl font-bold">2025/26 Projection</h1>
        <div className="text-right">
          <div className={`text-2xl font-bold ${endBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${endBalance.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Dec '26 balance</div>
        </div>
      </div>

      {/* Warning */}
      {lowestPoint < 0 && (
        <div className="bg-red-100 border border-red-300 rounded p-3 text-red-800 text-sm">
          Warning: You'll go negative (lowest: ${lowestPoint.toLocaleString()})
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={projection}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Parameters and Expenses - Stack on mobile, side by side on desktop */}
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
    </div>
  );
}
