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
  Wallet,
  Sliders,
  Target,
  FileText
} from 'lucide-react';
import { Transaction, BudgetConfig, Subscription, SavingsGoal } from '../types';
import { COLOR_PRESETS } from '../theme';
import { formatCurrency as formatCustomCurrency, isSubscriptionDoubleCounted, parseRawAmount, formatInputAmount } from '../utils/currency';
import { FinancialHealthRadarCard } from './FinancialHealthRadarCard';
import { NoSpendHeatmapCard } from './NoSpendHeatmapCard';
import { generateMonthlyPdfReport } from '../utils/pdfReportGenerator';

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
  themePresetId = 'default',
  isDark = false
}: InsightsTabProps) {
  // Select theme configuration
  const activeThemePresetId = themePresetId || localStorage.getItem('spendtrack_theme_preset') || 'navy';
  const activePreset = COLOR_PRESETS.find(p => p.id === activeThemePresetId) || COLOR_PRESETS[0];
  const themeColors = isDark ? activePreset.dark : activePreset.light;
  const themeOutline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  // Find all available months in history
  const today = new Date();
  const currentRealMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const availableMonths = Array.from(new Set(transactions.map(t => (t.date || '').substring(0, 7)))).filter(Boolean).sort((a, b) => b.localeCompare(a));
  const [selectedMonthState, setSelectedMonthState] = useState<string | null>(null);
  const activeMonth = selectedMonthState || availableMonths[0] || currentRealMonth;

  // Filter transactions for active month
  const activeTxs = transactions.filter(t => t.date.startsWith(activeMonth));
  
  // Dynamic monthly income initial setup
  const activeMonthInflow = transactions
    .filter(t => t.date.startsWith(activeMonth) && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const [customIncome, setCustomIncome] = useState<number>(() => {
    return activeMonthInflow > 0 ? activeMonthInflow : ((budget?.monthlyLimit ?? 3000) * 1.5 || 50000);
  });

  // Simulator States
  const [simFood, setSimFood] = useState<number>(-1);
  const [simTransport, setSimTransport] = useState<number>(-1);
  const [simRent, setSimRent] = useState<number>(-1);
  const [simShopping, setSimShopping] = useState<number>(-1);
  const [simOther, setSimOther] = useState<number>(-1);
  
  // Active subscriptions total recurring monthly expense (guarded against double-counting)
  const activeSubsTotal = subscriptions
    .filter(s => s.isActive !== false)
    .reduce((sum, s) => {
      const isAlreadyLogged = activeTxs.some(t => 
        t.amount < 0 &&
        isSubscriptionDoubleCounted(s.title, t.title)
      );
      return sum + (isAlreadyLogged ? 0 : (Number(s.amount) || 0));
    }, 0);

  // Calculate expenses by category (including unlogged active recurring subscriptions)
  const getCategorySpend = (catName: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other') => {
    const txSpend = Math.abs(
      activeTxs
        .filter(t => t.category === catName && Number(t.amount) < 0)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    );
    const subSpend = subscriptions
      .filter(s => s.isActive !== false && s.category === catName)
      .reduce((sum, s) => {
        const isAlreadyLogged = activeTxs.some(t => 
          Number(t.amount) < 0 &&
          isSubscriptionDoubleCounted(s.title, t.title)
        );
        return sum + (isAlreadyLogged ? 0 : (Number(s.amount) || 0));
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
  const hasBudget = budget && Number(budget.monthlyLimit) > 0;
  const targetAverage = hasBudget ? Number(budget.monthlyLimit) : 0;

  const overUnderAmount = hasBudget ? totalSpent - targetAverage : 0;
  const isOver = overUnderAmount > 0;
  const pctOfTarget = targetAverage > 0 ? Math.round((totalSpent / targetAverage) * 100) : 0;

  // 50/30/20 actuals calculation
  const actualNeeds = rentSpent + transportSpent;
  const actualWants = foodSpent + shoppingSpent + otherSpent;
  const actualSurplus = Math.max(0, customIncome - totalSpent);

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return formatCustomCurrency(val, budget?.currency || 'INR');
  };

  // Use user-defined category limits if set; otherwise proportional limits if budget is set, or 0 if no budget
  const foodLimit      = budget.categoryLimits?.Food      ?? (hasBudget ? Math.round(Number(budget.monthlyLimit) * 0.20) : 0);
  const transportLimit = budget.categoryLimits?.Transport  ?? (hasBudget ? Math.round(Number(budget.monthlyLimit) * 0.12) : 0);
  const rentLimit      = budget.categoryLimits?.Rent       ?? (hasBudget ? Math.round(Number(budget.monthlyLimit) * 0.40) : 0);
  const shoppingLimit  = budget.categoryLimits?.Shopping   ?? (hasBudget ? Math.round(Number(budget.monthlyLimit) * 0.18) : 0);
  const otherLimit     = budget.categoryLimits?.Other      ?? (hasBudget ? Math.round(Number(budget.monthlyLimit) * 0.10) : 0);

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

  const pastMonths = availableMonths.filter(m => m !== activeMonth);

  const currentFood = foodSpent;
  const currentTransport = transportSpent;
  const currentRent = rentSpent;
  const currentShopping = shoppingSpent;
  const currentOther = otherSpent;

  const valFood = simFood === -1 ? currentFood : simFood;
  const valTransport = simTransport === -1 ? currentTransport : simTransport;
  const valRent = simRent === -1 ? currentRent : simRent;
  const valShopping = simShopping === -1 ? currentShopping : simShopping;
  const valOther = simOther === -1 ? currentOther : simOther;

  const currentTotal = currentFood + currentTransport + currentRent + currentShopping + currentOther;
  const simTotal = valFood + valTransport + valRent + valShopping + valOther;
  const savingsDiff = currentTotal - simTotal;

  // Let's calculate the runway
  const savingsBalance = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0) || 15000;
  
  // Current runway = savings / Math.max(1, currentTotal) (in months)
  // Simulated runway = savings / Math.max(1, simTotal)
  const currentRunway = currentTotal > 0 ? (savingsBalance / currentTotal) : 12;
  const simRunway = simTotal > 0 ? (savingsBalance / simTotal) : 12;
  const runwayExtension = Math.max(0, simRunway - currentRunway);

  // Goal impact
  const primaryGoal = savingsGoals[0];
  let goalImpactText = '';
  if (primaryGoal) {
    const remainingTarget = primaryGoal.targetAmount - primaryGoal.currentAmount;
    if (remainingTarget > 0) {
      const currentRate = Math.max(10, customIncome - currentTotal);
      const simRate = Math.max(10, customIncome - simTotal);
      const currentMonths = remainingTarget / currentRate;
      const simMonths = remainingTarget / simRate;
      const monthsSaved = currentMonths - simMonths;
      if (monthsSaved > 0) {
        goalImpactText = `At this simulated rate, you will reach your '${primaryGoal.title}' goal ${monthsSaved.toFixed(1)} months faster!`;
      }
    }
  }

  // Calculate the savings streak
  const calculateStreak = () => {
    let streak = 0;
    const sortedMonths = [...availableMonths].sort((a, b) => b.localeCompare(a));
    for (const m of sortedMonths) {
      const monthTxs = transactions.filter(t => t.date.startsWith(m) && t.amount < 0);
      const txTotal = Math.abs(monthTxs.reduce((sum, t) => sum + t.amount, 0));
      const monthSubsTotal = subscriptions
        .filter(s => s.isActive !== false)
        .reduce((sum, s) => {
          const isAlreadyLogged = monthTxs.some(t => 
            isSubscriptionDoubleCounted(s.title, t.title)
          );
          return sum + (isAlreadyLogged ? 0 : (Number(s.amount) || 0));
        }, 0);
      const total = txTotal + monthSubsTotal;
      const limit = budget.monthlyLimit || 3000;
      if (total <= limit && total > 0) {
        streak++;
      } else if (total > limit) {
        break; // Streak broken
      }
    }
    return streak;
  };
  const savingsStreak = calculateStreak();

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-headline-md text-2xl font-bold text-on-surface">Spending Analysis & Intelligence</h2>
          <p className="font-body-md text-sm text-on-surface-variant">
            {pastMonths.length > 0 
              ? "Review your current pace against historical averages." 
              : "Review your current spending and budget allocation."}
          </p>
        </div>

        <button
          onClick={() => {
            generateMonthlyPdfReport({
              transactions,
              budget,
              subscriptions,
              savingsGoals,
              monthKey: activeMonth
            });
          }}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-full shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <FileText className="w-4 h-4" />
          Export PDF Statement
        </button>
      </div>

      {/* 360° Financial Health Radar */}
      <FinancialHealthRadarCard
        transactions={transactions}
        budget={budget}
        subscriptions={subscriptions}
        currency={budget?.currency || 'INR'}
      />

      {/* Monthly Budget & Net Cashflow Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Remaining Budget & Cap Status */}
        <div className="p-4 rounded-3xl bg-surface-container-low border border-outline-variant/30 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-primary" />
              Monthly Budget Status
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              targetAverage - totalSpent >= 0
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-error/10 text-error border-error/20'
            }`}>
              {targetAverage - totalSpent >= 0 ? 'Within Target' : 'Exceeded Limit'}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-[10px] text-on-surface-variant font-medium block">Remaining Safe Cap</span>
              <span className={`text-2xl font-black font-mono ${targetAverage - totalSpent >= 0 ? 'text-primary' : 'text-error'}`}>
                {formatCurrency(targetAverage - totalSpent)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-on-surface-variant font-medium block">Monthly Limit</span>
              <span className="text-sm font-bold text-on-surface font-mono">
                {formatCurrency(targetAverage)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  pctOfTarget > 100 ? 'bg-error' : pctOfTarget > 80 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, pctOfTarget)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-on-surface-variant font-medium">
              <span>Spent {pctOfTarget}% of monthly cap</span>
              <span>{targetAverage - totalSpent < 0 ? `${formatCurrency(Math.abs(targetAverage - totalSpent))} over` : 'On track'}</span>
            </div>
          </div>
        </div>

        {/* Net Cashflow & Monthly Savings */}
        <div className="p-4 rounded-3xl bg-surface-container-low border border-outline-variant/30 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Net Monthly Cashflow
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant">
              Inflow vs Outflow
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-[10px] text-on-surface-variant font-medium block">Net Saved / Surplus</span>
              <span className={`text-2xl font-black font-mono ${customIncome - totalSpent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error'}`}>
                {customIncome - totalSpent >= 0 ? '+' : ''}{formatCurrency(customIncome - totalSpent)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-on-surface-variant font-medium block">Monthly Income</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                +{formatCurrency(customIncome)}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-surface-container-high/60 flex justify-between items-center text-xs">
            <span className="text-[11px] text-on-surface-variant font-medium">End-of-Month Projection</span>
            <span className="font-mono font-bold text-on-surface">
              {formatCurrency(Math.round((totalSpent / Math.max(1, today.getDate())) * 30))} est.
            </span>
          </div>
        </div>
      </div>





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
                        <div className="text-xs text-on-surface-variant">
                          {pastMonths.length > 0 ? 'Target Average' : 'Budget Limit'}: {formatCurrency(cat.avg)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-title-lg text-base font-extrabold ${isCatOver ? 'text-error' : 'text-secondary'}`}>
                      {formatCurrency(cat.spent)}
                    </div>
                    {hasBudget && (
                      <div className={`font-label-md text-xs font-semibold ${isCatOver ? 'text-error' : 'text-secondary'}`}>
                        {isCatOver 
                          ? (pastMonths.length > 0 ? 'Over Average' : 'Over Limit') 
                          : diff === 0 
                            ? (pastMonths.length > 0 ? 'At Average' : 'At Limit') 
                            : (pastMonths.length > 0 ? 'Under Average' : 'Under Limit')}
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



      {/* No-Spend Heatmap & Discipline Streaks */}
      <section className="space-y-3">
        <NoSpendHeatmapCard
          transactions={transactions}
          budget={budget}
        />
      </section>

    </div>
  );
}
