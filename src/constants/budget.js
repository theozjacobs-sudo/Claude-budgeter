// Bimonthly paycheck (24 payments/year) - calculated from previous biweekly: $2712.77 × 26 / 24
export const PAYCHECK = 2938.84;

// Bimonthly payment schedule: 15th and last day of each month
export const PAYDATES = [
  // December 2025
  '2025-12-15', '2025-12-31',
  // 2026 - Jan 2 is transition payment (bonus + last two weeks)
  '2026-01-02', '2026-01-15', '2026-01-31',
  '2026-02-15', '2026-02-28',
  '2026-03-15', '2026-03-31',
  '2026-04-15', '2026-04-30',
  '2026-05-15', '2026-05-31',
  '2026-06-15', '2026-06-30',
  '2026-07-15', '2026-07-31',
  '2026-08-15', '2026-08-31',
  '2026-09-15', '2026-09-30',
  '2026-10-15', '2026-10-31',
  '2026-11-15', '2026-11-30',
  '2026-12-15', '2026-12-31'
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
