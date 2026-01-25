// Bimonthly paycheck (24 payments/year) - calculated from previous biweekly: $2712.77 × 26 / 24
export const PAYCHECK = 2938.84;

// Bimonthly payment schedule: 7th and 22nd of each month
export const PAYDATES = [
  // December 2025
  '2025-12-07', '2025-12-22',
  // 2026
  '2026-01-07', '2026-01-22',
  '2026-02-07', '2026-02-22',
  '2026-03-07', '2026-03-22',
  '2026-04-07', '2026-04-22',
  '2026-05-07', '2026-05-22',
  '2026-06-07', '2026-06-22',
  '2026-07-07', '2026-07-22',
  '2026-08-07', '2026-08-22',
  '2026-09-07', '2026-09-22',
  '2026-10-07', '2026-10-22',
  '2026-11-07', '2026-11-22',
  '2026-12-07', '2026-12-22'
];

export const MONTHS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const FIXED_MONTHLY = 2575;
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
