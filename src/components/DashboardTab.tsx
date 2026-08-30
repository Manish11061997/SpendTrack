import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Transaction, UserProfile, BudgetConfig, Subscription } from '../types';
import { formatCurrency as formatCustomCurrency, isSubscriptionDoubleCounted, parseRawAmount } from '../utils/currency';
import { COLOR_PRESETS } from '../theme';
import { triggerHaptic } from '../utils/haptics';
import { QuickShortcutsWidget } from './QuickShortcutsWidget';
import { FinancialHealthRadarCard } from './FinancialHealthRadarCard';
import { NoSpendHeatmapCard } from './NoSpendHeatmapCard';
import { ReceiptScannerModal } from './ReceiptScannerModal';
import { QuickTemplatesWidget } from './QuickTemplatesWidget';
import { 
  TrendingDown, 
  TrendingUp, 
  ArrowDown, 
  ArrowUp,
  ArrowRight,
  Coins, 
  ShoppingCart, 
  ChevronRight,
  Utensils,
  Car,
  Home as HomeIcon,
  ShoppingBag,
  MoreHorizontal,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Tag,
  FileText,
  X,
  CreditCard,
  PiggyBank,
  Target,
  Info,
  ShieldAlert,
  Sparkles,
  Award
} from 'lucide-react';

interface DashboardTabProps {
  transactions: Transaction[];
  profile: UserProfile;
  budget: BudgetConfig;
  subscriptions?: Subscription[];
  savingsGoals?: {
    id: string;
    title: string;
    targetAmount: number;
    currentAmount: number;
    targetDate?: string;
  }[];
  onUpdateSavingsGoals?: (goals: any[]) => void;
  onAddSubscription?: (sub: Omit<Subscription, 'id'>) => void;
  onUpdateSubscription?: (id: string, sub: Partial<Subscription>) => void;
  onDeleteSubscription?: (id: string) => void;
  onNavigateToHistory: () => void;
  onNavigateToInsights: () => void;
  onAddTransactionClick: () => void;
  onDeleteTransaction: (id: string) => void;
  onAddTransaction?: (transaction: Omit<Transaction, 'id'>) => void;
  onOpenVoice?: () => void;
  onOpenSms?: () => void;
  onOpenCalendar?: () => void;
  onOpenExportAudit?: () => void;
  onNavigateToSettings?: () => void;
  onUpdateBudget?: (budget: BudgetConfig) => void;
  themePresetId?: string;
  isDark?: boolean;
  onOpenBadges?: () => void;
  unlockedBadgesCount?: number;
}

