import { Transaction, CategoryBudget, UserProfile, BudgetConfig } from './types';

// Helper to generate IDs
const uuid = () => Math.random().toString(36).substring(2, 11);

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  avatarUrl: '',
  email: ''
};

export const DEFAULT_QUICK_TEMPLATES = [
  { id: 'def-1', title: 'Chai / Coffee', amount: 20, category: 'Food' as const },
  { id: 'def-2', title: 'Metro / Cab', amount: 100, category: 'Transport' as const },
  { id: 'def-3', title: 'Swiggy Meal', amount: 250, category: 'Food' as const },
  { id: 'def-4', title: 'Fuel / Petrol', amount: 500, category: 'Transport' as const },
];

export const DEFAULT_BUDGET: BudgetConfig = {
  monthlyLimit: 0,
  quickTemplates: []
};

export const DEFAULT_CATEGORY_BUDGETS: CategoryBudget[] = [
  { name: 'Food', avgSpending: 600.00 },
  { name: 'Transport', avgSpending: 350.00 },
  { name: 'Rent', avgSpending: 1200.00 },
  { name: 'Shopping', avgSpending: 500.00 },
  { name: 'Other', avgSpending: 300.00 }
];

// Historical monthly aggregates for the "Archive" tab
export interface MonthlyHistorySummary {
  monthKey: string; // e.g. "2024-10"
  label: string; // e.g. "October 2024"
  shortLabel: string; // e.g. "OCT"
  totalOutflow: number;
  transactionCount: number;
}

export const INITIAL_HISTORY_SUMMARIES: MonthlyHistorySummary[] = [
  { monthKey: '2024-10', label: 'October 2024', shortLabel: 'OCT', totalOutflow: 3120.45, transactionCount: 24 },
  { monthKey: '2024-09', label: 'September 2024', shortLabel: 'SEP', totalOutflow: 4850.12, transactionCount: 31 },
  { monthKey: '2024-08', label: 'August 2024', shortLabel: 'AUG', totalOutflow: 2940.00, transactionCount: 28 },
  { monthKey: '2024-07', label: 'July 2024', shortLabel: 'JUL', totalOutflow: 5210.88, transactionCount: 35 }
];

