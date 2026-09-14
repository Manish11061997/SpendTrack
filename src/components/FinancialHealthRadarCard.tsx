import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, BudgetConfig, Subscription } from '../types';
import { formatCurrency, getCurrencySymbol, isSubscriptionDoubleCounted } from '../utils/currency';
import { ShieldCheck, TrendingUp, Sparkles, ChevronDown, ChevronUp, AlertCircle, Award, Target, Activity } from 'lucide-react';

interface FinancialHealthRadarCardProps {
  transactions: Transaction[];
  budget: BudgetConfig;
  subscriptions?: Subscription[];
  currency?: string;
  onNavigateToSettings?: () => void;
}

export const FinancialHealthRadarCard: React.FC<FinancialHealthRadarCardProps> = ({
  transactions = [],
  budget,
  subscriptions = [],
  currency = 'INR',
  onNavigateToSettings
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeSubscriptions = Array.isArray(subscriptions) ? subscriptions : [];
  const safeBudgetLimit = Number(budget?.monthlyLimit) || 0;
  const hasBudget = safeBudgetLimit > 0;

  // Current active month
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthTxs = safeTransactions.filter(t => t && t.date && typeof t.date === 'string' && t.date.startsWith(currentMonthKey));

  const loggedMonthExpenses = Math.abs(monthTxs.filter(t => Number(t.amount) < 0).reduce((sum, t) => sum + (Number(t.amount) || 0), 0));
  const activeSubsCommitment = safeSubscriptions
    .filter(s => s && s.isActive !== false)
    .reduce((sum, s) => {
      const isAlreadyLogged = monthTxs.some(t => 
        Number(t.amount) < 0 && isSubscriptionDoubleCounted(s.title, t.title)
      );
      return sum + (isAlreadyLogged ? 0 : (Number(s.amount) || 0));
    }, 0);

  const monthExpenses = loggedMonthExpenses + activeSubsCommitment;
  const monthIncome = monthTxs.filter(t => Number(t.amount) > 0).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // 1. Savings & Surplus Pillar (30 pts max)
  const savingsPillar = (() => {
    if (monthIncome > 0) {
      const surplus = monthIncome - monthExpenses;
      const surplusRatio = surplus / monthIncome;
      if (surplusRatio >= 0.3) return 30;
      if (surplusRatio >= 0.15) return 22;
      if (surplusRatio >= 0) return 15;
      return 5;
    }
    // Fallback if no income logged: evaluate outflow stability
    return monthExpenses <= 15000 ? 25 : monthExpenses <= 35000 ? 18 : 12;
  })();

  // 2. Budget Pacing Pillar (25 pts max)
  const budgetPillar = (() => {
    if (!hasBudget) return 16; // Neutral default baseline
    const ratio = monthExpenses / safeBudgetLimit;
    if (ratio <= 0.75) return 25;
    if (ratio <= 0.90) return 20;
    if (ratio <= 1.0) return 14;
    if (ratio <= 1.15) return 6;
    return 0;
  })();

  // 3. Subscription Burden Pillar (15 pts max)
  const activeSubsTotal = safeSubscriptions
    .filter(s => s && s.isActive !== false)
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const subPillar = (() => {
    if (activeSubsTotal === 0) return 15;
    const baseVal = monthIncome > 0 ? monthIncome : (monthExpenses > 0 ? monthExpenses : 30000);
    const subRatio = activeSubsTotal / baseVal;
    if (subRatio <= 0.08) return 15;
    if (subRatio <= 0.15) return 11;
    if (subRatio <= 0.25) return 7;
    return 3;
  })();

  // 4. Runway Safety Buffer Pillar (15 pts max)
  const runwayPillar = (() => {
    const netBalance = monthIncome - monthExpenses;
    if (netBalance >= 10000) return 15;
    if (netBalance >= 0) return 12;
    if (netBalance >= -5000) return 6;
    return 2;
  })();

  // 5. Tracking Regularity Pillar (15 pts max)
  const loggingPillar = (() => {
    const past7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });
    const loggedDays = past7Days.filter(dayStr => monthTxs.some(t => t.date === dayStr)).length;
    if (loggedDays >= 5) return 15;
    if (loggedDays >= 3) return 11;
    if (loggedDays >= 1) return 7;
    return 3;
  })();

  const totalScore = Math.min(100, savingsPillar + budgetPillar + subPillar + runwayPillar + loggingPillar);

  // Status configuration
  const getScoreStatus = (score: number) => {
    if (score >= 82) {
      return {
        label: 'Optimal Health',
        colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        strokeColor: '#10B981',
        tip: 'Outstanding financial discipline! You have robust surplus and budget alignment.'
      };
    } else if (score >= 65) {
      return {
        label: 'Healthy Stable',
        colorClass: 'text-primary bg-primary/10 border-primary/20',
        strokeColor: '#6366F1',
        tip: 'Solid foundation. Keep spending under daily pace to reach optimal status.'
      };
    } else if (score >= 45) {
      return {
        label: 'Caution Pace',
        colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        strokeColor: '#F59E0B',
        tip: 'Spending is accelerating. Trim discretionary purchases to prevent overspend.'
      };
    } else {
      return {
        label: 'High Risk Alert',
        colorClass: 'text-error bg-error/10 border-error/20',
        strokeColor: '#EF4444',
        tip: 'Urgent: Outflows are exceeding safe limits. Review category budgets immediately.'
      };
    }
  };

  const status = getScoreStatus(totalScore);

  return (
    <div className="p-5 bg-surface-container-lowest border border-outline-variant/30 rounded-3xl space-y-4 shadow-sm backdrop-blur-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
            <Activity className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-bold text-xs text-on-surface flex items-center gap-1.5">
              360° Financial Health Index
            </h3>
            <p className="text-[10px] text-on-surface-variant">Real-time 5-pillar health score</p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.colorClass}`}>
          {status.label}
        </span>
      </div>

      {/* Main Score Radial Gauge */}
      <div className="flex items-center justify-between p-3.5 bg-surface-container border border-outline-variant/20 rounded-2xl gap-4">
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="32"
              className="stroke-surface-container-highest"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r="32"
              stroke={status.strokeColor}
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 32}
              strokeDashoffset={2 * Math.PI * 32 * (1 - totalScore / 100)}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-black text-lg font-mono text-on-surface leading-none">{totalScore}</span>
            <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-wider">/ 100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>AI Health Insight</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            {status.tip}
          </p>
        </div>
      </div>

      {/* Toggle Expand Pillar Details */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-[10px] font-bold text-primary hover:text-primary/80 transition-colors py-1 cursor-pointer"
      >
        <span>{isExpanded ? 'Hide 5-Pillar Health Breakdown' : 'View 5-Pillar Health Breakdown'}</span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Pillar Breakdown Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2.5 pt-1 border-t border-outline-variant/20 overflow-hidden"
          >
            {[
              { label: 'Savings & Surplus Rate', score: savingsPillar, max: 30, color: 'bg-emerald-500' },
              { label: 'Budget Pacing', score: budgetPillar, max: 25, color: 'bg-indigo-500' },
              { label: 'Subscription Efficiency', score: subPillar, max: 15, color: 'bg-purple-500' },
              { label: 'Runway Safety Buffer', score: runwayPillar, max: 15, color: 'bg-blue-500' },
              { label: 'Logging Consistency', score: loggingPillar, max: 15, color: 'bg-amber-500' }
            ].map((pillar) => {
              const pct = Math.round((pillar.score / pillar.max) * 100);
              return (
                <div key={pillar.label} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-medium text-on-surface-variant">
                    <span>{pillar.label}</span>
                    <span className="font-mono font-bold text-on-surface">{pillar.score} / {pillar.max} pts ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pillar.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
