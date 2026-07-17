import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Transaction, UserProfile, BudgetConfig, Subscription } from '../types';
import { COLOR_PRESETS } from '../theme';
import { 
  TrendingDown, 
  TrendingUp, 
  ArrowDown, 
  ArrowUp, 
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
  Target
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
  themePresetId?: string;
  isDark?: boolean;
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
  themePresetId,
  isDark
}: DashboardTabProps) {
  // Dynamically look up active theme/preset hex colors to avoid d3-color oklch parsing errors
  const activeThemePresetId = themePresetId || localStorage.getItem('spendtrack_theme_preset') || 'navy';
  const activeIsDark = isDark !== undefined ? isDark : document.documentElement.classList.contains('dark');
  const activePreset = COLOR_PRESETS.find(p => p.id === activeThemePresetId) || COLOR_PRESETS[0];
  const themeColors = activeIsDark ? activePreset.dark : activePreset.light;
  const themeOutline = activeIsDark ? '#9F9483' : '#8C8170';
  const themeError = activeIsDark ? '#EC9A97' : '#A3483B';

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Subscription inline form states
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubCategory, setNewSubCategory] = useState<'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other'>('Other');
  const [newSubDate, setNewSubDate] = useState('1');
  const [subError, setSubError] = useState('');

  const handleAddSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTitle.trim()) {
      setSubError('Please enter a subscription title.');
      return;
    }
    const amt = parseFloat(newSubAmount);
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
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const handleAddGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) {
      setGoalError('Please enter a goal title.');
      return;
    }
    const tgt = parseFloat(newGoalTarget);
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
    const amount = parseFloat(adjustAmount);
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
  
  const availableMonths = Array.from(new Set(transactions.map(t => t.date.substring(0, 7)))).sort((a, b) => b.localeCompare(a));
  const [selectedMonthState, setSelectedMonthState] = useState<string | null>(null);
  const activeMonth = selectedMonthState || availableMonths[0] || currentRealMonth;
  const [summaryMode, setSummaryMode] = useState<'monthly' | 'weekly'>('monthly');

  // Filter transactions for the current active month
  const currentMonthTxs = transactions.filter(t => t.date.startsWith(activeMonth));
  
  // Active subscriptions total recurring monthly expense (guarded against double-counting)
  const activeSubsTotal = subscriptions
    .filter(s => s.isActive)
    .reduce((sum, s) => {
      const isAlreadyLogged = currentMonthTxs.some(t => 
        t.amount < 0 &&
        (t.label === 'Subscription' || t.title.toLowerCase().includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(t.title.toLowerCase()))
      );
      return sum + (isAlreadyLogged ? 0 : s.amount);
    }, 0);

  // Totals
  const totalExpenses = Math.abs(
    currentMonthTxs
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  ) + activeSubsTotal;

  // Helper to get weekly transactions from current month's transactions
  const getWeeklyTransactions = (txs: Transaction[]) => {
    if (txs.length === 0) return [];
    // Find the latest transaction's date in this set
    const dates = txs.map(t => new Date(t.date).getTime());
    const maxTime = Math.max(...dates);
    const maxDate = new Date(maxTime);
    
    // Create a 7-day window ending at maxDate
    const minDate = new Date(maxDate);
    minDate.setDate(maxDate.getDate() - 6); // 7 days inclusive
    
    return txs.filter(t => {
      const d = new Date(t.date);
      // set hours to 0 to compare dates only
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
  const weeklySubsTotal = activeSubsTotal / 4.33; // mathematically 4.33 weeks per month

  const totalWeeklyExpenses = Math.abs(
    weeklyTxs
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  ) + weeklySubsTotal;

  const activeExpenses = summaryMode === 'monthly' ? totalExpenses : totalWeeklyExpenses;
  const hasBudget = !!(budget && budget.monthlyLimit && budget.monthlyLimit > 0);
  const activeLimit = hasBudget ? (summaryMode === 'monthly' ? budget.monthlyLimit : (budget.monthlyLimit / 4.33)) : 0;
  const activeAverage = summaryMode === 'monthly' ? 2950.00 : (2950.00 / 4.33);

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
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val);
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

  // Get the latest 5 transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // Helper to generate the last 12 months ending with the activeMonth
  const getLast12Months = (endMonth: string) => {
    const list = [];
    const [year, month] = endMonth.split('-').map(Number);
    
    // Generate 12 months in chronological order
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const mLabel = d.toLocaleString('en-IN', { month: 'short' });
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      // Calculate dynamic spend for this month from user's transactions
      const monthTxs = transactions.filter(t => t.date.startsWith(mKey));
      const monthExpenses = Math.abs(
        monthTxs
          .filter(t => t.amount < 0)
          .reduce((sum, t) => sum + t.amount, 0)
      );
      
      list.push({
        month: mLabel,
        spend: mKey === endMonth ? totalExpenses : monthExpenses,
        isCurrent: mKey === endMonth
      });
    }
    return list;
  };

  const trendsData = getLast12Months(activeMonth);

  // Maximum value for scaling the bar heights in trends chart (approx 3000 as base minimum)
  const maxSpend = Math.max(...trendsData.map(d => d.spend), 3000);

  // Group transactions of current active period by category (for expense transactions only)
  const categoryDataMap: Record<string, number> = {};
  const activePeriodTxs = summaryMode === 'monthly' ? currentMonthTxs : weeklyTxs;
  activePeriodTxs.forEach(t => {
    if (t.amount < 0) {
      const cat = t.category || 'Other';
      const absAmount = Math.abs(t.amount);
      categoryDataMap[cat] = (categoryDataMap[cat] || 0) + absAmount;
    }
  });

  // Factor active recurring subscriptions into category analysis
  subscriptions.forEach(s => {
    if (s.isActive) {
      const isAlreadyLogged = currentMonthTxs.some(t => 
        t.amount < 0 &&
        (t.label === 'Subscription' || t.title.toLowerCase().includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(t.title.toLowerCase()))
      );
      if (!isAlreadyLogged) {
        const cat = s.category || 'Other';
        const subCost = summaryMode === 'monthly' ? s.amount : s.amount / 4.33;
        categoryDataMap[cat] = (categoryDataMap[cat] || 0) + subCost;
      }
    }
  });

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

  const chartData = Object.entries(categoryDataMap).map(([name, value]) => ({
    name,
    value,
    color: getCategoryColor(name)
  })).sort((a, b) => b.value - a.value);

  const totalSpendingForMonth = chartData.reduce((sum, item) => sum + item.value, 0);

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      payload: {
        name: string;
        value: number;
        color: string;
      };
    }>;
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface/90 backdrop-blur-md text-on-surface text-xs p-3 py-2.5 rounded-xl border border-outline-variant/30 shadow-xl space-y-1 font-sans">
          <div className="flex items-center gap-1.5">
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0" 
              style={{ backgroundColor: data.color }} 
            />
            <p className="font-bold text-on-surface">{data.name}</p>
          </div>
          <p className="font-mono text-primary font-bold text-sm pl-4">
            {formatCurrency(data.value)}
          </p>
          {totalSpendingForMonth > 0 && (
            <p className="text-[10px] text-on-surface-variant pl-4">
              {((data.value / totalSpendingForMonth) * 100).toFixed(1)}% of total
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const formatMonthName = (monthKey: string) => {
    const [y, m] = monthKey.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* Hero Section: Total Spending */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant/25">
        <div className="space-y-1">
          <h2 className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
            <span>{summaryMode === 'monthly' ? 'Total Monthly Spending' : 'Total Weekly Spending'}</span>
            {summaryMode === 'weekly' && getWeeklyPeriodRange() && (
              <span className="text-[10px] font-bold normal-case text-primary bg-primary-container/40 px-2 py-0.5 rounded-full border border-primary/10">
                {getWeeklyPeriodRange()}
              </span>
            )}
          </h2>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-headline-lg text-2xl lg:text-3xl font-extrabold text-primary">
              {formatCurrency(activeExpenses)}
            </span>
            <span className="font-label-md text-label-md text-secondary flex items-center gap-0.5 bg-secondary-container/30 px-2 py-0.5 rounded-full">
              <TrendingDown className="w-3.5 h-3.5" /> 
              {summaryMode === 'monthly' ? '12% less than last month' : '5% less than last week'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span>{summaryMode === 'monthly' ? 'Average:' : 'Weekly Average:'}</span>
            <span className="font-bold text-on-surface">{formatCurrency(activeAverage)}</span>
          </div>
        </div>

        {/* Segmented Toggle Control */}
        <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant/35 shrink-0 self-start sm:self-center">
          <button
            id="summary-mode-monthly-btn"
            type="button"
            onClick={() => setSummaryMode('monthly')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1 ${
              summaryMode === 'monthly'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Monthly
          </button>
          <button
            id="summary-mode-weekly-btn"
            type="button"
            onClick={() => setSummaryMode('weekly')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1 ${
              summaryMode === 'weekly'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Weekly
          </button>
        </div>
      </section>

      {/* Summary Cards Bento Grid */}
      <div className={`grid gap-4 ${hasBudget ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Remaining Budget Card */}
        {hasBudget && (
          <div className={`p-4 rounded-2xl ${
            activeLimit - activeExpenses >= 0 
              ? 'bg-primary text-on-primary shadow-md' 
              : 'bg-error-container text-on-error-container border border-error/20 shadow-sm'
          } flex flex-col justify-between h-24 relative overflow-hidden group hover:shadow-lg transition-all duration-300`}>
            <div className={`absolute -right-2 -bottom-2 opacity-10 transition-transform group-hover:scale-110 duration-500 ${
              activeLimit - activeExpenses >= 0 ? 'text-white' : 'text-error'
            }`}>
              <Coins className="w-16 h-16" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`p-1 rounded-full ${
                activeLimit - activeExpenses >= 0 ? 'bg-white/20' : 'bg-error/10'
              }`}>
                <Coins className={`w-3.5 h-3.5 ${
                  activeLimit - activeExpenses >= 0 ? 'text-white' : 'text-error'
                }`} />
              </span>
              <span className="font-title-md text-xs font-semibold">
                {summaryMode === 'monthly' ? 'Remaining Monthly Budget' : 'Remaining Weekly Budget'}
              </span>
            </div>
            <div className="font-headline-sm text-xl font-bold">
              {formatCurrency(activeLimit - activeExpenses)}
            </div>
          </div>
        )}

        {/* Monthly/Weekly Expenses Card */}
        <div className="p-4 rounded-2xl bg-surface-container-high text-on-surface shadow-sm border border-outline-variant/40 flex flex-col justify-between h-24 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute -right-2 -bottom-2 opacity-10 transition-transform group-hover:scale-110 duration-500">
            <ShoppingCart className="w-16 h-16 text-primary" />
          </div>
          <div className="flex items-center gap-1.5 text-primary">
            <span className="p-1 rounded-full bg-primary/10">
              <ArrowUp className="w-3.5 h-3.5 text-primary" />
            </span>
            <span className="font-title-md text-xs font-semibold text-on-surface">
              {summaryMode === 'monthly' ? 'Monthly Expenses' : 'Weekly Expenses'}
            </span>
          </div>
          <div className="font-headline-sm text-xl font-bold text-on-surface">
            {formatCurrency(activeExpenses)}
          </div>
        </div>
      </div>

      {/* Spending Trends Custom Interactive Bar Chart */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-outfit text-lg text-on-surface font-black tracking-tight">Spending Trends</h3>
          <button 
            onClick={onNavigateToInsights}
            className="font-label-lg text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            View Details
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-sm">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <div className="p-3 bg-surface-container-high rounded-full text-on-surface-variant">
                <TrendingUp className="w-8 h-8 opacity-40 text-primary" />
              </div>
              <p className="text-sm font-bold text-on-surface">No spending trends yet</p>
              <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
                Your 12-month spending bar chart will appear here once you log your first transaction.
              </p>
              <button
                onClick={onAddTransactionClick}
                className="mt-2 px-4 py-1.5 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Your First Log
              </button>
            </div>
          ) : (
            /* SVG / Flex Custom Bar Chart */
            <div className="flex items-end justify-between h-40 gap-1.5 px-1 pt-4">
              {trendsData.map((d, idx) => {
                const pct = (d.spend / maxSpend) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1.5 bg-slate-900 text-white text-xs font-bold font-mono px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                      {formatCurrency(d.spend)}
                    </div>
                    
                    {/* Bar */}
                    <div className="w-full relative rounded-t-md overflow-hidden bg-slate-100 dark:bg-slate-800 h-28 flex items-end">
                      <div 
                        style={{ height: `${pct}%` }}
                        className={`w-full rounded-t-md transition-all duration-1000 ${
                          d.isCurrent 
                            ? 'bg-primary shadow-sm hover:opacity-90' 
                            : 'bg-secondary-container hover:opacity-85'
                        }`}
                      ></div>
                    </div>
                    <span className={`text-[10px] font-label-md text-on-surface-variant ${d.isCurrent ? 'font-bold text-primary' : ''}`}>
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

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
                      clockWise
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

      {/* Visual Summary (Category Breakdown Pie Chart) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-outfit text-lg text-on-surface font-black tracking-tight">Visual Summary</h3>
          {availableMonths.length > 1 ? (
            <select
              id="dashboard-month-select"
              value={activeMonth}
              onChange={(e) => setSelectedMonthState(e.target.value)}
              className="text-xs text-on-surface-variant font-medium bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant/35 hover:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary transition-all cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-surface text-on-surface">
                  {formatMonthName(m)}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-on-surface-variant font-medium bg-surface-container-high px-2.5 py-1 rounded-full border border-outline-variant/20">
              {formatMonthName(activeMonth)}
            </span>
          )}
        </div>
        
        <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-sm">
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              {/* Pie Chart Area */}
              <div className="sm:col-span-6 h-52 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                      activeShape={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center text for the donut chart */}
                <div className="absolute text-center flex flex-col justify-center items-center pointer-events-none">
                  <span className="text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider">
                    Total Spent
                  </span>
                  <span className="text-base font-bold text-on-surface font-mono mt-0.5 truncate max-w-[120px]">
                    {formatCurrency(totalSpendingForMonth)}
                  </span>
                </div>
              </div>

              {/* Legend/Breakdown Area */}
              <div className="sm:col-span-6 space-y-2.5">
                {chartData.map((item, index) => {
                  const percent = totalSpendingForMonth > 0 ? ((item.value / totalSpendingForMonth) * 100).toFixed(1) : '0';
                  const hasLimit = budget?.categoryLimits && budget.categoryLimits[item.name] !== undefined;
                  const limitVal = hasLimit ? (budget.categoryLimits?.[item.name] || 0) : 0;
                  const isOver = hasLimit && item.value > limitVal;

                  return (
                    <div 
                      key={index} 
                      className="p-2 rounded-xl hover:bg-surface-container-high/60 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div 
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 dark:border-white/10" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs font-semibold text-on-surface truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-right shrink-0">
                          <span className="text-xs font-bold text-on-surface">
                            {formatCurrency(item.value)}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/80 bg-surface-container-high px-1.5 py-0.5 rounded-md font-sans">
                            {percent}%
                          </span>
                        </div>
                      </div>

                      {/* Category Budget Progress Bar */}
                      {hasLimit && hasBudget && (
                        <div className="pl-6 space-y-0.5">
                          <div className="flex items-center justify-between text-[9px] font-semibold leading-none">
                            <span className={isOver ? "text-error" : "text-primary"}>
                              {isOver 
                                ? `Over Limit by ${formatCurrency(item.value - limitVal)}` 
                                : `Within limit (${limitVal > 0 ? Math.round((item.value / limitVal) * 100) : 0}%)`
                              }
                            </span>
                            <span className="font-mono text-on-surface-variant">
                              Max: {formatCurrency(limitVal)}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOver ? "bg-error animate-pulse" : "bg-primary"
                              }`}
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
          )}
        </div>
      </section>

      {/* Subscriptions Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="font-outfit text-lg text-on-surface font-black tracking-tight">Subscriptions</h3>
            <span className="text-[11px] text-on-surface-variant font-medium">
              Recurring monthly outlays factored into budget analysis
            </span>
          </div>
          <button 
            id="add-subscription-toggle-btn"
            onClick={() => setIsAddSubOpen(!isAddSubOpen)}
            className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-all flex items-center gap-1 cursor-pointer"
          >
            {isAddSubOpen ? (
              <>
                <X className="w-3.5 h-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Add Recurring
              </>
            )}
          </button>
        </div>

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
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Monthly Cost (INR)</label>
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
                  <select
                    value={newSubCategory}
                    onChange={(e) => setNewSubCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                  >
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Rent">Rent</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Other">Other</option>
                  </select>
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
                            {sub.category}
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
                        onClick={() => onDeleteSubscription(sub.id)}
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
                  Monthly Commitments: <strong className="text-on-surface">{subscriptions.filter(s => s.isActive).length} active</strong>
                </span>
                <span className="font-mono font-bold text-primary">
                  {formatCurrency(activeSubsTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Savings Goals Tracker Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="font-outfit text-lg text-on-surface font-black tracking-tight flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" />
              Savings Goals
            </h3>
            <span className="text-[11px] text-on-surface-variant font-medium">
              Create and manage long-term savings achievements
            </span>
          </div>
          <button 
            id="add-goal-toggle-btn"
            onClick={() => setIsAddGoalOpen(!isAddGoalOpen)}
            className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-all flex items-center gap-1 cursor-pointer"
          >
            {isAddGoalOpen ? (
              <>
                <X className="w-3.5 h-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Create Goal
              </>
            )}
          </button>
        </div>

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
                const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                const isAdjusting = activeAdjustingGoalId === goal.id;
                
                return (
                  <div 
                    key={goal.id}
                    className="p-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl flex flex-col gap-3 transition-all hover:border-outline-variant/65 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-title-md text-sm font-bold text-on-surface flex items-center gap-1.5">
                          {goal.title}
                        </h4>
                        {goal.targetDate && (
                          <p className="text-[10px] text-on-surface-variant/80 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> Target: {new Date(goal.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-primary block">
                          {formatCurrency(goal.currentAmount)}
                        </span>
                        <span className="text-[9px] text-on-surface-variant/80 block">
                          Goal: {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-on-surface-variant font-medium">Completion Progress</span>
                        <span className="font-bold text-primary font-mono">{percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden border border-outline-variant/20">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
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
      </section>

      {/* Recent Transactions List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-outfit text-lg text-on-surface font-black tracking-tight">Recent Transactions</h3>
          <button 
            onClick={onNavigateToHistory}
            className="font-label-lg text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            View All
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {recentTransactions.map((tx) => {
            const config = getCategoryConfig(tx.category);
            const IconComponent = config.icon;
            const isExpense = tx.amount < 0;

            return (
              <div 
                id={`transaction-row-${tx.id}`}
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl border border-outline-variant/30 hover:bg-surface-variant/40 transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${config.bg} shadow-sm transition-transform group-hover:scale-105`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-title-md text-sm text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                      {tx.title}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {tx.category} • {formatDateLabel(tx.date)}, {tx.time}
                    </div>
                  </div>
                </div>
                <div className="text-right ml-2 flex flex-col items-end">
                  <div className={`font-title-md text-sm font-semibold ${isExpense ? 'text-on-surface' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {isExpense ? '' : '+'}{formatCurrency(Math.abs(tx.amount))}
                  </div>
                  <span className="inline-block px-2 py-0.5 mt-0.5 text-[10px] font-medium bg-surface-variant text-on-surface-variant rounded-full">
                    {tx.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
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

    </div>
  );
}
