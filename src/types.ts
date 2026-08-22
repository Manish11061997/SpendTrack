export interface Transaction {
  id: string;
  title: string;
  category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other';
  amount: number; // Positive for Income, Negative for Expenses
  date: string; // format: 'YYYY-MM-DD'
  time: string; // format: '2:45 PM'
  label: 'Personal' | 'Work' | 'Freelance' | 'Subscription' | 'General';
  notes?: string;
  receiptUrl?: string;
  tags?: string[];
  splits?: { category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other'; amount: number }[];
  originalCurrency?: string;
  originalAmount?: number;
  isTaxDeductible?: boolean;
  taxCategory?: 'Business Expense' | 'Medical' | 'Donation' | 'Education' | 'Work Equipment' | 'Other';
  merchant?: string;
}

export interface CategoryBudget {
  name: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other';
  avgSpending: number;
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
  email: string;
}

export interface QuickLogTemplate {
  id: string;
  title: string;
  amount: number;
  category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other';
  icon?: string;
}

export interface BudgetConfig {
  monthlyLimit: number;
  currency?: string;
  categoryLimits?: {
    Food?: number;
    Transport?: number;
    Rent?: number;
    Shopping?: number;
    Other?: number;
  };
  enableCategoryRollover?: boolean;
  recurringIncome?: {
    amount: number;
    title: string;
    dayOfMonth: number;
    category: string;
    isActive: boolean;
    lastProcessedMonth?: string;
  };
  quickTemplates?: QuickLogTemplate[];
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
}

export interface Subscription {
  id: string;
  title: string;
  amount: number; // Positive number (cost of the subscription)
  category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other';
  billingDate: number; // Day of the month (1-31)
  isActive: boolean;
}

export interface UserAccount {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export interface SharedExpense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidBy: string; // Member name
  date: string;
  category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other';
  splits: { [memberName: string]: number }; // memberName -> split amount
}

export interface SharedGroup {
  id: string;
  name: string;
  members: string[]; // List of member names
  expenses: SharedExpense[];
  createdAt: string;
}

export interface DebtItem {
  id: string;
  title: string;
  totalAmount: number;
  interestRate: number; // Annual %
  minimumPayment: number;
  category: 'Credit Card' | 'Personal Loan' | 'Car Loan' | 'Mortgage' | 'Other';
}

export interface PinConfig {
  isEnabled: boolean;
  pin: string; // 4-digit PIN
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'large_transaction' | 'category_cap' | 'subscription_due';
  threshold: number; // e.g. 5000 or 80 (%)
  targetCategory?: string;
  isEnabled: boolean;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon identifier
  unlocked: boolean;
  progress: number; // 0 - 100
  unlockedAt?: string;
}


