import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Utensils, 
  Car, 
  Home as HomeIcon, 
  ShoppingBag, 
  MoreHorizontal, 
  Lightbulb, 
  CheckCircle,
  AlertTriangle,
  Flame,
  LineChart,
  Sparkles,
  Calendar,
  Info,
  Scale,
  PiggyBank,
  Wallet
} from 'lucide-react';
import { Transaction, BudgetConfig, Subscription, SavingsGoal } from '../types';
import { COLOR_PRESETS } from '../theme';

interface InsightsTabProps {
  transactions: Transaction[];
  budget: BudgetConfig;
  subscriptions?: Subscription[];
  savingsGoals?: SavingsGoal[];
  themePresetId?: string;
  isDark?: boolean;
}

export default function InsightsTab({ 
  transactions, 
  budget, 
  subscriptions = [],
  savingsGoals = [],
  themePresetId,
  isDark
}: InsightsTabProps) {
  // Dynamically look up active theme/preset hex colors to avoid d3-color oklch parsing errors
  const activeThemePresetId = themePresetId || localStorage.getItem('spendtrack_theme_preset') || 'navy';
  const activeIsDark = isDark !== undefined ? isDark : document.documentElement.classList.contains('dark');
  const activePreset = COLOR_PRESETS.find(p => p.id === activeThemePresetId) || COLOR_PRESETS[0];
  const themeColors = activeIsDark ? activePreset.dark : activePreset.light;

  // Get active month dynamically based on the available transactions, defaulting to current calendar month
  const today = new Date();
  const currentRealMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const availableMonths = Array.from(new Set(transactions.map(t => t.date.substring(0, 7)))).sort((a, b) => b.localeCompare(a));
  const activeMonth = availableMonths[0] || currentRealMonth;

  // Filter current active dashboard month
  const activeTxs = transactions.filter(t => t.date.startsWith(activeMonth));
  
  // Dynamic monthly income sandbox initial setup
  const activeMonthInflow = transactions
    .filter(t => t.date.startsWith(activeMonth) && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const [customIncome, setCustomIncome] = useState<number>(() => {
    return activeMonthInflow > 0 ? activeMonthInflow : ((budget?.monthlyLimit ?? 3000) * 1.5 || 50000);
  });
  
  // Active subscriptions total recurring monthly expense (guarded against double-counting)
  const activeSubsTotal = subscriptions
    .filter(s => s.isActive)
    .reduce((sum, s) => {
      const isAlreadyLogged = activeTxs.some(t => 
        t.amount < 0 &&
        (t.label === 'Subscription' || t.title.toLowerCase().includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(t.title.toLowerCase()))
      );
      return sum + (isAlreadyLogged ? 0 : s.amount);
    }, 0);

  // Calculate expenses by category
  const getCategorySpend = (catName: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other') => {
    const txSpend = Math.abs(
      activeTxs
        .filter(t => t.category === catName && t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    );
    const subSpend = subscriptions
      .filter(s => s.isActive && s.category === catName)
      .reduce((sum, s) => {
        const isAlreadyLogged = activeTxs.some(t => 
          t.amount < 0 &&
          (t.label === 'Subscription' || t.title.toLowerCase().includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(t.title.toLowerCase()))
        );
        return sum + (isAlreadyLogged ? 0 : s.amount);
      }, 0);
    return txSpend + subSpend;
  };

  const foodSpent = getCategorySpend('Food');
  const transportSpent = getCategorySpend('Transport');
  const rentSpent = getCategorySpend('Rent');
  const shoppingSpent = getCategorySpend('Shopping');
  const otherSpent = getCategorySpend('Other');

  // Total spending (Sum of category spending, includes active subscriptions)
  const totalSpent = foodSpent + transportSpent + rentSpent + shoppingSpent + otherSpent;
  const targetAverage = budget.monthlyLimit;

  const overUnderAmount = totalSpent - targetAverage;
  const isOver = overUnderAmount > 0;
  const pctOfTarget = targetAverage > 0 ? Math.round((totalSpent / targetAverage) * 100) : 0;

  // 50/30/20 actuals calculation
  const sandboxNeeds = rentSpent + transportSpent + activeSubsTotal;
  const sandboxWants = foodSpent + shoppingSpent + otherSpent;
  const sandboxSurplus = Math.max(0, customIncome - (sandboxNeeds + sandboxWants));

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Dynamically divide monthly limit budget proportionally
  const foodLimit = Math.round(budget.monthlyLimit * 0.20);
  const transportLimit = Math.round(budget.monthlyLimit * 0.12);
  const rentLimit = Math.round(budget.monthlyLimit * 0.40);
  const shoppingLimit = Math.round(budget.monthlyLimit * 0.18);
  const otherLimit = Math.round(budget.monthlyLimit * 0.10);

  // Categories definitions matching screens
  const categoriesAnalysis = [
    {
      name: 'Food' as const,
      icon: Utensils,
      spent: foodSpent,
      avg: foodLimit,
      color: 'bg-primary-container text-on-primary-container border border-primary/10',
      barColor: 'bg-primary',
      thresholdPct: foodSpent > foodLimit && foodSpent > 0 ? Math.round((foodLimit / foodSpent) * 100) : 100
    },
    {
      name: 'Transport' as const,
      icon: Car,
      spent: transportSpent,
      avg: transportLimit,
      color: 'bg-secondary/15 text-secondary border border-secondary/10 dark:bg-secondary/25 dark:text-secondary',
      barColor: 'bg-secondary',
      thresholdPct: transportSpent > transportLimit && transportSpent > 0 ? Math.round((transportLimit / transportSpent) * 100) : 100
    },
    {
      name: 'Rent' as const,
      icon: HomeIcon,
      spent: rentSpent,
      avg: rentLimit,
      color: 'bg-secondary-container text-on-secondary-container border border-secondary/10',
      barColor: 'bg-secondary/70',
      thresholdPct: rentSpent > rentLimit && rentSpent > 0 ? Math.round((rentLimit / rentSpent) * 100) : 100
    },
    {
      name: 'Shopping' as const,
      icon: ShoppingBag,
      spent: shoppingSpent,
      avg: shoppingLimit,
      color: 'bg-primary/15 text-primary border border-primary/10 dark:bg-primary/25 dark:text-primary',
      barColor: 'bg-primary/70',
      thresholdPct: shoppingSpent > shoppingLimit && shoppingSpent > 0 ? Math.round((shoppingLimit / shoppingSpent) * 100) : 100
    },
    {
      name: 'Other' as const,
      icon: MoreHorizontal,
      spent: otherSpent,
      avg: otherLimit,
      color: 'bg-surface-variant text-on-surface-variant border border-outline-variant/20',
      barColor: 'bg-secondary/50',
      thresholdPct: otherSpent > otherLimit && otherSpent > 0 ? Math.round((otherLimit / otherSpent) * 100) : 100
    }
  ];

  // Dynamic values for spending velocity and buffer
  const budgetLimit = budget.monthlyLimit;
  const remainingBudget = budgetLimit - totalSpent;
  const velocityStatus = totalSpent > (budgetLimit * 0.8) ? 'High' : totalSpent > (budgetLimit * 0.5) ? 'Moderate' : 'Low';
  const velocityDesc = velocityStatus === 'High' ? 'Nearing budget limit quickly.' : velocityStatus === 'Moderate' ? 'Healthy spending rate.' : 'Excellent budget buffer.';

  // --- PREDICTIVE ENGINE CALCULATIONS ---
  const [activeYear, activeMonthNum] = activeMonth.split('-').map(Number);
  const totalDays = new Date(activeYear, activeMonthNum, 0).getDate();
  const isCurrentMonth = activeMonth === currentRealMonth;
  const currentDay = isCurrentMonth ? Math.min(today.getDate(), totalDays) : totalDays;
  const daysRemaining = totalDays - currentDay;

  // Actual daily rate calculation based on current spending
  const dailySpendRate = currentDay > 0 ? totalSpent / currentDay : 0;
  
  // Forecasted total based on current pace
  const projectedRemainingSpend = dailySpendRate * daysRemaining;
  const projectedTotal = totalSpent + projectedRemainingSpend;
  const projectedIsOver = projectedTotal > budgetLimit;
  const projectedSavings = budgetLimit - projectedTotal;

  // Status Level for visual cues
  const forecastStatus: 'on-track' | 'caution' | 'at-risk' = projectedTotal > budgetLimit * 1.12
    ? 'at-risk'
    : projectedTotal > budgetLimit
    ? 'caution'
    : 'on-track';

  // Recommended daily rate for remaining days
  const recommendedDailyCap = daysRemaining > 0 
    ? Math.max(0, (budgetLimit - totalSpent) / daysRemaining)
    : 0;

  // Fetch true historical baseline
  const pastMonths = availableMonths.filter(m => m !== activeMonth);
  let historicalAvgTotal = 0;
  if (pastMonths.length > 0) {
    const pastExpenses = pastMonths.map(m => {
      const monthTxs = transactions.filter(t => t.date.startsWith(m) && t.amount < 0);
      const txTotal = Math.abs(monthTxs.reduce((sum, t) => sum + t.amount, 0));
      const monthActiveSubsTotal = subscriptions
        .filter(s => s.isActive)
        .reduce((sum, s) => {
          const isAlreadyLogged = transactions.some(t => 
            t.date.startsWith(m) &&
            t.amount < 0 &&
            (t.label === 'Subscription' || t.title.toLowerCase().includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(t.title.toLowerCase()))
          );
          return sum + (isAlreadyLogged ? 0 : s.amount);
        }, 0);
      return txTotal + monthActiveSubsTotal;
    });
    historicalAvgTotal = Math.round(pastExpenses.reduce((sum, val) => sum + val, 0) / pastMonths.length);
  } else {
    historicalAvgTotal = budget.monthlyLimit;
  }

  // --- CHART DATA GENERATION ---
  interface ProjectionDataPoint {
    day: number;
    dayLabel: string;
    actual?: number | null;
    projected?: number | null;
    budgetLine: number;
  }

  const projectionData: ProjectionDataPoint[] = [];
  
  const dailyExpensesMap: Record<number, number> = {};
  activeTxs.forEach(t => {
    if (t.amount < 0) {
      const day = parseInt(t.date.split('-')[2]);
      if (!isNaN(day)) {
        dailyExpensesMap[day] = (dailyExpensesMap[day] || 0) + Math.abs(t.amount);
      }
    }
  });

  const dailySubsMap: Record<number, number> = {};
  subscriptions.forEach(s => {
    if (s.isActive) {
      const day = s.billingDate;
      dailySubsMap[day] = (dailySubsMap[day] || 0) + s.amount;
    }
  });

  let accumActual = 0;
  let accumProjected = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dayTx = dailyExpensesMap[d] || 0;
    const daySub = dailySubsMap[d] || 0;
    const dayCost = dayTx + daySub;

    if (d <= currentDay) {
      accumActual += dayCost;
      accumProjected = accumActual;
      
      projectionData.push({
        day: d,
        dayLabel: `Day ${d}`,
        actual: accumActual,
        projected: accumActual,
        budgetLine: budgetLimit
      });
    } else {
      accumProjected += dailySpendRate;
      
      projectionData.push({
        day: d,
        dayLabel: `Day ${d}`,
        actual: null,
        projected: Math.round(accumProjected),
        budgetLine: budgetLimit
      });
    }
  }

  // Custom tooltips for Recharts
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const actualValue = payload.find((p: any) => p.name === 'Actual spent')?.value;
      const projectedValue = payload.find((p: any) => p.name === 'Projected path')?.value;
      const budgetValue = payload.find((p: any) => p.name === 'Budget limit')?.value;

      return (
        <div className="bg-slate-900 dark:bg-slate-950 text-white text-xs p-3.5 rounded-xl border border-slate-800 shadow-xl space-y-1.5 font-sans">
          <p className="font-bold text-slate-300">{label}</p>
          {actualValue !== undefined && actualValue !== null && (
            <p className="flex justify-between gap-5">
              <span className="opacity-80">Spent:</span>
              <span className="font-mono font-semibold text-teal-300">{formatCurrency(actualValue)}</span>
            </p>
          )}
          {projectedValue !== undefined && projectedValue !== null && (
            <p className="flex justify-between gap-5">
              <span className="opacity-80">Projected:</span>
              <span className="font-mono font-semibold text-amber-200">{formatCurrency(projectedValue)}</span>
            </p>
          )}
          {budgetValue !== undefined && (
            <p className="flex justify-between gap-5 border-t border-slate-800 pt-1.5 mt-1 text-[10px]">
              <span className="opacity-60">Budget Limit:</span>
              <span className="font-mono font-bold text-error">{formatCurrency(budgetValue)}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-headline-md text-2xl font-bold text-on-surface">Spending Analysis</h2>
        <p className="font-body-md text-sm text-on-surface-variant">Review your current pace against historical averages.</p>
      </div>

      {/* Primary Comparison Card */}
      <section>
        <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm border border-outline-variant/30 relative overflow-hidden">
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex justify-between items-start gap-2 flex-wrap">
              <div>
                <span className="font-label-lg text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                  Total Current Spending
                </span>
                <div className="font-headline-lg text-3xl font-extrabold text-primary mt-1">
                  {formatCurrency(totalSpent)}
                </div>
              </div>
              
              {targetAverage > 0 && (
                <div className="flex flex-col items-end">
                  <span className={`font-label-md text-xs px-3 py-1 rounded-full flex items-center gap-1 font-bold ${
                    isOver ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'
                  }`}>
                    {isOver ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {pctOfTarget}%
                  </span>
                  <span className={`font-label-md text-xs mt-1.5 font-bold ${isOver ? 'text-error' : 'text-secondary'}`}>
                    {isOver ? `+${formatCurrency(overUnderAmount)} Over` : `${formatCurrency(Math.abs(overUnderAmount))} Under`}
                  </span>
                </div>
              )}
            </div>

            {targetAverage > 0 && (
              <div className="pt-2 border-t border-outline-variant/25">
                <div className="flex justify-between font-label-md text-xs text-on-surface-variant mb-2 font-semibold">
                  <span>Target Average: {formatCurrency(targetAverage)}</span>
                  <span className="font-bold text-primary">{pctOfTarget}% of average</span>
                </div>
                <div className="h-3 w-full bg-surface-variant rounded-full overflow-hidden relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-error' : 'bg-primary'}`}
                    style={{ width: `${Math.min(pctOfTarget, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Predictive Engine & End-of-Month Status Forecast */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-title-md text-sm font-bold text-on-surface">Predictive Insights & Forecast</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Status and KPIs */}
          <div className="md:col-span-1 bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Potential EOM Status
              </span>
              
              {forecastStatus === 'on-track' && (
                <div className="flex flex-col gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    <CheckCircle className="w-4 h-4 shrink-0 text-primary" />
                    Projected On Track 🎉
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90 font-medium">
                    Excellent pacing! You are currently projected to stay below your monthly limit with potential savings.
                  </p>
                </div>
              )}

              {forecastStatus === 'caution' && (
                <div className="flex flex-col gap-2 p-3 bg-secondary/10 border border-secondary/20 rounded-xl text-secondary">
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-secondary" />
                    Slight Overrun Risk ⚠️
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90 font-medium">
                    Caution advised. Your pacing is projected to slightly exceed the budget by month-end. Consider minor adjustments.
                  </p>
                </div>
              )}

              {forecastStatus === 'at-risk' && (
                <div className="flex flex-col gap-2 p-3 bg-error-container/60 border border-error/15 rounded-xl text-on-error-container">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-error">
                    <Flame className="w-4 h-4 shrink-0" />
                    High Budget Risk 🚨
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90 font-medium">
                    Action required. Spending is highly accelerated. Continuous pacing will likely push you significantly over budget.
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-outline-variant/20 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Projected Total Outlay
                  </span>
                  <div className="text-xl font-black text-on-surface font-mono mt-0.5">
                    {formatCurrency(projectedTotal)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Projected EOM {projectedIsOver ? 'Deficit' : 'Savings'}
                  </span>
                  <div className={`text-sm font-bold font-mono mt-0.5 ${projectedIsOver ? 'text-error' : 'text-primary'}`}>
                    {projectedIsOver ? '+' : ''}{formatCurrency(Math.abs(projectedSavings))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-surface-container-highest/50 rounded-xl border border-outline-variant/20 space-y-1">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block flex items-center gap-1">
                <Info className="w-3 h-3 text-primary" /> Recommendation
              </span>
              <p className="text-[10px] leading-relaxed text-on-surface-variant font-medium">
                {daysRemaining > 0 ? (
                  <>
                    Limit future non-essential spend to <strong className="text-primary font-mono">{formatCurrency(recommendedDailyCap)}</strong>/day for the next <strong>{daysRemaining}</strong> days to remain strictly within budget.
                  </>
                ) : (
                  "The active month is complete. This is your final budget status."
                )}
              </p>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="md:col-span-2 bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Cumulative Spend & Projection Path
                </h4>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-primary">
                    <span className="w-2 h-2 rounded-full bg-primary"></span> Actual
                  </span>
                  <span className="flex items-center gap-1 text-secondary">
                    <span className="w-2.5 h-0.5 border-t-2 border-dashed border-secondary"></span> Projected
                  </span>
                  <span className="flex items-center gap-1 text-error">
                    <span className="w-2.5 h-0.5 bg-error"></span> Budget Limit
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-1">
                Comparing day-by-day accumulated expenses against the {formatCurrency(budgetLimit)} limit path.
              </p>
            </div>

            <div className="h-48 w-full mt-2 select-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={projectionData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={themeColors.primary} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={themeColors.secondary} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={themeColors.secondary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.08)" />
                  <XAxis 
                    dataKey="day" 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.5 }}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000) + 'k' : val}`}
                    tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.5 }}
                  />
                  <Tooltip content={<CustomChartTooltip />} cursor={false} />
                  <ReferenceLine y={budgetLimit} stroke="#f87171" strokeDasharray="5 5" strokeWidth={1.5} />
                  
                  {/* Projected Path Area */}
                  <Area 
                    name="Projected path"
                    type="monotone" 
                    dataKey="projected" 
                    stroke={themeColors.secondary} 
                    strokeWidth={1.5} 
                    strokeDasharray={isCurrentMonth ? "5 5" : undefined}
                    fillOpacity={1} 
                    fill="url(#colorProjected)" 
                    activeDot={{ stroke: 'none', strokeWidth: 0, r: 4 }}
                  />

                  {/* Actual Path Area */}
                  <Area 
                    name="Actual spent"
                    type="monotone" 
                    dataKey="actual" 
                    stroke={themeColors.primary} 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorActual)" 
                    activeDot={{ stroke: 'none', strokeWidth: 0, r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-medium border-t border-outline-variant/15 pt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Current Run Rate: <strong className="text-on-surface font-mono">{formatCurrency(dailySpendRate)}/day</strong>
              </span>
              {isCurrentMonth ? (
                <span>{daysRemaining} days remaining in month</span>
              ) : (
                <span>Month complete (Historical analysis)</span>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Category Comparison List */}
      <section className="space-y-3">
        <h3 className="font-title-md text-sm font-bold text-on-surface-variant px-1">Breakdown by Category</h3>
        
        <div className="space-y-3">
          {categoriesAnalysis.map((cat, idx) => {
            const IconComp = cat.icon;
            const hasBudget = targetAverage > 0;
            const diff = cat.spent - cat.avg;
            const isCatOver = hasBudget && diff > 0;
            const spentPctOfAvg = hasBudget && cat.avg > 0 ? Math.round((cat.spent / cat.avg) * 100) : 0;

            return (
              <div 
                id={`insights-category-card-${cat.name.toLowerCase()}`}
                key={idx} 
                className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/35 flex flex-col gap-4 shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${cat.color} shadow-sm`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-title-md text-sm font-bold text-on-surface">{cat.name}</div>
                      {hasBudget && (
                        <div className="text-xs text-on-surface-variant">Target Average: {formatCurrency(cat.avg)}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-title-lg text-base font-extrabold ${isCatOver ? 'text-error' : 'text-secondary'}`}>
                      {formatCurrency(cat.spent)}
                    </div>
                    {hasBudget && (
                      <div className={`font-label-md text-xs font-semibold ${isCatOver ? 'text-error' : 'text-secondary'}`}>
                        {isCatOver ? 'Over Average' : diff === 0 ? 'At Average' : 'Under Average'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar with optional threshold marker */}
                {hasBudget && (
                  <div className="w-full bg-surface-variant h-2 rounded-full relative">
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                        isCatOver ? 'bg-error' : cat.barColor
                      }`} 
                      style={{ width: `${Math.min(spentPctOfAvg, 100)}%` }}
                    ></div>
                    
                    {/* Threshold marker indicating average budget limit relative to spending */}
                    {isCatOver && (
                      <div 
                        className="absolute h-3 w-1 bg-on-surface-variant top-1/2 -translate-y-1/2 rounded-full shadow-xs" 
                        style={{ left: `${cat.thresholdPct}%` }}
                        title="Target Budget Limit"
                      ></div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 50/30/20 Budgeting Rule Sandbox */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1 rounded-lg bg-primary/10 text-primary">
            <Scale className="w-4 h-4" />
          </div>
          <h3 className="font-title-md text-sm font-bold text-on-surface">50/30/20 Budgeting Sandbox</h3>
        </div>

        <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-sm space-y-5">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Configure Monthly Net Income</h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Model your ideal distribution based on custom income thresholds. Use the slider or the direct input to preview the allocation targets.
            </p>
            
            {/* Slider / Custom Input */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1">
                <input 
                  type="range" 
                  min="10000" 
                  max="300000" 
                  step="5000"
                  value={customIncome} 
                  onChange={(e) => setCustomIncome(parseFloat(e.target.value) || 0)}
                  className="w-full accent-primary h-1.5 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-on-surface-variant font-semibold font-mono mt-1">
                  <span>₹10,000</span>
                  <span>₹1.5L</span>
                  <span>₹3,00,000</span>
                </div>
              </div>
              <div className="w-32 shrink-0 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">₹</span>
                <input 
                  type="number"
                  value={customIncome || ''}
                  onChange={(e) => setCustomIncome(parseFloat(e.target.value) || 0)}
                  className="w-full bg-surface-container-highest border border-outline-variant/50 rounded-xl pl-6 pr-2.5 py-1.5 text-xs font-bold font-mono text-on-surface focus:outline-hidden"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Core Comparative Cards */}
          <div className="space-y-3.5 pt-2 border-t border-outline-variant/20">
            {/* Row 1: Needs */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-bold text-on-surface">
                  <Wallet className="w-3.5 h-3.5 text-primary" />
                  <span>Essential Needs (50%)</span>
                </div>
                <div className="font-mono text-[11px] font-bold">
                  <span className="text-on-surface-variant">Ideal: {formatCurrency(customIncome * 0.5)}</span>
                  <span className="mx-1.5 text-outline-variant">|</span>
                  <span className={sandboxNeeds > (customIncome * 0.5) ? "text-error" : "text-primary"}>
                    Actual: {formatCurrency(sandboxNeeds)}
                  </span>
                </div>
              </div>
              {/* Double percentage bar overlay */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden relative">
                  {/* Ideal Fill (50% target width indicator background) */}
                  <div className="absolute top-0 left-0 h-full bg-primary/20 rounded-full" style={{ width: '50%' }} />
                  {/* Actual Fill */}
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      sandboxNeeds > (customIncome * 0.5) ? 'bg-error' : 'bg-primary'
                    }`} 
                    style={{ width: `${Math.min(100, (sandboxNeeds / customIncome) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-semibold">
                  <span className="text-on-surface-variant">Target allocation: 50%</span>
                  <span className={sandboxNeeds > (customIncome * 0.5) ? "text-error font-bold" : "text-on-surface-variant"}>
                    Current: {customIncome > 0 ? Math.round((sandboxNeeds / customIncome) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Wants */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-bold text-on-surface">
                  <ShoppingBag className="w-3.5 h-3.5 text-secondary" />
                  <span>Discretionary Wants (30%)</span>
                </div>
                <div className="font-mono text-[11px] font-bold">
                  <span className="text-on-surface-variant">Ideal: {formatCurrency(customIncome * 0.3)}</span>
                  <span className="mx-1.5 text-outline-variant">|</span>
                  <span className={sandboxWants > (customIncome * 0.3) ? "text-error" : "text-secondary"}>
                    Actual: {formatCurrency(sandboxWants)}
                  </span>
                </div>
              </div>
              {/* Double percentage bar overlay */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden relative">
                  {/* Ideal Fill (30% target width indicator background) */}
                  <div className="absolute top-0 left-0 h-full bg-secondary/20 rounded-full" style={{ width: '30%' }} />
                  {/* Actual Fill */}
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      sandboxWants > (customIncome * 0.3) ? 'bg-error' : 'bg-secondary'
                    }`} 
                    style={{ width: `${Math.min(100, (sandboxWants / customIncome) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-semibold">
                  <span className="text-on-surface-variant">Target allocation: 30%</span>
                  <span className={sandboxWants > (customIncome * 0.3) ? "text-error font-bold" : "text-on-surface-variant"}>
                    Current: {customIncome > 0 ? Math.round((sandboxWants / customIncome) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Row 3: Savings */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-bold text-on-surface">
                  <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Savings & Investments (20%)</span>
                </div>
                <div className="font-mono text-[11px] font-bold">
                  <span className="text-on-surface-variant">Ideal: {formatCurrency(customIncome * 0.2)}</span>
                  <span className="mx-1.5 text-outline-variant">|</span>
                  <span className={sandboxSurplus >= (customIncome * 0.2) ? "text-emerald-600" : "text-amber-600"}>
                    Surplus: {formatCurrency(sandboxSurplus)}
                  </span>
                </div>
              </div>
              {/* Double percentage bar overlay */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden relative">
                  {/* Ideal Fill (20% target width indicator background) */}
                  <div className="absolute top-0 left-0 h-full bg-emerald-500/10 rounded-full" style={{ width: '20%' }} />
                  {/* Actual Fill */}
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(100, (sandboxSurplus / customIncome) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-semibold">
                  <span className="text-on-surface-variant">Target allocation: 20%</span>
                  <span className={sandboxSurplus >= (customIncome * 0.2) ? "text-emerald-600 font-bold" : "text-on-surface-variant"}>
                    Available Surplus: {customIncome > 0 ? Math.round((sandboxSurplus / customIncome) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sandbox Advice Narrative Box */}
          <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/10 text-xs text-on-surface-variant leading-relaxed">
            {(() => {
              const needsPct = customIncome > 0 ? (sandboxNeeds / customIncome) : 0;
              const wantsPct = customIncome > 0 ? (sandboxWants / customIncome) : 0;
              const savingsPct = customIncome > 0 ? (sandboxSurplus / customIncome) : 0;

              if (needsPct > 0.5) {
                return (
                  <p>
                    ⚠️ <strong className="font-bold text-on-surface">Needs allocation exceeds 50%:</strong> Your essential spending is taking up {Math.round(needsPct * 100)}% of your modeled income. Consider trimming recurring subscription load (currently {formatCurrency(activeSubsTotal)}) or looking for ways to optimize fixed expenses like rent or basic transportation.
                  </p>
                );
              } else if (wantsPct > 0.3) {
                return (
                  <p>
                    ⚠️ <strong className="font-bold text-on-surface">Wants allocation exceeds 30%:</strong> You are spending {Math.round(wantsPct * 100)}% on non-essential desires. Try setting specific category limits in Settings for Food (currently {formatCurrency(foodSpent)}) or Shopping (currently {formatCurrency(shoppingSpent)}) to divert extra funds into your active savings targets!
                  </p>
                );
              } else if (savingsPct >= 0.2) {
                return (
                  <p>
                    🎉 <strong className="font-bold text-emerald-700">Gold Standard Alignment!</strong> Your potential savings rate is {Math.round(savingsPct * 100)}%, which safely exceeds the recommended 20% target. You have an estimated leftover surplus of <strong className="font-bold text-emerald-700 font-mono">{formatCurrency(sandboxSurplus)}</strong>. This is an exceptional opportunity to fund your active savings targets!
                  </p>
                );
              } else {
                return (
                  <p>
                    💡 <strong className="font-bold text-on-surface">Pacing to save {Math.round(savingsPct * 100)}%:</strong> To hit the golden 20% savings rule, try pruning your Wants category by {formatCurrency(Math.max(0, (customIncome * 0.2) - sandboxSurplus))} this month. Your wallet will thank you!
                  </p>
                );
              }
            })()}
          </div>
        </div>
      </section>

      {/* Insights Bento Box Alert */}
      <section className="grid grid-cols-2 gap-4 mt-6">
        
        {/* Smart Insight Alert */}
        <div className="col-span-2 p-5 bg-primary-container text-on-primary-container rounded-2xl border border-primary/10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          <div className="flex items-start gap-3 z-10 relative">
            <span className="p-1.5 rounded-full bg-white/10 shrink-0">
              <Lightbulb className="w-5 h-5 text-on-primary-container" />
            </span>
            <div>
              <span className="font-title-md text-sm font-bold block text-on-primary-container">Smart Insight</span>
              <p className="text-xs leading-relaxed text-on-primary-container/90 mt-1">
                {shoppingSpent > 500 
                  ? `Your 'Shopping' category is ${Math.round(((shoppingSpent - 500)/500)*100)}% above typical levels this month. Most of this was spent on apple accessories & outerwear in the first week.`
                  : "Your spending is extremely balanced this month. You've successfully kept non-essential categories under active limits."}
              </p>
            </div>
          </div>
        </div>

        {/* Spending Velocity Bento Box */}
        <div className="p-4 bg-secondary-container text-on-secondary-container rounded-2xl flex flex-col justify-between h-32 border border-secondary/10 shadow-xs relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5">
            <CheckCircle className="w-20 h-20" />
          </div>
          <span className="font-label-md text-xs font-bold uppercase tracking-wider opacity-95">Spending Rate</span>
          <div className="space-y-1">
            <div className="font-headline-sm text-xl font-extrabold flex items-center gap-1">
              {velocityStatus}
            </div>
            <p className="text-[10px] opacity-80 leading-tight">
              {velocityDesc}
            </p>
          </div>
        </div>

        {/* Remaining Budget Bento Box */}
        <div className="p-4 bg-surface-container-high rounded-2xl flex flex-col justify-between h-32 border border-outline-variant/30 shadow-xs relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5">
            <LineChart className="w-20 h-20 text-primary" />
          </div>
          <span className="font-label-md text-xs font-bold uppercase tracking-wider text-on-surface-variant">Remaining Limit</span>
          <div className="space-y-1">
            <div className="font-headline-sm text-xl font-extrabold text-primary">
              {formatCurrency(remainingBudget)}
            </div>
            <p className="text-[10px] text-on-surface-variant leading-tight">
              Current unused budget allocation.
            </p>
          </div>
        </div>

      </section>

    </div>
  );
}