export default function DashboardTab({ 
  transactions, 
  profile, 
  budget, 
  subscriptions = [],
  savingsGoals = [],
  onUpdateSavingsGoals = () => {},
  onAddSubscription = () => {},
  onUpdateSubscription = () => {},
  onDeleteSubscription = () => {},
  onNavigateToHistory, 
  onNavigateToInsights,
  onAddTransactionClick,
  onDeleteTransaction,
  onAddTransaction = () => {},
  onOpenVoice,
  onOpenSms,
  onOpenCalendar,
  onOpenExportAudit,
  onNavigateToSettings,
  onUpdateBudget,
  themePresetId,
  isDark,
  onOpenBadges,
  unlockedBadgesCount = 0
}: DashboardTabProps) {
  const healthRadarRef = React.useRef<HTMLDivElement>(null);
  const noSpendRef = React.useRef<HTMLDivElement>(null);

  const scrollToHealthRadar = () => {
    healthRadarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const scrollToNoSpend = () => {
    noSpendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  // Dynamically look up active theme/preset hex colors to avoid d3-color oklch parsing errors
  const activeThemePresetId = themePresetId || localStorage.getItem('spendtrack_theme_preset') || 'navy';
  const activeIsDark = isDark !== undefined ? isDark : document.documentElement.classList.contains('dark');
  const activePreset = COLOR_PRESETS.find(p => p.id === activeThemePresetId) || COLOR_PRESETS[0];
  const themeColors = activeIsDark ? activePreset.dark : activePreset.light;
  const themeOutline = activeIsDark ? '#9F9483' : '#8C8170';
  const themeError = activeIsDark ? '#EC9A97' : '#A3483B';

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showCalcTooltip, setShowCalcTooltip] = useState<boolean>(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isBankSmsOpen, setIsBankSmsOpen] = useState(false);
  const [isSubsExpanded, setIsSubsExpanded] = useState<boolean>(false);
  const [isGoalsExpanded, setIsGoalsExpanded] = useState<boolean>(false);

  // Subscription inline form states
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubCategory, setNewSubCategory] = useState<'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other'>('Other');
  const [newSubDate, setNewSubDate] = useState('1');
  const [subError, setSubError] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const handleAddSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTitle.trim()) {
      setSubError('Please enter a subscription title.');
      return;
    }
    const amt = parseFloat(parseRawAmount(newSubAmount));
    if (isNaN(amt) || amt <= 0) {
      setSubError('Please enter a valid monthly cost.');
      return;
    }
    const billingDay = parseInt(newSubDate);
    if (isNaN(billingDay) || billingDay < 1 || billingDay > 31) {
      setSubError('Please enter a valid billing day (1-31).');
      return;
    }

    onAddSubscription({
      title: newSubTitle.trim(),
      amount: amt,
      category: newSubCategory,
      billingDate: billingDay,
      isActive: true
    });

    // Reset form
    setNewSubTitle('');
    setNewSubAmount('');
    setNewSubCategory('Other');
    setNewSubDate('1');
    setSubError('');
    setIsAddSubOpen(false);
  };

  // Savings Goals form states
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [goalError, setGoalError] = useState('');

  // Contribution/Withdrawal states
  const [activeAdjustingGoalId, setActiveAdjustingGoalId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'withdraw'>('add');

  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [subToDeleteId, setSubToDeleteId] = useState<string | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const handleAddGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) {
      setGoalError('Please enter a goal title.');
      return;
    }
    const tgt = parseFloat(parseRawAmount(newGoalTarget));
    if (isNaN(tgt) || tgt <= 0) {
      setGoalError('Please enter a valid target amount.');
      return;
    }

    const newGoal = {
      id: Math.random().toString(36).substring(2, 11),
      title: newGoalTitle.trim(),
      targetAmount: tgt,
      currentAmount: 0,
      targetDate: newGoalDate || undefined
    };

    onUpdateSavingsGoals([...savingsGoals, newGoal]);

    setNewGoalTitle('');
    setNewGoalTarget('');
    setNewGoalDate('');
    setGoalError('');
    setIsAddGoalOpen(false);
  };

  const handleAdjustGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAdjustingGoalId) return;
    const amount = parseFloat(parseRawAmount(adjustAmount));
    if (isNaN(amount) || amount <= 0) return;

    const updated = savingsGoals.map(g => {
      if (g.id === activeAdjustingGoalId) {
        let newAmt = g.currentAmount;
        if (adjustType === 'add') {
          newAmt += amount;
        } else {
          newAmt = Math.max(0, g.currentAmount - amount);
        }
        return { ...g, currentAmount: newAmt };
      }
      return g;
    });

    onUpdateSavingsGoals(updated);
    setAdjustAmount('');
    setActiveAdjustingGoalId(null);
  };

  const handleDeleteGoal = (id: string) => {
    setGoalToDeleteId(id);
  };

  // Get active month dynamically based on the available transactions, defaulting to current calendar month
  const today = new Date();
  const currentRealMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const availableMonths = Array.from(new Set(transactions.filter(t => t && t.date && typeof t.date === 'string').map(t => t.date.substring(0, 7)))).sort((a, b) => b.localeCompare(a));
  const [selectedMonthState, setSelectedMonthState] = useState<string | null>(null);
  const activeMonth = selectedMonthState || availableMonths[0] || currentRealMonth;
  const [summaryMode, setSummaryMode] = useState<'monthly' | 'weekly'>('monthly');
  const [isMonthSelectOpen, setIsMonthSelectOpen] = useState(false);

  // Filter transactions for the current active month
  const currentMonthTxs = transactions.filter(t => t && t.date && typeof t.date === 'string' && t.date.startsWith(activeMonth));
  
  // Active subscriptions total recurring monthly expense (guarded against double-counting)
  const activeSubsTotal = subscriptions
    .filter(s => s.isActive !== false)
    .reduce((sum, s) => {
      const isAlreadyLogged = currentMonthTxs.some(t => 
        t.amount < 0 &&
        isSubscriptionDoubleCounted(s.title, t.title)
      );
      return sum + (isAlreadyLogged ? 0 : (Number(s.amount) || 0));
    }, 0);

  const loggedExpenses = Math.abs(
    currentMonthTxs
      .filter(t => Number(t.amount) < 0)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  );

  // Total expenses include logged transactions PLUS un-logged active recurring subscriptions
  const totalExpenses = loggedExpenses + activeSubsTotal;

  // Helper to get weekly transactions from current month's transactions
  const getWeeklyTransactions = (txs: Transaction[]) => {
    if (txs.length === 0) return [];
    const dates = txs.map(t => new Date(t.date).getTime());
    const maxTime = Math.max(...dates);
    const maxDate = new Date(maxTime);
    
    const minDate = new Date(maxDate);
    minDate.setDate(maxDate.getDate() - 6);
    
    return txs.filter(t => {
      const d = new Date(t.date);
      const dZero = new Date(d);
      dZero.setHours(0,0,0,0);
      const minCompare = new Date(minDate);
      minCompare.setHours(0,0,0,0);
      const maxCompare = new Date(maxDate);
      maxCompare.setHours(0,0,0,0);
      return dZero >= minCompare && dZero <= maxCompare;
    });
  };

  const weeklyTxs = getWeeklyTransactions(currentMonthTxs);

  const totalWeeklyExpenses = Math.abs(
    weeklyTxs
      .filter(t => Number(t.amount) < 0)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  );

  const activeExpenses = summaryMode === 'monthly' ? totalExpenses : totalWeeklyExpenses;

  // Income & Net Cashflow calculations
  const totalIncome = currentMonthTxs
    .filter(t => Number(t.amount) > 0)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalWeeklyIncome = weeklyTxs
    .filter(t => Number(t.amount) > 0)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const activeIncome = summaryMode === 'monthly' ? totalIncome : totalWeeklyIncome;
  const netBalance = activeIncome - activeExpenses;
  const hasBudget = !!(budget && budget.monthlyLimit && Number(budget.monthlyLimit) > 0);
  const activeLimit = hasBudget ? (summaryMode === 'monthly' ? Number(budget.monthlyLimit) : (Number(budget.monthlyLimit) / 4.33)) : 0;

  // Budget Health/Pace calculations
  const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDayInMonth = today.getDate();
  const percentMonthElapsed = (currentDayInMonth / totalDaysInMonth) * 100;
  const percentBudgetSpent = activeLimit > 0 ? (activeExpenses / activeLimit) * 100 : 0;

  const budgetHealth: { label: string; colorClass: string; bgClass: string; borderClass: string } = (() => {
    if (activeLimit <= 0) return { label: 'No Limit Set', colorClass: 'text-on-surface-variant', bgClass: 'bg-surface-container', borderClass: 'border-outline-variant/30' };
    if (activeExpenses > activeLimit) return { label: 'Over Budget', colorClass: 'text-error', bgClass: 'bg-error/10', borderClass: 'border-error/20' };
    
    // Pace calculation
    if (percentBudgetSpent <= percentMonthElapsed) {
      return { label: 'On Track', colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/15', borderClass: 'border-emerald-500/20' };
    } else if (percentBudgetSpent <= percentMonthElapsed * 1.15) {
      return { label: 'Caution (Pacing Fast)', colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-500/10 dark:bg-amber-500/15', borderClass: 'border-amber-500/20' };
    } else {
      return { label: 'Over Pace', colorClass: 'text-error', bgClass: 'bg-error/10 dark:bg-error/15', borderClass: 'border-error/20' };
    }
  })();

  // EOM Projections for budget warning/risk analysis
  const daysRemaining = totalDaysInMonth - currentDayInMonth;
  const dailySpendRate = currentDayInMonth > 0 ? totalExpenses / currentDayInMonth : 0;
  const projectedRemainingSpend = dailySpendRate * daysRemaining;
  const projectedTotalEOM = totalExpenses + projectedRemainingSpend;
  const projectedOverdraft = hasBudget ? projectedTotalEOM - Number(budget.monthlyLimit) : 0;
  const isHighRisk = hasBudget && (budgetHealth.label === 'Over Pace' || budgetHealth.label === 'Over Budget' || totalExpenses > Number(budget.monthlyLimit));

  // Fetch true historical baseline
  const pastMonths = availableMonths.filter(m => m !== activeMonth);
  let historicalAvgTotal = 0;
  if (pastMonths.length > 0) {
    const pastExpenses = pastMonths.map(m => {
      const monthTxs = transactions.filter(t => t && t.date && typeof t.date === 'string' && t.date.startsWith(m) && Number(t.amount) < 0);
      return Math.abs(monthTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0));
    });
    historicalAvgTotal = Math.round(pastExpenses.reduce((sum, val) => sum + val, 0) / pastMonths.length);
  } else {
    historicalAvgTotal = totalExpenses;
  }

  const activeAverage = summaryMode === 'monthly' ? historicalAvgTotal : (historicalAvgTotal / 4.33);

  // Calculate previous month total
  const prevMonth = pastMonths[0];
  let prevMonthExpenses = 0;
  if (prevMonth) {
    const prevMonthTxs = transactions.filter(t => t && t.date && typeof t.date === 'string' && t.date.startsWith(prevMonth) && Number(t.amount) < 0);
    prevMonthExpenses = Math.abs(prevMonthTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0));
  }
  const monthlyDiffPercent = prevMonthExpenses > 0 
    ? ((totalExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 
    : 0;

  // Find the latest transaction's date in this set
  const dates = currentMonthTxs.map(t => new Date(t.date).getTime());
  const maxTime = dates.length > 0 ? Math.max(...dates) : new Date().getTime();
  const maxDate = new Date(maxTime);
  
  // Current week window: [maxDate - 6, maxDate]
  const minDate = new Date(maxDate);
  minDate.setDate(maxDate.getDate() - 6);
  
  // Previous week window: [maxDate - 13, maxDate - 7]
  const prevWeekMaxDate = new Date(minDate);
  prevWeekMaxDate.setDate(minDate.getDate() - 1);
  const prevWeekMinDate = new Date(prevWeekMaxDate);
  prevWeekMinDate.setDate(prevWeekMaxDate.getDate() - 6);
  
  const prevWeeklyTxs = currentMonthTxs.filter(t => {
    const d = new Date(t.date);
    const dZero = new Date(d);
    dZero.setHours(0,0,0,0);
    const minCompare = new Date(prevWeekMinDate);
    minCompare.setHours(0,0,0,0);
    const maxCompare = new Date(prevWeekMaxDate);
    maxCompare.setHours(0,0,0,0);
    return dZero >= minCompare && dZero <= maxCompare;
  });
  
  const prevWeeklyExpenses = Math.abs(
    prevWeeklyTxs.filter(t => Number(t.amount) < 0).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  );
  
  const weeklyDiffPercent = prevWeeklyExpenses > 0 
    ? ((totalWeeklyExpenses - prevWeeklyExpenses) / prevWeeklyExpenses) * 100 
    : 0;

  const getComparisonInfo = () => {
    if (summaryMode === 'monthly') {
      if (!prevMonth) {
        if (hasBudget) {
          const pct = Math.round((totalExpenses / budget.monthlyLimit) * 100);
          return {
            label: `${pct}% of monthly budget`,
            isLess: totalExpenses <= budget.monthlyLimit,
            showIcon: false
          };
        }
        return { label: 'No comparative data', isLess: true, showIcon: false };
      }
      const pct = Math.round(monthlyDiffPercent);
      if (pct === 0) return { label: 'Same as last month', isLess: true, showIcon: false };
      return {
        label: pct < 0 ? `${Math.abs(pct)}% less than last month` : `${Math.abs(pct)}% more than last month`,
        isLess: pct < 0,
        showIcon: true
      };
    } else {
      if (prevWeeklyExpenses === 0 || weeklyTxs.length === 0) {
        return { label: 'No comparative data', isLess: true, showIcon: false };
      }
      const pct = Math.round(weeklyDiffPercent);
      if (pct === 0) return { label: 'Same as last week', isLess: true, showIcon: false };
      return {
        label: pct < 0 ? `${Math.abs(pct)}% less than last week` : `${Math.abs(pct)}% more than last week`,
        isLess: pct < 0,
        showIcon: true
      };
    }
  };

  const getWeeklyPeriodRange = () => {
    if (currentMonthTxs.length === 0) return '';
    const dates = currentMonthTxs.map(t => new Date(t.date).getTime());
    const maxTime = Math.max(...dates);
    const maxDate = new Date(maxTime);
    const minDate = new Date(maxDate);
    minDate.setDate(maxDate.getDate() - 6);

    const formatShortDate = (d: Date) => {
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    };
    return `${formatShortDate(minDate)} - ${formatShortDate(maxDate)}`;
  };

  // Category-specific icons and colors
  const getCategoryConfig = (cat: string) => {
    switch (cat) {
      case 'Food':
        return { icon: Utensils, bg: 'bg-primary-container text-on-primary-container' };
      case 'Transport':
        return { icon: Car, bg: 'bg-secondary/15 text-secondary dark:bg-secondary/25 dark:text-secondary' };
      case 'Rent':
        return { icon: HomeIcon, bg: 'bg-secondary-container text-on-secondary-container' };
      case 'Shopping':
        return { icon: ShoppingBag, bg: 'bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary' };
      default:
        return { icon: MoreHorizontal, bg: 'bg-surface-variant text-on-surface-variant' };
    }
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return formatCustomCurrency(val, budget?.currency || 'INR');
  };

  // Helper to format date label
  const formatDateLabel = (dateStr: string) => {
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
    
    const yesterdayObj = new Date();
    yesterdayObj.setDate(todayObj.getDate() - 1);
    const yesterdayStr = `${yesterdayObj.getFullYear()}-${String(yesterdayObj.getMonth() + 1).padStart(2, '0')}-${String(yesterdayObj.getDate()).padStart(2, '0')}`;

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    if (dateStr === '2024-10-26') return 'Today';
    if (dateStr === '2024-10-25') return 'Yesterday';
    
    // Fallback format
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const [year, month, day] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${day}`;
  };

  // Get the latest 5 transactions (optionally filtered by activeCategoryFilter)
  const filteredRecentTxs = activeCategoryFilter
    ? transactions.filter(t => t.category === activeCategoryFilter)
    : transactions;

  const recentTransactions = [...filteredRecentTxs]
    .sort((a, b) => {
      const dateA = (a && a.date ? String(a.date) : '');
      const dateB = (b && b.date ? String(b.date) : '');
      return dateB.localeCompare(dateA);
    })
    .slice(0, 4);

  const handleQuickAdd = (title: string, amount: number, category: 'Food' | 'Transport' | 'Shopping' | 'Other') => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    onAddTransaction({
      title,
      amount: -amount,
      category,
      date: todayStr,
      time: nowTime,
      label: 'General',
      notes: 'Quick logged expense'
    });
  };

  // Helper to generate the last 12 months ending with the activeMonth
  const getLast12Months = (endMonth: string) => {
    const list = [];
    const [year, month] = endMonth.split('-').map(Number);
    
    // Generate 12 months in chronological order
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const mLabel = d.toLocaleString('en-IN', { month: 'short' });
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      if (mKey === endMonth) {
        // Current month: use the already-computed totalExpenses (includes subs)
        list.push({ month: mLabel, spend: totalExpenses, isCurrent: true });
      } else {
        // Past months: count transactions + un-logged subscription costs
        const monthTxs = transactions.filter(t => t && t.date && typeof t.date === 'string' && t.date.startsWith(mKey));
        const txExpenses = Math.abs(
          monthTxs.filter(t => Number(t.amount) < 0).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
        );
        const monthSubsTotal = subscriptions
          .filter(s => s && s.isActive !== false)
          .reduce((sum, s) => {
            const isAlreadyLogged = monthTxs.some(t =>
              Number(t.amount) < 0 &&
              isSubscriptionDoubleCounted(s.title, t.title)
            );
            return sum + (isAlreadyLogged ? 0 : (Number(s.amount) || 0));
          }, 0);
        list.push({ month: mLabel, spend: txExpenses + monthSubsTotal, isCurrent: false });
      }
    }
    return list;
  };

  const trendsData = useMemo(() => {
    return getLast12Months(activeMonth);
  }, [activeMonth, transactions, subscriptions]);

  // Maximum value for scaling the bar heights in trends chart (approx 3000 as base minimum)
  const maxSpend = Math.max(...trendsData.map(d => d.spend), 3000);

  // Group transactions of current active period by category (for expense transactions only) with memoization
  const categoryDataMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    const activePeriodTxs = summaryMode === 'monthly' ? currentMonthTxs : weeklyTxs;
    activePeriodTxs.forEach(t => {
      if (Number(t.amount) < 0) {
        const cat = t.category || 'Other';
        const absAmount = Math.abs(Number(t.amount) || 0);
        map[cat] = (map[cat] || 0) + absAmount;
      }
    });

    // Factor active recurring subscriptions into category analysis
    subscriptions.forEach(s => {
      if (s.isActive !== false) {
        const isAlreadyLogged = currentMonthTxs.some(t => 
          Number(t.amount) < 0 &&
          isSubscriptionDoubleCounted(s.title, t.title)
        );
        if (!isAlreadyLogged) {
          const cat = s.category || 'Other';
          const subCost = summaryMode === 'monthly' ? (Number(s.amount) || 0) : (Number(s.amount) || 0) / 4.33;
          map[cat] = (map[cat] || 0) + subCost;
        }
      }
    });
    return map;
  }, [summaryMode, currentMonthTxs, weeklyTxs, subscriptions]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Food':
        return themeColors.primary;
      case 'Transport':
        return themeColors.tertiary;
      case 'Rent':
        return themeColors.secondary;
      case 'Shopping':
        return '#D97706'; // beautiful Amber-600 gold
      default:
        return themeOutline;
    }
  };

  // AI Spender Nudges — computed after categoryDataMap is available
  const getSpenderNudges = () => {
    const nudges: { text: string; type: 'info' | 'warning' | 'success' }[] = [];
    
    if (activeLimit > 0 && activeExpenses > activeLimit) {
      nudges.push({
        text: `You have exceeded your total limit by ${formatCurrency(activeExpenses - activeLimit)}. Try prioritizing essential needs only.`,
        type: 'warning'
      });
    } else if (activeLimit > 0 && percentBudgetSpent > percentMonthElapsed * 1.15) {
      nudges.push({
        text: `Pacing fast: you've spent ${Math.round(percentBudgetSpent)}% of your limit in only ${Math.round(percentMonthElapsed)}% of the month.`,
        type: 'warning'
      });
    }

    // Category limits warning using computed categoryDataMap
    if (budget?.categoryLimits) {
      Object.entries(budget.categoryLimits).forEach(([cat, limit]) => {
        if (!limit) return;
        const spent = categoryDataMap[cat] || 0;
        if (spent > limit) {
          nudges.push({
            text: `Over budget in ${cat}: spent ${formatCurrency(spent)} vs limit ${formatCurrency(limit)}.`,
            type: 'warning'
          });
        } else if (spent > limit * 0.85) {
          nudges.push({
            text: `${cat} limit warning: spent ${Math.round((spent / limit) * 100)}% of your budget.`,
            type: 'info'
          });
        }
      });
    }

    // Positive nudge
    if (netBalance > 0 && activeExpenses < activeLimit * 0.5 && percentMonthElapsed > 50) {
      nudges.push({
        text: `Excellent job! You have saved ${formatCurrency(netBalance)} so far, putting you on track for a high savings rate.`,
        type: 'success'
      });
    }

    // Default tip if no alerts
    if (nudges.length === 0) {
      nudges.push({
        text: "Tip: Click donut chart slices below to instantly filter your transactions list by category.",
        type: 'info'
      });
    }

    return nudges;
  };

  const chartData = useMemo(() => {
    return Object.entries(categoryDataMap).map(([name, value]) => ({
      name,
      value,
      color: getCategoryColor(name)
    })).sort((a, b) => b.value - a.value);
  }, [categoryDataMap, themeColors, themeOutline]);

  const totalSpendingForMonth = chartData.reduce((sum, item) => sum + item.value, 0);

  // Pure-SVG donut: compute arc path descriptor
  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number): string => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const buildDonutSlices = () => {
    if (totalSpendingForMonth === 0 || chartData.length === 0) return [];
    const GAP_DEG = chartData.length > 1 ? 3 : 0;
    const total = totalSpendingForMonth;
    let cursor = -90; // start from top
    return chartData.map((item) => {
      const sweep = (item.value / total) * 360 - GAP_DEG;
      const start = cursor + GAP_DEG / 2;
      const end = start + sweep;
      cursor += (item.value / total) * 360;
      return { ...item, startAngle: start, endAngle: end, sweep };
    });
  };

  const donutSlices = useMemo(buildDonutSlices, [chartData, totalSpendingForMonth]);

  const formatMonthName = (monthKey: string) => {
    const [y, m] = monthKey.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-3.5 sm:space-y-5 pb-20 animate-fade-in">
      
      {/* Hero Section: Total Spending */}
      <section className="bg-surface-container-low/40 p-3 sm:p-4 rounded-2xl border border-outline-variant/25 space-y-2 relative z-20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              {summaryMode === 'monthly' ? 'Monthly Spend' : 'Weekly Spend'}
            </span>
            {summaryMode === 'weekly' && getWeeklyPeriodRange() && (
              <span className="text-[9px] font-bold text-primary bg-primary-container/40 px-1.5 py-0.5 rounded-full border border-primary/10">
                {getWeeklyPeriodRange()}
              </span>
            )}

          </div>

          {/* Controls: Badges Icon + Segmented Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenBadges && (
              <button
                type="button"
                onClick={onOpenBadges}
                aria-label="Financial Discipline Badges"
                title={`Financial Discipline Badges (${unlockedBadgesCount}/6 Mastered)`}
                className="w-6 h-6 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0"
              >
                <Award className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Segmented Toggle Control */}
            <div className="flex bg-surface-container rounded-lg p-0.5 border border-outline-variant/35 shrink-0">
              <button
                id="summary-mode-monthly-btn"
                type="button"
                onClick={() => setSummaryMode('monthly')}
                className={`px-2 py-0.5 rounded-md font-bold text-[9px] sm:text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                  summaryMode === 'monthly'
                    ? 'bg-primary text-on-primary shadow-2xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Monthly
              </button>
              <button
                id="summary-mode-weekly-btn"
                type="button"
                onClick={() => setSummaryMode('weekly')}
                className={`px-2 py-0.5 rounded-md font-bold text-[9px] sm:text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                  summaryMode === 'weekly'
                    ? 'bg-primary text-on-primary shadow-2xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div className="relative inline-flex items-center">
            <span className="font-headline-lg text-xl sm:text-2xl lg:text-3xl font-extrabold text-primary tracking-tight">
              {formatCurrency(activeExpenses)}
            </span>
            <button 
              type="button"
              onClick={() => setShowCalcTooltip(!showCalcTooltip)}
              className="p-1 text-on-surface-variant/60 hover:text-primary transition-colors cursor-pointer shrink-0"
              title="Calculation breakdown"
            >
              <Info className="w-3.5 h-3.5 text-primary" />
            </button>

            {/* MoM Comparison Pill */}
            {summaryMode === 'monthly' && prevMonthExpenses > 0 && (
              <span className={`ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                monthlyDiffPercent <= 0 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}>
                {monthlyDiffPercent <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                <span>{monthlyDiffPercent <= 0 ? `${Math.abs(Math.round(monthlyDiffPercent))}% vs last mo` : `+${Math.round(monthlyDiffPercent)}% vs last mo`}</span>
              </span>
            )}
            
            <AnimatePresence>
              {showCalcTooltip && (
                <div 
                  className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
                  onClick={() => setShowCalcTooltip(false)}
                >
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-sm bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/40 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-outline-variant/20 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-primary/10 rounded-2xl">
                          <Info className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-outfit font-black text-base text-on-surface dark:text-white">
                            Calculation Breakdown
                          </h3>
                          <p className="text-[11px] text-on-surface-variant dark:text-slate-400 font-medium">
                            {summaryMode === 'monthly' ? 'Total Monthly Spending Formula' : 'Total Weekly Spending Formula'}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowCalcTooltip(false)}
                        className="w-8 h-8 rounded-full bg-surface-container-high dark:bg-slate-800 text-on-surface-variant dark:text-slate-300 hover:text-on-surface flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center p-3 rounded-2xl bg-surface-container-low dark:bg-slate-800/60 border border-outline-variant/20">
                        <span className="text-on-surface-variant dark:text-slate-300 font-medium">Logged Purchases</span>
                        <span className="font-mono font-extrabold text-on-surface dark:text-white text-sm">
                          {formatCurrency(Math.abs(currentMonthTxs.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)))}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-3 rounded-2xl bg-surface-container-low dark:bg-slate-800/60 border border-outline-variant/20">
                        <span className="text-on-surface-variant dark:text-slate-300 font-medium">Active Subscriptions</span>
                        <span className="font-mono font-extrabold text-on-surface dark:text-white text-sm">
                          {formatCurrency(activeSubsTotal)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-3.5 rounded-2xl bg-primary/10 border border-primary/20">
                        <span className="font-bold text-primary">Total Calculated Outflow</span>
                        <span className="font-mono font-black text-primary text-base">
                          {formatCurrency(totalExpenses)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCalcTooltip(false)}
                      className="w-full py-3 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-2xl shadow-xs transition-all cursor-pointer"
                    >
                      Got It
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {(() => {
              const comp = getComparisonInfo();
              return (
                <span className={`font-label-md text-[9px] sm:text-[10px] flex items-center gap-0.5 px-2 py-0.5 rounded-full border ${
                  comp.label === 'No comparative data'
                    ? 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                    : comp.isLess
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-error/10 text-error border-error/20'
                }`}>
                  {comp.showIcon && (comp.isLess ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />)}
                  <span>{comp.label}</span>
                </span>
              );
            })()}

            {hasBudget && (
              <span className={`font-label-md text-[9px] sm:text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full border ${budgetHealth.bgClass} ${budgetHealth.colorClass} ${budgetHealth.borderClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  budgetHealth.label === 'On Track' 
                    ? 'bg-emerald-500' 
                    : budgetHealth.label.includes('Caution') 
                    ? 'bg-amber-500 animate-pulse' 
                    : 'bg-error animate-pulse'
                }`} />
                <span>{budgetHealth.label}</span>
              </span>
            )}
          </div>
        </div>
      </section>



      {/* 1-Tap Cockpit Quick Shortcuts */}
      <QuickShortcutsWidget
        onOpenExportAudit={onOpenExportAudit || (() => {})}
        onOpenSms={() => setIsBankSmsOpen(true)}
        onOpenCalendar={onOpenCalendar || (() => {})}
        onOpenAddTx={onAddTransactionClick}
        onOpenInsights={onNavigateToInsights}
        onNavigateToSettings={onNavigateToSettings}
        onScrollToHealthRadar={scrollToHealthRadar}
        onScrollToNoSpend={scrollToNoSpend}
      />

      {/* 1-Tap Quick Presets Micro-Pills */}
      <QuickTemplatesWidget
        templates={budget?.quickTemplates}
        currency={budget?.currency || 'INR'}
        onLogTemplate={(tpl) => {
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const localToday = `${yyyy}-${mm}-${dd}`;

          if (onAddTransaction) {
            onAddTransaction({
              title: tpl.title,
              amount: -Math.abs(tpl.amount),
              category: tpl.category,
              date: localToday,
              time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
              label: 'Personal'
            });
          }
        }}
      />



      {/* High Priority #1: Recent Transactions (Immediate Daily Log Access) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-outfit text-lg text-on-surface font-black tracking-tight">Recent Transactions</h3>
            {activeCategoryFilter && (
              <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-fade-in">
                <span>{activeCategoryFilter}</span>
                <button 
                  onClick={() => setActiveCategoryFilter(null)}
                  className="hover:text-error transition-colors font-black cursor-pointer text-[12px] pl-0.5"
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <button 
            onClick={onNavigateToHistory}
            className="font-label-lg text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            View All
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {recentTransactions.length === 0 ? (
            <div className="p-6 text-center bg-surface-container-lowest border border-outline-variant/30 rounded-2xl space-y-2">
              <p className="text-xs text-on-surface-variant font-medium">No recent transactions logged yet.</p>
              <button
                onClick={onAddTransactionClick}
                className="px-3.5 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-xs"
              >
                + Log First Expense
              </button>
            </div>
          ) : (
            recentTransactions.map((tx) => {
              const config = getCategoryConfig(tx.category);
              const IconComponent = config.icon;
              const isExpense = tx.amount < 0;

              return (
                <div 
                  id={`transaction-row-${tx.id}`}
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="flex items-center justify-between p-2.5 sm:p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30 transition-all cursor-pointer group active:scale-[0.98] active:bg-surface-container-high/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${config.bg} shadow-2xs shrink-0`}>
                      <IconComponent className="w-4 h-4 text-on-surface" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-title-md text-xs sm:text-sm text-on-surface font-bold truncate group-hover:text-primary transition-colors">
                        {tx.title}
                      </div>
                      <div className="text-[11px] text-on-surface-variant font-medium truncate">
                        {tx.category} • {formatDateLabel(tx.date)}, {tx.time}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-2 flex flex-col items-end shrink-0">
                    <div className={`font-mono text-xs sm:text-sm font-bold ${isExpense ? 'text-on-surface' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {isExpense ? '' : '+'}{formatCurrency(Math.abs(tx.amount))}
                    </div>
                    <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[9px] font-medium bg-surface-variant text-on-surface-variant rounded-md">
                      {tx.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>



      {/* AI Spending Insights (Nudges) */}
      {(() => {
        const nudges = getSpenderNudges();
        if (nudges.length === 0) return null;
        return (
          <div className="grid grid-cols-1 gap-2.5">
            {nudges.map((nudge, idx) => (
              <div 
                key={idx}
                className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 shadow-2xs animate-fade-in ${
                  nudge.type === 'warning' 
                    ? 'bg-error/5 text-error border-error/15 dark:bg-error/10 dark:text-error-container' 
                    : nudge.type === 'success'
                    ? 'bg-emerald-500/5 text-emerald-700 border-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-primary/5 text-primary border-primary/15 dark:bg-primary/10 dark:text-primary-container'
                }`}
              >
                <span className="p-1 rounded-full bg-surface-container-lowest shrink-0">
                  {nudge.type === 'warning' ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-error" />
                  ) : nudge.type === 'success' ? (
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  )}
                </span>
                <div className="flex-1 leading-normal font-medium">
                  {nudge.text}
                </div>
              </div>
            ))}
          </div>
        );
      })()}



      {/* Budget Health Radial Progress Section */}
      {hasBudget && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-outfit text-lg text-on-surface font-black tracking-tight">Budget Health</h3>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              (activeExpenses / (activeLimit || 3000)) * 100 > 100 
                ? 'bg-error/10 text-error border-error/20' 
                : (activeExpenses / (activeLimit || 3000)) * 100 > 85 
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  : 'bg-primary/10 text-primary border-primary/20'
            }`}>
              {(activeExpenses / (activeLimit || 3000)) * 100 > 100 
                ? 'Over Budget' 
                : (activeExpenses / (activeLimit || 3000)) * 100 > 85 
                  ? 'Approaching Limit' 
                  : 'Healthy Budget'
              }
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Radial Chart Area */}
            <div className="md:col-span-5 h-44 relative flex items-center justify-center">
              <div className="w-40 h-40 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="75%" 
                    outerRadius="100%" 
                    barSize={12} 
                    data={[
                      {
                        name: 'Spent',
                        value: Math.min(100, (activeExpenses / (activeLimit || 3000)) * 100),
                        fill: (activeExpenses / (activeLimit || 3000)) * 100 > 100 
                          ? themeError 
                          : (activeExpenses / (activeLimit || 3000)) * 100 > 85 
                            ? '#D97706' 
                            : themeColors.primary
                      }
                    ]} 
                    startAngle={90} 
                    endAngle={-270}
                  >
                    <PolarAngleAxis
                      type="number"
                      domain={[0, 100]}
                      angleAxisId={0}
                      tick={false}
                    />
                    <RadialBar
                      background={{ fill: 'rgba(0, 0, 0, 0.05)', stroke: 'none', strokeWidth: 0 }}
                      dataKey="value"
                      cornerRadius={6}
                      stroke="none"
                      strokeWidth={0}
                      activeShape={false}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                
                {/* Inner Center Text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider leading-none">
                    Spent
                  </span>
                  <span className={`text-2xl font-black font-mono mt-1 leading-none ${
                    (activeExpenses / (activeLimit || 3000)) * 100 > 100 ? 'text-error animate-pulse' : 'text-on-surface'
                  }`}>
                    {Math.round((activeExpenses / (activeLimit || 3000)) * 100)}%
                  </span>
                  <span className="text-[9px] text-on-surface-variant font-medium mt-1 leading-none">
                    of {formatCurrency(activeLimit || 3000)}
                  </span>
                </div>
              </div>
            </div>

            {/* Budget Statistics Area */}
            <div className="md:col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surface-container-high/60 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Total Spent</span>
                  <p className="text-base font-extrabold text-on-surface font-mono">{formatCurrency(activeExpenses)}</p>
                  <span className="text-[9px] text-on-surface-variant/80 block">
                    {summaryMode === 'monthly' ? 'Incl. Subscriptions' : 'Incl. Subscriptions (Pro-rated)'}
                  </span>
                </div>
                <div className="p-3 bg-surface-container-high/60 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    {summaryMode === 'monthly' ? 'Monthly Limit' : 'Weekly Limit'}
                  </span>
                  <p className="text-base font-extrabold text-on-surface font-mono">{formatCurrency(activeLimit || 3000)}</p>
                  <span className="text-[9px] text-on-surface-variant/80 block">
                    {summaryMode === 'monthly' ? 'Configurable in Settings' : 'Estimated (1/4.33 of monthly)'}
                  </span>
                </div>
              </div>

              {/* Narrative Context */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-on-surface-variant leading-relaxed">
                {(activeExpenses / (activeLimit || 3000)) * 100 > 100 ? (
                  <p>
                    ⚠️ You have exceeded your {summaryMode} limit by <strong className="text-error font-bold">{formatCurrency(activeExpenses - (activeLimit || 3000))}</strong>. We strongly recommend visiting the settings tab or pruning non-essential subscription costs to stabilize your financial runway.
                  </p>
                ) : (activeExpenses / (activeLimit || 3000)) * 100 > 85 ? (
                  <p>
                    ⚠️ You have utilized <strong className="font-bold">{Math.round((activeExpenses / (activeLimit || 3000)) * 100)}%</strong> of your {summaryMode} allocation. There is <strong className="font-bold text-primary">{formatCurrency((activeLimit || 3000) - activeExpenses)}</strong> remaining. Try to avoid high-discretionary purchases until the next billing cycle.
                  </p>
                ) : (
                  <p>
                    🟢 Your {summaryMode} budget health is currently <strong className="text-primary font-bold">Excellent</strong>! You have only spent <strong className="font-bold">{Math.round((activeExpenses / (activeLimit || 3000)) * 100)}%</strong> of your target cap. You have a comfortable buffer of <strong className="font-bold text-primary">{formatCurrency((activeLimit || 3000) - activeExpenses)}</strong> left.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Visual Summary ─────────────────────────────────────── */}
      <section className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-outfit text-lg text-on-surface font-black tracking-tight">Visual Summary</h3>
            {activeCategoryFilter && (
              <button
                type="button"
                onClick={() => { triggerHaptic('light'); setActiveCategoryFilter(null); setHoveredCategory(null); }}
                className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full border border-primary/20 transition-all cursor-pointer"
              >
                <span>{activeCategoryFilter}</span>
                <span className="text-xs leading-none">×</span>
              </button>
            )}
          </div>

          {/* Month selector */}
          {availableMonths.length > 1 ? (
            <div className="relative">
              <button
                id="dashboard-month-select"
                type="button"
                onClick={() => setIsMonthSelectOpen(!isMonthSelectOpen)}
                className="text-xs text-on-surface-variant font-bold bg-surface-container-high px-3.5 py-1.5 rounded-full border border-outline-variant/35 hover:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{formatMonthName(activeMonth)}</span>
                <span className={`text-[8px] text-on-surface-variant transition-transform duration-200 ${isMonthSelectOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {isMonthSelectOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMonthSelectOpen(false)}></div>
                  <div className="absolute right-0 mt-1 w-36 bg-surface-container-high border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-48 overflow-y-auto">
                    {availableMonths.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSelectedMonthState(m);
                          setIsMonthSelectOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors ${
                          activeMonth === m
                            ? 'bg-primary text-on-primary'
                            : 'text-on-surface hover:bg-surface-variant/40'
                        }`}
                      >
                        {formatMonthName(m)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <span className="text-xs text-on-surface-variant font-medium bg-surface-container-high px-2.5 py-1.5 rounded-full border border-outline-variant/20">
              {formatMonthName(activeMonth)}
            </span>
          )}
        </div>
        {/* Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-sm">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
              <div className="p-3 bg-surface-container-high rounded-full text-on-surface-variant">
                <Coins className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-bold text-on-surface">No expenses logged yet</p>
              <p className="text-xs text-on-surface-variant max-w-xs">
                Add your transactions for the active month to view the category distribution.
              </p>
            </div>
          ) : (() => {
            const CX = 90, CY = 90, R_OUTER = 72, R_INNER = 50;
            const focusedName = hoveredCategory || activeCategoryFilter;
            const focusedItem = focusedName ? chartData.find(d => d.name === focusedName) : null;

            const slicePath = (s: typeof donutSlices[0], outerR: number, innerR: number) => {
              const toR = (d: number) => (d * Math.PI) / 180;
              const ox1 = CX + outerR * Math.cos(toR(s.startAngle));
              const oy1 = CY + outerR * Math.sin(toR(s.startAngle));
              const ox2 = CX + outerR * Math.cos(toR(s.endAngle));
              const oy2 = CY + outerR * Math.sin(toR(s.endAngle));
              const ix1 = CX + innerR * Math.cos(toR(s.endAngle));
              const iy1 = CY + innerR * Math.sin(toR(s.endAngle));
              const ix2 = CX + innerR * Math.cos(toR(s.startAngle));
              const iy2 = CY + innerR * Math.sin(toR(s.startAngle));
              const lg = s.sweep > 180 ? 1 : 0;
              return [
                `M ${ox1} ${oy1}`,
                `A ${outerR} ${outerR} 0 ${lg} 1 ${ox2} ${oy2}`,
                `L ${ix1} ${iy1}`,
                `A ${innerR} ${innerR} 0 ${lg} 0 ${ix2} ${iy2}`,
                'Z'
              ].join(' ');
            };

            return (
              <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-center">

                {/* ── Pure SVG Donut ── */}
                <div className="shrink-0 flex items-center justify-center">
                  <svg
                    width="180" height="180"
                    viewBox="0 0 180 180"
                    className="overflow-visible"
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <defs>
                      {donutSlices.map((s) => (
                        <filter key={`glow-${s.name}`} id={`glow-${s.name.replace(/\s+/g, '-')}`} x="-30%" y="-30%" width="160%" height="160%">
                          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor={s.color} floodOpacity="0.45" />
                        </filter>
                      ))}
                    </defs>

                    {donutSlices.map((s) => {
                      const isActive = s.name === focusedName;
                      const anyFocused = Boolean(focusedName);
                      const outerR = isActive ? R_OUTER + 9 : R_OUTER;
                      const innerR = isActive ? R_INNER - 3 : R_INNER;
                      return (
                        <path
                          key={s.name}
                          d={slicePath(s, outerR, innerR)}
                          fill={s.color}
                          opacity={anyFocused ? (isActive ? 1 : 0.28) : 1}
                          filter={isActive ? `url(#glow-${s.name.replace(/\s+/g, '-')})` : undefined}
                          style={{
                            transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={() => setHoveredCategory(s.name)}
                          onMouseLeave={() => setHoveredCategory(null)}
                          onClick={() => {
                            triggerHaptic('light');
                            const next = activeCategoryFilter === s.name ? null : s.name;
                            setActiveCategoryFilter(next);
                            setHoveredCategory(next);
                          }}
                        />
                      );
                    })}

                    {/* Center content via foreignObject */}
                    <foreignObject x="36" y="36" width="108" height="108">
                      <div style={{ width: '108px', height: '108px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', userSelect: 'none', textAlign: 'center', padding: '4px' }}>
                        {focusedItem ? (
                          <>
                            <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: focusedItem.color, lineHeight: 1.2, maxWidth: '96px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {focusedItem.name}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--color-on-surface,#1c1b1f)', marginTop: '3px', lineHeight: 1.1, maxWidth: '96px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {formatCurrency(focusedItem.value)}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: focusedItem.color, marginTop: '4px', background: `${focusedItem.color}22`, padding: '1px 6px', borderRadius: '99px', lineHeight: 1.6 }}>
                              {totalSpendingForMonth > 0 ? ((focusedItem.value / totalSpendingForMonth) * 100).toFixed(1) : 0}%
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant,#49454f)', lineHeight: 1.2 }}>
                              Total
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--color-on-surface,#1c1b1f)', marginTop: '3px', lineHeight: 1.1, maxWidth: '96px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {formatCurrency(totalSpendingForMonth)}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--color-on-surface-variant,#49454f)', marginTop: '4px', opacity: 0.75 }}>
                              {chartData.length} {chartData.length === 1 ? 'category' : 'categories'}
                            </span>
                          </>
                        )}
                      </div>
                    </foreignObject>
                  </svg>
                </div>

                {/* ── Category Legend ── */}
                <div
                  className="flex-1 w-full space-y-1 max-h-52 overflow-y-auto"
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  {chartData.map((item) => {
                    const percent = totalSpendingForMonth > 0
                      ? ((item.value / totalSpendingForMonth) * 100).toFixed(1)
                      : '0';
                    const hasLimit = budget?.categoryLimits && budget.categoryLimits[item.name] !== undefined;
                    const limitVal = hasLimit ? (budget.categoryLimits?.[item.name] || 0) : 0;
                    const isOver = hasLimit && item.value > limitVal;
                    const isSelected = activeCategoryFilter === item.name;
                    const isHov = hoveredCategory === item.name;
                    const isActive = isSelected || isHov;

                    return (
                      <div
                        key={item.name}
                        onMouseEnter={() => setHoveredCategory(item.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() => {
                          triggerHaptic('light');
                          const next = isSelected ? null : item.name;
                          setActiveCategoryFilter(next);
                          setHoveredCategory(next);
                        }}
                        style={{ transition: 'all 0.18s ease' }}
                        className={`
                          relative flex flex-col gap-1 pl-4 pr-3 py-2 rounded-xl cursor-pointer border
                          ${isSelected
                            ? 'border-primary/40 bg-primary/8 shadow-sm'
                            : isHov
                              ? 'border-outline-variant/40 bg-surface-container shadow-xs -translate-y-px'
                              : 'border-transparent'
                          }
                        `}
                      >
                        {/* left accent bar */}
                        <div
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                          style={{
                            backgroundColor: item.color,
                            opacity: isActive ? 1 : 0.3,
                            transform: isActive ? 'scaleY(1)' : 'scaleY(0.5)',
                            transformOrigin: 'center',
                            transition: 'all 0.18s ease',
                          }}
                        />

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: item.color,
                                boxShadow: isActive ? `0 0 0 3px ${item.color}30` : 'none',
                                transform: isActive ? 'scale(1.35)' : 'scale(1)',
                                transition: 'all 0.18s ease',
                              }}
                            />
                            <span className={`text-xs truncate transition-all duration-150 ${isActive ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant'}`}>
                              {item.name}
                            </span>
                            {isSelected && (
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${item.color}20`, color: item.color }}>
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`font-mono text-xs transition-all duration-150 ${isActive ? 'font-black text-on-surface' : 'font-bold text-on-surface/60'}`}>
                              {formatCurrency(item.value)}
                            </span>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[36px] text-center transition-all duration-150"
                              style={{
                                background: isActive ? `${item.color}25` : 'var(--color-surface-container-high,#ece6f0)',
                                color: isActive ? item.color : 'var(--color-on-surface-variant,#49454f)',
                              }}
                            >
                              {percent}%
                            </span>
                          </div>
                        </div>

                        {/* Budget bar */}
                        {hasLimit && hasBudget && (
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-[9px] font-semibold">
                              <span className={isOver ? 'text-error' : 'text-primary'}>
                                {isOver ? `Over by ${formatCurrency(item.value - limitVal)}` : `${limitVal > 0 ? Math.round((item.value / limitVal) * 100) : 0}% of limit`}
                              </span>
                              <span className="font-mono text-on-surface-variant">{formatCurrency(limitVal)}</span>
                            </div>
                            <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-error animate-pulse' : 'bg-primary'}`}
                                style={{ width: `${Math.min(100, (item.value / limitVal) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })()}
        </div>
      </section>

      {/* Subscriptions Section (Collapsible for Clean UX) */}
      <section className="space-y-3 bg-surface-container-low/60 rounded-3xl p-4 border border-outline-variant/25">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsSubsExpanded(!isSubsExpanded)}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-outfit text-base text-on-surface font-black tracking-tight flex items-center gap-2">
                Subscriptions
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {subscriptions.filter(s => s.isActive !== false).length} Active
                </span>
              </h3>
              <span className="text-[11px] text-on-surface-variant font-medium">
                {formatCurrency(activeSubsTotal)}/month recurring
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSubsExpanded(true);
                setIsAddSubOpen(!isAddSubOpen);
              }}
              className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              {isAddSubOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isAddSubOpen ? 'Cancel' : 'Add'}</span>
            </button>
            <span className="text-xs font-bold text-on-surface-variant p-1">
              {isSubsExpanded ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {isSubsExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2">

        {/* Add Subscription Inline Form */}
        {isAddSubOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant/50 shadow-sm space-y-3"
          >
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">New Recurring Subscription</h4>
            <form onSubmit={handleAddSubSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Title / Service Name</label>
                  <input 
                    type="text"
                    value={newSubTitle}
                    onChange={(e) => setNewSubTitle(e.target.value)}
                    placeholder="e.g. Netflix, Gym, AWS"
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Monthly Cost ({budget?.currency || 'INR'})</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={newSubAmount}
                    onChange={(e) => setNewSubAmount(e.target.value)}
                    placeholder="e.g. 199.00"
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Budget Category</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                      className="w-full flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-pointer text-left font-medium"
                    >
                      <span>{newSubCategory}</span>
                      <span className={`text-[8px] text-on-surface-variant transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {isCategoryOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsCategoryOpen(false)}></div>
                        <div className="absolute left-0 right-0 mt-1 bg-surface-container-high border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-40 overflow-y-auto">
                          {['Food', 'Transport', 'Rent', 'Shopping', 'Other'].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setNewSubCategory(cat as any);
                                setIsCategoryOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                                newSubCategory === cat
                                  ? 'bg-primary text-on-primary'
                                  : 'text-on-surface hover:bg-surface-variant/40'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Billing Day */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Billing Day of Month (1-31)</label>
                  <input 
                    type="number"
                    min="1"
                    max="31"
                    value={newSubDate}
                    onChange={(e) => setNewSubDate(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary transition-all font-mono"
                  />
                </div>
              </div>

              {subError && (
                <div className="text-[10px] text-error font-semibold bg-error-container/20 p-2 rounded-lg border border-error/20 flex items-center gap-1.5">
                  <span>⚠️</span> {subError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddSubOpen(false)}
                  className="px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-highest rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary/95 transition-colors shadow-xs cursor-pointer"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Subscriptions List Container */}
        <div className="space-y-2">
          {subscriptions.length === 0 ? (
            <div className="p-5 text-center bg-surface-container-low border border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center space-y-2">
              <CreditCard className="w-8 h-8 opacity-30 text-primary animate-pulse" />
              <p className="text-xs font-bold text-on-surface">No recurring subscriptions defined</p>
              <p className="text-[10px] text-on-surface-variant max-w-xs">
                Add subscriptions like Netflix, Spotify, or Gym memberships to automatically factor them into your monthly budget.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const activeTimelineSubs = subscriptions
                  .filter(s => s.isActive)
                  .sort((a, b) => {
                    const dayA = a.billingDate;
                    const dayB = b.billingDate;
                    const currentDay = today.getDate();
                    const diffA = dayA >= currentDay ? dayA - currentDay : dayA + totalDaysInMonth - currentDay;
                    const diffB = dayB >= currentDay ? dayB - currentDay : dayB + totalDaysInMonth - currentDay;
                    return diffA - diffB;
                  });

                if (activeTimelineSubs.length === 0) return null;
                return (
                  <div className="space-y-2 pb-1.5 border-b border-outline-variant/15">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Upcoming Billing Timeline</span>
                    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
                      {activeTimelineSubs.map((sub) => {
                        const config = getCategoryConfig(sub.category);
                        const IconComponent = config.icon;
                        
                        const currentDay = today.getDate();
                        const billDay = sub.billingDate;
                        const daysUntil = billDay >= currentDay ? billDay - currentDay : billDay + totalDaysInMonth - currentDay;
                        const isNear = daysUntil <= 3;
                        
                        return (
                          <div 
                            key={`timeline-${sub.id}`}
                            className={`flex-none w-28 p-3 rounded-2xl border snap-start flex flex-col justify-between h-20 transition-all ${
                              isNear 
                                ? 'bg-error/5 text-error border-error/20 dark:bg-error/10 dark:text-error-container' 
                                : 'bg-surface-container-lowest border-outline-variant/25 text-on-surface hover:border-primary/30'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[9px] font-bold">
                              <span className="uppercase font-mono">
                                {isNear ? 'Due Soon' : `In ${daysUntil} days`}
                              </span>
                              <span className={`w-1.5 h-1.5 rounded-full ${isNear ? 'bg-error animate-pulse' : 'bg-primary'}`} />
                            </div>
                            
                            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${config.bg} text-[9px]`}>
                                <IconComponent className="w-2.5 h-2.5" />
                              </div>
                              <span className="text-[10px] font-bold truncate">{sub.title}</span>
                            </div>
                            
                            <div className="text-[10px] font-bold text-right font-mono mt-1">
                              {formatCurrency(sub.amount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
              {subscriptions.map((sub) => {
                const config = getCategoryConfig(sub.category);
                const IconComponent = config.icon;
                
                return (
                  <div 
                    key={sub.id}
                    id={`subscription-row-${sub.id}`}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      sub.isActive 
                        ? 'bg-surface-container-low border-outline-variant/30' 
                        : 'bg-surface-container-lowest/40 border-dashed border-outline-variant/25 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Category Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.bg} shadow-xs`}>
                        <IconComponent className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-title-md text-sm text-on-surface font-bold truncate">
                            {sub.title}
                          </span>
                          <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-surface-variant text-on-surface-variant rounded-md">
                            {sub.category || 'Other'}
                          </span>
                        </div>
                        <div className="text-[10px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>Renews on day {sub.billingDate} of the month</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Price Tag */}
                      <div className="text-right font-mono text-xs font-bold text-on-surface">
                        {formatCurrency(sub.amount)}
                        <span className="text-[9px] text-on-surface-variant font-sans font-medium block">/ month</span>
                      </div>

                      {/* Active Status Switch Button */}
                      <button
                        type="button"
                        onClick={() => onUpdateSubscription(sub.id, { isActive: !sub.isActive })}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-hidden ${
                          sub.isActive ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        title={sub.isActive ? "Deactivate Recurring Subscription" : "Activate Recurring Subscription"}
                      >
                        <div 
                          className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                            sub.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      {/* Delete Action */}
                      <button
                        type="button"
                        onClick={() => setSubToDeleteId(sub.id)}
                        className="p-1.5 text-on-surface-variant/70 hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Subscription"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Total Summary Footer */}
              <div className="p-3 bg-surface-container-highest/40 rounded-2xl border border-outline-variant/20 flex justify-between items-center text-xs">
                <span className="text-on-surface-variant font-medium flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  Monthly Commitments: <strong className="text-on-surface">{subscriptions.filter(s => s.isActive !== false).length} active</strong>
                </span>
                <span className="font-mono font-bold text-primary">
                  {formatCurrency(activeSubsTotal)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )}
</section>

      {/* Savings Goals Tracker Section (Collapsible for Clean UX) */}
      <section className="space-y-3 bg-surface-container-low/60 rounded-3xl p-4 border border-outline-variant/25">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsGoalsExpanded(!isGoalsExpanded)}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-outfit text-base text-on-surface font-black tracking-tight flex items-center gap-2">
                Savings Goals
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {savingsGoals.length} Targets
                </span>
              </h3>
              <span className="text-[11px] text-on-surface-variant font-medium">
                {formatCurrency(savingsGoals.reduce((s, g) => s + (g.currentAmount || 0), 0))} accumulated
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsGoalsExpanded(true);
                setIsAddGoalOpen(!isAddGoalOpen);
              }}
              className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              {isAddGoalOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isAddGoalOpen ? 'Cancel' : 'Create'}</span>
            </button>
            <span className="text-xs font-bold text-on-surface-variant p-1">
              {isGoalsExpanded ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {isGoalsExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2">

        {/* Add Goal Inline Form */}
        {isAddGoalOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-surface-container-high border border-outline-variant/50 shadow-sm space-y-3"
          >
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <Target className="w-4 h-4" /> New Savings Target
            </h4>
            <form onSubmit={handleAddGoalSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Goal Name</label>
                  <input 
                    type="text"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="e.g. Dream Laptop, Trip to Bali"
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Target Amount (INR)</label>
                  <input 
                    type="number"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    placeholder="e.g. 75000"
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase">Target Date (Optional)</label>
                <input 
                  type="date"
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary transition-all font-mono"
                />
              </div>

              {goalError && (
                <div className="text-[10px] text-error font-semibold bg-error-container/20 p-2 rounded-lg border border-error/20 flex items-center gap-1.5">
                  <span>⚠️</span> {goalError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddGoalOpen(false)}
                  className="px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-highest rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary/95 transition-colors shadow-xs cursor-pointer"
                >
                  Create Target
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Goals List */}
        <div className="space-y-3">
          {savingsGoals.length === 0 ? (
            <div className="p-5 text-center bg-surface-container-low border border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center space-y-2">
              <PiggyBank className="w-8 h-8 opacity-30 text-primary" />
              <p className="text-xs font-bold text-on-surface">No savings goals defined</p>
              <p className="text-[10px] text-on-surface-variant max-w-xs">
                Create structured goals to put aside income for future desires without exceeding daily spending rules.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {savingsGoals.map((goal) => {
                const percent = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
                const isAdjusting = activeAdjustingGoalId === goal.id;
                
                return (
                  <div 
                    key={goal.id}
                    className="p-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl flex flex-col gap-3 transition-all hover:border-outline-variant/65 shadow-xs"
                  >
                     <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-title-md text-sm font-bold text-on-surface flex items-center gap-1.5 truncate">
                          {goal.title}
                        </h4>
                        {goal.targetDate && (
                          <p className="text-[10px] text-on-surface-variant/85 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-primary" /> Target: {new Date(goal.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="font-mono text-xs font-black text-primary">
                            {formatCurrency(goal.currentAmount)}
                          </span>
                          <span className="text-[9px] text-on-surface-variant/80">
                            of {formatCurrency(goal.targetAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Radial Progress Gauge */}
                      <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="19"
                            className="stroke-surface-container/60 dark:stroke-surface-container-high/60"
                            strokeWidth="3.5"
                            fill="transparent"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="19"
                            className="stroke-primary transition-all duration-700 ease-out"
                            strokeWidth="3.5"
                            strokeDasharray={2 * Math.PI * 19}
                            strokeDashoffset={2 * Math.PI * 19 * (1 - percent / 100)}
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>
                        <span className="absolute text-[9px] font-black text-primary font-mono">{percent}%</span>
                      </div>
                    </div>

                    {/* Quick Adjust Buttons */}
                    <div className="flex items-center justify-between border-t border-outline-variant/15 pt-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAdjustingGoalId(isAdjusting && adjustType === 'add' ? null : goal.id);
                            setAdjustType('add');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                            isAdjusting && adjustType === 'add'
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          + Contribute
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAdjustingGoalId(isAdjusting && adjustType === 'withdraw' ? null : goal.id);
                            setAdjustType('withdraw');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                            isAdjusting && adjustType === 'withdraw'
                              ? 'bg-error text-on-error'
                              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          - Withdraw
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1 text-on-surface-variant/70 hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Dynamic Contribute / Withdraw Form */}
                    {isAdjusting && (
                      <motion.form 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        onSubmit={handleAdjustGoal}
                        className="bg-surface-container border border-outline-variant/20 rounded-xl p-3 space-y-2 mt-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                            {adjustType === 'add' ? 'Contribute to Goal' : 'Withdraw from Goal'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveAdjustingGoalId(null)}
                            className="text-[10px] text-on-surface-variant hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">₹</span>
                            <input 
                              type="number"
                              value={adjustAmount}
                              onChange={(e) => setAdjustAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-6 pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs text-on-surface focus:outline-hidden"
                              autoFocus
                            />
                          </div>
                          <button
                            type="submit"
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer ${
                              adjustType === 'add' ? 'bg-primary hover:bg-primary/95' : 'bg-error hover:bg-error/95'
                            }`}
                          >
                            Save
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    )}
  </section>





      {/* Transaction Detail Bottom Sheet Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div 
            onClick={() => setSelectedTx(null)}
            className="absolute inset-0"
          ></div>
          <div className="relative w-full sm:max-w-md bg-surface-container-lowest rounded-t-3xl sm:rounded-2xl border border-outline-variant/50 shadow-2xl p-6 space-y-6 z-10 animate-slide-up sm:animate-scale-up">
            
            {/* Modal Drag Handle/Header */}
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Transaction Detail
              </h4>
              <button 
                id="close-tx-details"
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-full hover:bg-surface-container-high transition-colors"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {/* Payee Amount Section */}
            <div className="text-center py-4 bg-surface-container-low rounded-2xl border border-outline-variant/30">
              <p className="text-xs text-on-surface-variant uppercase font-semibold tracking-wider">
                {selectedTx.title}
              </p>
              <p className={`text-3xl font-extrabold mt-1 ${selectedTx.amount < 0 ? 'text-on-surface' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {selectedTx.amount < 0 ? '' : '+'}{formatCurrency(Math.abs(selectedTx.amount))}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-surface-variant rounded-full text-xs font-semibold text-on-surface-variant">
                <span>{selectedTx.category}</span>
                <span>•</span>
                <span>{selectedTx.label}</span>
              </div>
            </div>

            {/* Details Fields */}
            <div className="space-y-3.5 text-sm">
              <div className="flex items-center gap-3 text-on-surface-variant">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-semibold text-on-surface w-20">Date:</span>
                <span>{selectedTx.date}</span>
              </div>
              <div className="flex items-center gap-3 text-on-surface-variant">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-semibold text-on-surface w-20">Time:</span>
                <span>{selectedTx.time}</span>
              </div>
              {selectedTx.notes && (
                <div className="flex items-start gap-3 text-on-surface-variant border-t border-outline-variant/20 pt-3">
                  <FileText className="w-4 h-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold text-on-surface block mb-1">Notes:</span>
                    <p className="text-xs leading-relaxed text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20">
                      {selectedTx.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Receipt Preview if attached */}
              {selectedTx.receiptUrl && (
                <div className="border-t border-outline-variant/20 pt-3 space-y-1.5">
                  <span className="font-semibold text-on-surface text-xs block">Attached Receipt:</span>
                  <div className="relative rounded-xl overflow-hidden border border-outline-variant max-h-40 bg-surface-container">
                    <img 
                      src={selectedTx.receiptUrl} 
                      alt="Receipt detail" 
                      className="w-full h-full object-contain max-h-40"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button 
                id="delete-tx-button"
                onClick={() => {
                  setTxToDelete(selectedTx);
                }}
                className="flex-1 py-2.5 px-4 bg-error-container text-on-error-container hover:bg-error/15 border border-error/20 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete Transaction
              </button>
              <button 
                id="close-tx-modal"
                onClick={() => setSelectedTx(null)}
                className="py-2.5 px-6 bg-surface-container-high hover:bg-surface-container-highest rounded-full text-xs font-semibold text-on-surface transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog for Savings Goal Deletion */}
      <AnimatePresence>
        {goalToDeleteId && (() => {
          const goalToDelete = savingsGoals.find(g => g.id === goalToDeleteId);
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-surface-container rounded-3xl p-6 max-w-sm w-full border border-outline-variant/30 shadow-2xl text-center space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto">
                  <PiggyBank className="w-6 h-6 text-error" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-base text-on-surface">Delete Savings Goal?</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Are you sure you want to delete <strong className="font-semibold text-on-surface">"{goalToDelete?.title || 'this goal'}"</strong>? All progress will be removed.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => setGoalToDeleteId(null)}
                    className="flex-1 py-2 rounded-full bg-surface-container-highest hover:bg-surface-variant/40 text-on-surface text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onUpdateSavingsGoals(savingsGoals.filter(g => g.id !== goalToDeleteId));
                      setGoalToDeleteId(null);
                    }}
                    className="flex-1 py-2 rounded-full bg-error text-on-error hover:bg-error/90 text-xs font-black cursor-pointer transition-colors"
                  >
                    Delete Goal
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Custom Confirmation Dialog for Transaction Deletion */}
      <AnimatePresence>
        {txToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-surface-container rounded-3xl p-6 max-w-sm w-full border border-outline-variant/30 shadow-2xl text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-error" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-base text-on-surface">Delete Transaction?</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Are you sure you want to delete <strong className="font-semibold text-on-surface">"{txToDelete.title}"</strong>? This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => setTxToDelete(null)}
                  className="flex-1 py-2 rounded-full bg-surface-container-highest hover:bg-surface-variant/40 text-on-surface text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteTransaction(txToDelete.id);
                    setTxToDelete(null);
                    if (selectedTx && selectedTx.id === txToDelete.id) {
                      setSelectedTx(null);
                    }
                  }}
                  className="flex-1 py-2 rounded-full bg-error text-on-error hover:bg-error/90 text-xs font-black cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Dialog for Subscription Deletion */}
      <AnimatePresence>
        {subToDeleteId && (() => {
          const subToDelete = subscriptions.find(s => s.id === subToDeleteId);
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-surface-container rounded-3xl p-6 max-w-sm w-full border border-outline-variant/30 shadow-2xl text-center space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto">
                  <CreditCard className="w-6 h-6 text-error" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-base text-on-surface">Delete Recurring Expense?</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Are you sure you want to delete <strong className="font-semibold text-on-surface">"{subToDelete?.title || 'this subscription'}"</strong>? It will be removed from your recurring monthly commitments.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => setSubToDeleteId(null)}
                    className="flex-1 py-2 rounded-full bg-surface-container-highest hover:bg-surface-variant/40 text-on-surface text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDeleteSubscription(subToDeleteId);
                      setSubToDeleteId(null);
                    }}
                    className="flex-1 py-2 rounded-full bg-error text-on-error hover:bg-error/90 text-xs font-black cursor-pointer transition-colors"
                  >
                    Delete Expense
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
