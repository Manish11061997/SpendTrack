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

export interface BudgetConfig {
  monthlyLimit: number;
  categoryLimits?: {
    Food?: number;
    Transport?: number;
    Rent?: number;
    Shopping?: number;
    Other?: number;
  };
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

