import { Transaction, BudgetConfig, AchievementBadge } from '../types';

export interface RolloverSummary {
  previousMonthKey: string;
  unspentAmount: number;
  rolledOverCategory?: string;
  autoTransferredToSavings: boolean;
}

/**
 * Calculates rollover amount from previous month
 */
export function calculateBudgetRollover(
  transactions: Transaction[],
  budget: BudgetConfig,
  targetMonthKey: string // YYYY-MM format
): RolloverSummary | null {
  if (!budget?.enableCategoryRollover) return null;

  const [year, month] = targetMonthKey.split('-').map(Number);
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevYearStr = prevMonthDate.getFullYear();
  const prevMonthStr = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
  const prevMonthKey = `${prevYearStr}-${prevMonthStr}`;

  const prevMonthTxs = transactions.filter(t => t.date && t.date.startsWith(prevMonthKey));
  const prevExpenses = Math.abs(
    prevMonthTxs.filter(t => t.amount < 0).reduce((sum, t) => sum + Number(t.amount), 0)
  );

  const monthlyLimit = budget.monthlyLimit || 0;
  const unspent = Math.max(0, monthlyLimit - prevExpenses);

  if (unspent <= 0) return null;

  return {
    previousMonthKey: prevMonthKey,
    unspentAmount: unspent,
    autoTransferredToSavings: true,
  };
}

export const INITIAL_ACHIEVEMENT_BADGES: AchievementBadge[] = [
  {
    id: 'first_log',
    title: 'First Step',
    description: 'Log your very first transaction on SpendTrack.',
    icon: 'Sparkles',
    unlocked: false,
    progress: 0,
  },
  {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Log expenses 3 days in a row.',
    icon: 'Flame',
    unlocked: false,
    progress: 0,
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Log expenses for 7 consecutive days.',
    icon: 'Zap',
    unlocked: false,
    progress: 0,
  },
  {
    id: 'under_budget',
    title: 'Budget Master',
    description: 'Keep monthly spending below your budget limit.',
    icon: 'ShieldCheck',
    unlocked: false,
    progress: 0,
  },
  {
    id: 'savings_hero',
    title: 'Savings Guardian',
    description: 'Maintain a positive safe balance this month.',
    icon: 'PiggyBank',
    unlocked: false,
    progress: 0,
  },
  {
    id: 'smart_categorizer',
    title: 'Category Specialist',
    description: 'Log transactions across 3 or more categories.',
    icon: 'Star',
    unlocked: false,
    progress: 0,
  },
];

/**
 * Evaluates unlock conditions for gamified achievement badges
 */
export function evaluateBadges(
  transactions: Transaction[],
  budget: BudgetConfig,
  currentBadges: AchievementBadge[] = INITIAL_ACHIEVEMENT_BADGES
): AchievementBadge[] {
  const updated = [...currentBadges];
  const totalTxs = transactions.length;

  // 1. First Log
  const firstLogIdx = updated.findIndex(b => b.id === 'first_log');
  if (firstLogIdx !== -1) {
    const isUnlocked = totalTxs > 0;
    updated[firstLogIdx] = {
      ...updated[firstLogIdx],
      unlocked: isUnlocked,
      progress: isUnlocked ? 100 : 0,
    };
  }

  // 2. Logging Streaks
  const uniqueDates = Array.from(new Set(transactions.map(t => t.date && String(t.date)).filter(Boolean))).sort();
  let maxStreak = 0;
  let currentStreak = 0;

  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }
    if (currentStreak > maxStreak) maxStreak = currentStreak;
  }

  // 3-Day Streak
  const s3Idx = updated.findIndex(b => b.id === 'streak_3');
  if (s3Idx !== -1) {
    const prog = Math.max(0, Math.min(100, Math.round((maxStreak / 3) * 100)));
    updated[s3Idx] = {
      ...updated[s3Idx],
      unlocked: maxStreak >= 3,
      progress: prog,
    };
  }

  // 7-Day Streak
  const s7Idx = updated.findIndex(b => b.id === 'streak_7');
  if (s7Idx !== -1) {
    const prog = Math.max(0, Math.min(100, Math.round((maxStreak / 7) * 100)));
    updated[s7Idx] = {
      ...updated[s7Idx],
      unlocked: maxStreak >= 7,
      progress: prog,
    };
  }

  // 3. Budget Master
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthExpenses = Math.abs(
    transactions
      .filter(t => t.date && String(t.date).startsWith(currentMonthKey) && Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0)
  );

  const bmIdx = updated.findIndex(b => b.id === 'under_budget');
  if (bmIdx !== -1) {
    const limit = Number(budget.monthlyLimit) || 0;
    if (limit > 0) {
      const remaining = limit - thisMonthExpenses;
      const pctLeft = Math.max(0, Math.min(100, Math.round((remaining / limit) * 100)));
      updated[bmIdx] = {
        ...updated[bmIdx],
        unlocked: remaining >= 0 && totalTxs > 0,
        progress: remaining >= 0 ? pctLeft : 0,
      };
    } else {
      updated[bmIdx] = { ...updated[bmIdx], unlocked: false, progress: 0 };
    }
  }

  // 4. Savings Guardian
  const sgIdx = updated.findIndex(b => b.id === 'savings_hero');
  if (sgIdx !== -1) {
    const limit = Number(budget.monthlyLimit) || 0;
    const isSafe = limit > 0 && thisMonthExpenses < limit;
    updated[sgIdx] = {
      ...updated[sgIdx],
      unlocked: isSafe && totalTxs > 0,
      progress: isSafe ? 100 : Math.max(0, Math.min(100, Math.round((totalTxs / 5) * 100))),
    };
  }

  // 5. Category Specialist
  const csIdx = updated.findIndex(b => b.id === 'smart_categorizer');
  if (csIdx !== -1) {
    const categoriesUsed = new Set(transactions.map(t => t.category).filter(Boolean));
    const count = categoriesUsed.size;
    updated[csIdx] = {
      ...updated[csIdx],
      unlocked: count >= 3,
      progress: Math.max(0, Math.min(100, Math.round((count / 3) * 100))),
    };
  }

  return updated;
}