// Seed transactions for October 2024 (Current dashboard month in screenshots)
export const INITIAL_TRANSACTIONS: Transaction[] = [
  // FOOD - Target: $742.00
  {
    id: uuid(),
    title: 'Whole Foods Market',
    category: 'Food',
    amount: -84.20,
    date: '2024-10-26',
    time: '2:45 PM',
    label: 'Personal',
    notes: 'Organic groceries, fruits, and weekly essentials.'
  },
  {
    id: uuid(),
    title: 'Dinner at Al\'s',
    category: 'Food',
    amount: -45.20,
    date: '2024-10-15',
    time: '7:30 PM',
    label: 'Personal',
    notes: 'Pasta and drinks with friends.'
  },
  {
    id: uuid(),
    title: 'Trader Joe\'s',
    category: 'Food',
    amount: -188.40,
    date: '2024-10-18',
    time: '4:15 PM',
    label: 'Personal',
    notes: 'Bi-weekly stock up.'
  },
  {
    id: uuid(),
    title: 'Sushiro Dinner',
    category: 'Food',
    amount: -124.20,
    date: '2024-10-12',
    time: '8:00 PM',
    label: 'Personal',
    notes: 'Sushi dinner blowout.'
  },
  {
    id: uuid(),
    title: 'Blue Bottle Coffee',
    category: 'Food',
    amount: -18.50,
    date: '2024-10-25',
    time: '9:15 AM',
    label: 'Personal',
    notes: 'Coffee and pastry.'
  },
  {
    id: uuid(),
    title: 'Weekly Groceries Run',
    category: 'Food',
    amount: -281.50,
    date: '2024-10-04',
    time: '11:00 AM',
    label: 'Personal',
    notes: 'Pantry staples.'
  },

  // TRANSPORT - Target: $315.00
  {
    id: uuid(),
    title: 'Shell Oil',
    category: 'Transport',
    amount: -52.00,
    date: '2024-10-25',
    time: '11:15 AM',
    label: 'Work',
    notes: 'Regular unleaded gas refuel.'
  },
  {
    id: uuid(),
    title: 'Shell Station',
    category: 'Transport',
    amount: -62.00,
    date: '2024-10-15',
    time: '8:15 AM',
    label: 'Work',
    notes: 'Gas tank top-off.'
  },
  {
    id: uuid(),
    title: 'Uber Commute',
    category: 'Transport',
    amount: -45.00,
    date: '2024-10-20',
    time: '8:45 AM',
    label: 'Work',
    notes: 'Rainy day commute to office.'
  },
  {
    id: uuid(),
    title: 'Car Service Maintenance',
    category: 'Transport',
    amount: -156.00,
    date: '2024-10-08',
    time: '2:00 PM',
    label: 'Personal',
    notes: 'Oil change and tire rotation.'
  },

  // RENT - Target: $1,200.00
  {
    id: uuid(),
    title: 'Apartment Rental Payment',
    category: 'Rent',
    amount: -1200.00,
    date: '2024-10-01',
    time: '9:00 AM',
    label: 'Personal',
    notes: 'Monthly apartment lease payment.'
  },

  // SHOPPING - Target: $822.50
  {
    id: uuid(),
    title: 'Nordstrom Jacket',
    category: 'Shopping',
    amount: -320.00,
    date: '2024-10-06',
    time: '3:30 PM',
    label: 'Personal',
    notes: 'Winter coat shopping.'
  },
  {
    id: uuid(),
    title: 'Apple Store Accessory',
    category: 'Shopping',
    amount: -128.50,
    date: '2024-10-14',
    time: '6:45 PM',
    label: 'Personal',
    notes: 'iPad Smart Folio Case.'
  },
  {
    id: uuid(),
    title: 'Amazon Tech order',
    category: 'Shopping',
    amount: -374.00,
    date: '2024-10-02',
    time: '1:10 PM',
    label: 'Personal',
    notes: 'Mechanical keyboard and light bar.'
  },

  // OTHER - Target: $350.00
  {
    id: uuid(),
    title: 'Netflix',
    category: 'Other',
    amount: -15.99,
    date: '2024-10-22',
    time: '12:05 AM',
    label: 'Subscription',
    notes: 'Premium 4K streaming monthly subscription.'
  },
  {
    id: uuid(),
    title: 'Spotify Family',
    category: 'Other',
    amount: -19.99,
    date: '2024-10-10',
    time: '1:00 AM',
    label: 'Subscription',
    notes: 'Audio streaming.'
  },
  {
    id: uuid(),
    title: 'Gym Membership',
    category: 'Other',
    amount: -95.00,
    date: '2024-10-05',
    time: '7:00 AM',
    label: 'Subscription',
    notes: 'Equinox monthly dues.'
  },
  {
    id: uuid(),
    title: 'Dental Checkup Copay',
    category: 'Other',
    amount: -45.00,
    date: '2024-10-14',
    time: '11:00 AM',
    label: 'Personal',
    notes: 'Routine cleaning.'
  },
  {
    id: uuid(),
    title: 'Water & Waste Utility',
    category: 'Other',
    amount: -84.02,
    date: '2024-10-11',
    time: '10:00 AM',
    label: 'Personal',
    notes: 'City utilities bill.'
  },
  {
    id: uuid(),
    title: 'Gas & Electric Power',
    category: 'Other',
    amount: -90.00,
    date: '2024-10-11',
    time: '10:15 AM',
    label: 'Personal',
    notes: 'Power grid bill.'
  }
];

// Seed some older transactions for October 2023 to support screenshot 3 perfectly!
export const OCTOBER_2023_TRANSACTIONS: Transaction[] = [
  {
    id: 'oct23-1',
    title: 'Dinner at Al\'s',
    category: 'Food',
    amount: -45.20,
    date: '2023-10-15',
    time: '7:30 PM',
    label: 'Personal',
    notes: 'Dinner date.'
  },
  {
    id: 'oct23-2',
    title: 'Shell Station',
    category: 'Transport',
    amount: -62.00,
    date: '2023-10-15',
    time: '8:15 AM',
    label: 'Work',
    notes: 'Fuel.'
  },
  {
    id: 'oct23-3',
    title: 'Whole Foods Market',
    category: 'Food',
    amount: -128.50,
    date: '2023-10-14',
    time: '6:45 PM',
    label: 'Personal',
    notes: 'Grocery shopping.'
  },
  {
    id: 'oct23-5',
    title: 'Netflix Subscription',
    category: 'Other',
    amount: -15.99,
    date: '2023-10-14',
    time: '12:05 AM',
    label: 'Subscription',
    notes: 'Netflix subscription.'
  }
];
