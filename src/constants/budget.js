export const PAYCHECK = 2712.77;

export const PAYDATES = [
  '2025-12-19', '2026-01-02', '2026-01-16', '2026-01-30', '2026-02-13', '2026-02-27',
  '2026-03-13', '2026-03-27', '2026-04-10', '2026-04-24', '2026-05-08', '2026-05-22',
  '2026-06-05', '2026-06-19', '2026-07-03', '2026-07-17', '2026-07-31', '2026-08-14',
  '2026-08-28', '2026-09-11', '2026-09-25', '2026-10-09', '2026-10-23', '2026-11-06',
  '2026-11-20', '2026-12-04', '2026-12-18'
];

export const MONTHS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const FIXED_MONTHLY = 2625;
export const MONTHLY_TARGET = 6400;
export const MONTHLY_DISCRETIONARY = MONTHLY_TARGET - FIXED_MONTHLY;
export const WEEKLY_DISCRETIONARY = Math.round(MONTHLY_DISCRETIONARY / 4.33);

export const DEFAULT_ONE_TIME_EXPENSES = [
  { id: 1, name: 'Medical debts (HSA)', amount: 800, month: 'Mar', enabled: false, priority: 'want' },
  { id: 2, name: 'Mexico/Tijuana flights', amount: 345, month: 'Jan', enabled: true, priority: 'must' },
  { id: 3, name: 'Credit card payoff', amount: 5500, month: 'Jan', enabled: true, priority: 'must' },
  { id: 4, name: 'Tux jacket', amount: 650, month: 'Feb', enabled: false, priority: 'want' },
  { id: 5, name: 'Painting', amount: 500, month: 'Mar', enabled: false, priority: 'want' },
  { id: 6, name: 'Garden', amount: 450, month: 'Apr', enabled: false, priority: 'want' },
];

export const DEFAULT_WEEKLY_CATEGORIES = [
  { id: 1, category: 'Groceries', budget: 350, spent: 0 },
  { id: 2, category: 'Dining', budget: 250, spent: 0 },
  { id: 3, category: 'Bars', budget: 150, spent: 0 },
  { id: 4, category: 'Coffee', budget: 40, spent: 0 },
  { id: 5, category: 'Other', budget: 80, spent: 0 },
];
