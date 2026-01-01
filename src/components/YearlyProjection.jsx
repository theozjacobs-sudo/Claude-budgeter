import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, Cell, PieChart, Pie, Legend
} from 'recharts';
import { PAYCHECK, PAYDATES, MONTHS, DEFAULT_ONE_TIME_EXPENSES, FIXED_MONTHLY } from '../constants/budget';

const STORAGE_KEY = 'budget-planner-data';

function ParametersCard({ params, onChange }) {
  const { startingCash, monthlySpend, bonus, bonusMonth, subletterAmount, creditCardDebt } = params;

  // Handle input to avoid leading zeros
  const handleNumberChange = (key, value) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    onChange(key, isNaN(numValue) ? 0 : numValue);
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <h2 className="font-semibold text-sm text-white">Parameters</h2>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Starting cash</label>
        <input
          type="text"
          inputMode="numeric"
          value={startingCash || ''}
          onChange={e => handleNumberChange('startingCash', e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="0"
          className="w-full rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Current credit card debt</label>
        <input
          type="text"
          inputMode="numeric"
          value={creditCardDebt || ''}
          onChange={e => handleNumberChange('creditCardDebt', e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="0"
          className="w-full rounded-xl px-3 py-2 text-sm"
        />
        <div className="text-xs text-gray-400 mt-1">
          Existing debt to pay off
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Monthly spend</label>
        <input
          type="text"
          inputMode="numeric"
          value={monthlySpend || ''}
          onChange={e => handleNumberChange('monthlySpend', e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="0"
          className="w-full rounded-xl px-3 py-2 text-sm"
        />
        <div className="text-xs text-gray-400 mt-1">
          ~${Math.round(monthlySpend / 4.33)}/week
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Annual bonus</label>
        <input
          type="text"
          inputMode="numeric"
          value={bonus || ''}
          onChange={e => handleNumberChange('bonus', e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="0"
          className="w-full rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Bonus month</label>
        <select
          value={bonusMonth}
          onChange={e => onChange('bonusMonth', e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm"
        >
          {MONTHS.slice(1).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Subletter income</label>
        <input
          type="text"
          inputMode="numeric"
          value={subletterAmount || ''}
          onChange={e => handleNumberChange('subletterAmount', e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="0"
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
        status: 'upcoming', // new status field
        priority: 'custom'
      });
      setNewExpense({ name: '', amount: '', month: 'Jan' });
    }
  };

  const totalUpcoming = expenses.filter(e => e.status === 'upcoming').reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-sm text-white">One-Time Expenses</h2>
        <div className="text-xs space-y-0.5">
          <div className="text-indigo-400">${totalUpcoming.toLocaleString()} upcoming</div>
          {totalPaid > 0 && <div className="text-emerald-400">${totalPaid.toLocaleString()} paid</div>}
        </div>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {expenses.map(e => {
          const status = e.status || (e.enabled ? 'upcoming' : 'disabled'); // backwards compatibility
          return (
          <div key={e.id} className="flex items-center gap-2 text-sm group">
            <button
              onClick={() => onToggle(e.id)}
              className={`shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                status === 'upcoming' ? 'border-indigo-400 bg-indigo-500/20' :
                status === 'paid' ? 'border-emerald-400 bg-emerald-500/20' :
                'border-gray-600 bg-gray-700/20'
              }`}
              title={status === 'upcoming' ? 'Click to mark as paid' : status === 'paid' ? 'Click to disable' : 'Click to enable'}
            >
              {status === 'upcoming' && <span className="text-xs text-indigo-400">◉</span>}
              {status === 'paid' && <span className="text-xs text-emerald-400">✓</span>}
            </button>
            <span className={`flex-1 truncate ${
              status === 'paid' ? 'text-emerald-400/70' :
              status === 'disabled' ? 'text-gray-500 line-through' :
              'text-gray-300'
            }`}>
              {e.name}
            </span>
            <span className={`text-xs shrink-0 font-medium ${
              status === 'paid' ? 'text-emerald-400/70' :
              e.priority === 'must' ? 'text-red-400' :
              status === 'disabled' ? 'text-gray-500' :
              'text-gray-400'
            }`}>
              ${e.amount}
            </span>
            <span className={`text-xs shrink-0 px-2 py-0.5 rounded-full ${
              status === 'paid' ? 'text-emerald-400 bg-emerald-500/10' :
              status === 'disabled' ? 'text-gray-500 bg-gray-500/10' :
              'text-indigo-400 bg-indigo-500/20'
            }`}>{e.month}</span>
            {e.priority === 'custom' && (
              <button
                onClick={() => onRemove(e.id)}
                className="text-red-400 text-sm shrink-0 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center hover:bg-red-500/10 rounded"
              >
                ×
              </button>
            )}
          </div>
        );
        })}
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
          type="text"
          inputMode="numeric"
          value={newExpense.amount}
          onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value.replace(/[^0-9]/g, '') }))}
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
      <div className="text-xs text-gray-400 mt-3 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">◉</span>
          <span>Upcoming (counts toward projection)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          <span>Paid (already paid, for reference only)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">○</span>
          <span>Disabled (not applicable)</span>
        </div>
        <div className="text-xs text-gray-500 mt-2">Click the status icon to cycle through states</div>
      </div>
    </div>
  );
}

function MonthlyTable({ projection, bonusMonth, params }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h2 className="font-semibold text-sm mb-3 text-white">Monthly Breakdown</h2>
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr className="text-left text-gray-400 border-b border-white/10">
              <th className="py-2 font-medium">Month</th>
              <th className="text-right font-medium">Income</th>
              <th className="text-right font-medium">Fixed</th>
              <th className="text-right font-medium">Variable</th>
              <th className="text-right font-medium">Net</th>
              <th className="text-right font-medium">Balance</th>
              <th className="text-right font-medium">Investable</th>
            </tr>
          </thead>
          <tbody>
            {projection.map((row, i) => {
              const investable = row.balance > 1000 ? row.balance - 1000 : 0;
              const isBonus = row.hasBonus;
              return (
                <tr key={i} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${isBonus ? 'bg-yellow-500/5' : ''}`}>
                  <td className="py-2.5 text-gray-300">
                    {row.month}
                    {isBonus && <span className="ml-1 text-yellow-400">★</span>}
                  </td>
                  <td className="text-right text-emerald-400">${row.income.toLocaleString()}</td>
                  <td className="text-right text-gray-400">${FIXED_MONTHLY.toLocaleString()}</td>
                  <td className="text-right text-red-400">${(row.expenses - FIXED_MONTHLY).toLocaleString()}</td>
                  <td className={`text-right font-medium ${row.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {row.net >= 0 ? '+' : ''}${row.net.toLocaleString()}
                  </td>
                  <td className={`text-right font-semibold ${row.balance < 0 ? 'text-red-400' : 'text-white'}`}>
                    ${row.balance.toLocaleString()}
                  </td>
                  <td className="text-right text-indigo-400">
                    {investable > 0 ? `$${investable.toLocaleString()}` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-4 text-xs text-gray-400">
        <span><span className="text-yellow-400">★</span> = Bonus month</span>
        <span>Fixed = Rent + Utils (${FIXED_MONTHLY})</span>
        <span>Investable = Balance over $1,000 buffer</span>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-card rounded-lg p-3 text-sm border border-white/20">
        <p className="text-white font-medium mb-2">{label}</p>
        <div className="space-y-1 text-xs">
          <p className="text-emerald-400">Income: ${data.income?.toLocaleString()}</p>
          <p className="text-red-400">Expenses: ${data.expenses?.toLocaleString()}</p>
          <p className={data.net >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            Net: {data.net >= 0 ? '+' : ''}${data.net?.toLocaleString()}
          </p>
          <p className="text-indigo-400 font-medium pt-1 border-t border-white/10">
            Projected: ${data.balance?.toLocaleString()}
          </p>
          {data.actualBalance !== null && (
            <>
              <p className="text-emerald-400 font-medium">
                Actual: ${data.actualBalance?.toLocaleString()}
              </p>
              <p className={`font-semibold ${data.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Variance: {data.variance >= 0 ? '+' : ''}${data.variance?.toLocaleString()}
              </p>
            </>
          )}
          {data.hasBonus && (
            <p className="text-yellow-400 pt-1 border-t border-white/10">★ Includes bonus!</p>
          )}
        </div>
      </div>
    );
  }
  return null;
}

function SummaryCards({ projection, params }) {
  const totalIncome = projection.reduce((sum, p) => sum + p.income, 0);
  const totalExpenses = projection.reduce((sum, p) => sum + p.expenses, 0);
  const avgMonthlyNet = Math.round((totalIncome - totalExpenses) / 13);
  const avgWeeklyBudget = Math.round(params.monthlySpend / 4.33);
  const totalInvestable = projection.reduce((sum, p) => sum + (p.balance > 1000 ? p.balance - 1000 : 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-lg font-bold text-emerald-400">${totalIncome.toLocaleString()}</div>
        <div className="text-xs text-gray-400">Total Income</div>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-lg font-bold text-red-400">${totalExpenses.toLocaleString()}</div>
        <div className="text-xs text-gray-400">Total Expenses</div>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <div className={`text-lg font-bold ${avgMonthlyNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          ${avgMonthlyNet.toLocaleString()}
        </div>
        <div className="text-xs text-gray-400">Avg Monthly Net</div>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="text-lg font-bold text-indigo-400">${avgWeeklyBudget}</div>
        <div className="text-xs text-gray-400">Weekly Budget</div>
      </div>
    </div>
  );
}

function BudgetBreakdownCard({ monthlySpend }) {
  const fixedAmount = FIXED_MONTHLY;
  const discretionaryAmount = monthlySpend - fixedAmount;
  const fixedPercent = Math.round((fixedAmount / monthlySpend) * 100);
  const discretionaryPercent = 100 - fixedPercent;
  const weeklyDiscretionary = Math.round(discretionaryAmount / 4.33);

  const fixedBreakdown = [
    { name: 'Rent', amount: 2425 },
    { name: 'Utilities/Internet/Phone', amount: 150 },
  ];

  return (
    <div className="glass-card rounded-2xl p-5">
      <h2 className="font-semibold text-sm mb-3 text-white">Monthly Budget Breakdown</h2>

      {/* Visual bar */}
      <div className="h-8 rounded-xl overflow-hidden flex mb-3">
        <div
          className="bg-gradient-to-r from-slate-600 to-slate-500 flex items-center justify-center"
          style={{ width: `${fixedPercent}%` }}
        >
          <span className="text-xs font-medium text-white">Fixed ${fixedAmount}</span>
        </div>
        <div
          className="bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center"
          style={{ width: `${discretionaryPercent}%` }}
        >
          <span className="text-xs font-medium text-white">Discretionary ${discretionaryAmount}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Fixed expenses */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded bg-slate-500"></div>
            <span className="text-sm font-medium text-gray-300">Fixed ({fixedPercent}%)</span>
          </div>
          <div className="space-y-1 text-xs text-gray-400">
            {fixedBreakdown.map(item => (
              <div key={item.name} className="flex justify-between">
                <span>{item.name}</span>
                <span className="text-gray-300">${item.amount}</span>
              </div>
            ))}
            <div className="pt-1 border-t border-white/10 flex justify-between font-medium text-gray-300">
              <span>Total</span>
              <span>${fixedAmount}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Must pay every month
          </p>
        </div>

        {/* Discretionary */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded bg-indigo-500"></div>
            <span className="text-sm font-medium text-gray-300">Discretionary ({discretionaryPercent}%)</span>
          </div>
          <div className="space-y-2">
            <div className="text-center p-3 bg-indigo-500/10 rounded-xl">
              <div className="text-2xl font-bold text-indigo-400">${discretionaryAmount}</div>
              <div className="text-xs text-gray-400">per month</div>
            </div>
            <div className="text-center p-3 bg-purple-500/10 rounded-xl">
              <div className="text-xl font-bold text-purple-400">${weeklyDiscretionary}</div>
              <div className="text-xs text-gray-400">per week</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Groceries, dining, shopping, etc.
          </p>
        </div>
      </div>
    </div>
  );
}

function IncomeBreakdownChart({ projection, params }) {
  const data = projection.map(p => ({
    month: p.month.replace(" '25", ''),
    paycheck: p.paycheckIncome,
    bonus: p.bonusIncome,
    subletter: p.subletterIncome,
  }));

  return (
    <div className="glass-card rounded-2xl p-5">
      <h2 className="font-semibold text-sm mb-3 text-white">Income Sources</h2>
      <ResponsiveContainer width="100%" height={150}>
        <ComposedChart data={data}>
          <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ background: 'rgba(15, 15, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            labelStyle={{ color: 'white' }}
            itemStyle={{ color: '#e5e7eb' }}
          />
          <Bar dataKey="paycheck" stackId="a" fill="#22c55e" name="Paycheck" />
          <Bar dataKey="bonus" stackId="a" fill="#eab308" name="Bonus" />
          <Bar dataKey="subletter" stackId="a" fill="#6366f1" name="Subletter" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"></span> Paycheck</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span> Bonus</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500"></span> Subletter</span>
      </div>
    </div>
  );
}

export default function YearlyProjection() {
  const [params, setParams] = useState(() => {
    try {
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
          creditCardDebt: 0,
        };
      }
    } catch (e) {
      console.error('Error loading params:', e);
    }
    return {
      startingCash: 1500,
      monthlySpend: 6400,
      bonus: 12000,
      bonusMonth: 'Jan',
      subletterMonths: ['Feb'],
      subletterAmount: 2000,
      creditCardDebt: 0,
    };
  });

  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return data.expenses || DEFAULT_ONE_TIME_EXPENSES;
      }
    } catch (e) {
      console.error('Error loading expenses:', e);
    }
    return DEFAULT_ONE_TIME_EXPENSES;
  });

  // Load balance tracker data
  const [actualBalances, setActualBalances] = useState(() => {
    try {
      const saved = localStorage.getItem('budget-planner-balances');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading balances:', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ params, expenses }));
    } catch (e) {
      console.error('Error saving:', e);
    }
  }, [params, expenses]);

  // Listen for balance tracker updates
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('budget-planner-balances');
        if (saved) {
          setActualBalances(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Error loading balances:', e);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const toggleExpense = (id) => {
    setExpenses(prev => prev.map(e => {
      if (e.id !== id) return e;

      // Cycle through states: upcoming -> paid -> disabled -> upcoming
      const currentStatus = e.status || (e.enabled ? 'upcoming' : 'disabled');
      let newStatus;

      if (currentStatus === 'upcoming') {
        newStatus = 'paid';
      } else if (currentStatus === 'paid') {
        newStatus = 'disabled';
      } else {
        newStatus = 'upcoming';
      }

      return { ...e, status: newStatus, enabled: newStatus === 'upcoming' }; // maintain backwards compat
    }));
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

      // Only count 'upcoming' expenses (not 'paid' or 'disabled')
      const oneTimeThisMonth = expenses
        .filter(e => {
          const status = e.status || (e.enabled ? 'upcoming' : 'disabled');
          return status === 'upcoming' && e.month === monthName;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      // Add credit card debt to first month
      const creditCardDebt = (i === 0 && params.creditCardDebt) ? params.creditCardDebt : 0;
      const totalExpenses = params.monthlySpend + oneTimeThisMonth + creditCardDebt;

      const net = totalIncome - totalExpenses;
      balance += net;

      // Find actual balance for this month (last entry of the month)
      const monthEnd = new Date(year, monthNum + 1, 0); // Last day of month
      const monthStart = new Date(year, monthNum, 1);

      const actualBalancesThisMonth = actualBalances.filter(b => {
        const bDate = new Date(b.date);
        return bDate >= monthStart && bDate <= monthEnd;
      });

      const latestActual = actualBalancesThisMonth.length > 0
        ? actualBalancesThisMonth[actualBalancesThisMonth.length - 1]
        : null;

      const actualBalance = latestActual ? latestActual.checking - latestActual.creditCard : null;

      data.push({
        month: monthName + (i === 0 ? " '25" : ''),
        balance: Math.round(balance),
        actualBalance: actualBalance !== null ? Math.round(actualBalance) : null,
        income: Math.round(totalIncome),
        expenses: Math.round(totalExpenses),
        net: Math.round(net),
        paycheckIncome: Math.round(paycheckIncome),
        bonusIncome: Math.round(bonusIncome),
        subletterIncome: Math.round(subletterIncome),
        hasBonus: bonusIncome > 0,
        variance: actualBalance !== null ? Math.round(actualBalance - balance) : null,
      });
    }
    return data;
  }, [params, expenses, actualBalances]);

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
          <div className="text-xs text-gray-400">Dec '26 balance</div>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards projection={projection} params={params} />

      {/* Budget Breakdown - Fixed vs Discretionary */}
      <BudgetBreakdownCard monthlySpend={params.monthlySpend} />

      {/* Warning */}
      {lowestPoint < 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm glow-red">
          <span className="font-semibold">Warning:</span> You'll go negative (lowest: ${lowestPoint.toLocaleString()})
        </div>
      )}

      {/* Main Chart */}
      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-3 text-white">Balance Over Time</h2>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={projection}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
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
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: 'Zero', fill: '#ef4444', fontSize: 10 }} />
            <ReferenceLine y={1000} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.3} label={{ value: 'Buffer', fill: '#22c55e', fontSize: 10 }} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="none"
              fill="url(#balanceGradient)"
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              name="Projected"
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.hasBonus) {
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={6} fill="#eab308" stroke="#fef08a" strokeWidth={2} />
                    </g>
                  );
                }
                return <circle cx={cx} cy={cy} r={3} fill="#6366f1" />;
              }}
              activeDot={{ r: 6, fill: '#818cf8', strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="actualBalance"
              stroke="#22c55e"
              strokeWidth={3}
              name="Actual"
              dot={(props) => {
                const { payload } = props;
                if (payload.actualBalance === null) return null;
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={5}
                    fill="#22c55e"
                    stroke="#86efac"
                    strokeWidth={2}
                  />
                );
              }}
              connectNulls={false}
              activeDot={{ r: 6, fill: '#22c55e', strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Projected</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Actual</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Bonus month</span>
          <span className="flex items-center gap-1"><span className="w-8 h-0.5 bg-red-500"></span> Zero line</span>
          <span className="flex items-center gap-1"><span className="w-8 h-0.5 bg-emerald-500 opacity-50"></span> $1k buffer</span>
        </div>
      </div>

      {/* Income Breakdown Chart */}
      <IncomeBreakdownChart projection={projection} params={params} />

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
      <MonthlyTable projection={projection} bonusMonth={params.bonusMonth} params={params} />

      {/* Investment Tip */}
      {endBalance > 5000 && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-indigo-300 text-sm">
          <span className="font-semibold">Investment Opportunity:</span> With a projected end balance of ${endBalance.toLocaleString()},
          consider investing surplus above your $1,000 buffer in a high-yield savings account or index funds.
        </div>
      )}

      {/* Auto-save indicator */}
      <div className="text-center text-xs text-gray-400">
        Changes auto-saved to browser • Future: Upload bank statements for spending analysis
      </div>
    </div>
  );
}
