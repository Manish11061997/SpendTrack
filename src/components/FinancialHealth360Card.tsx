import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, BudgetConfig, Subscription } from '../types';
import { formatCurrency, isSubscriptionDoubleCounted } from '../utils/currency';
import { CardSpotlight } from './ui/CardSpotlight';
import { BorderBeam } from './ui/BorderBeam';
import { triggerHaptic } from '../utils/haptics';
import { 
  ShieldCheck, 
  Activity, 
  Flame, 
  Sparkles, 
  ChevronRight, 
  Info, 
  Target, 
  CreditCard, 
  PiggyBank, 
  Clock, 
  X 
} from 'lucide-react';

interface FinancialHealth360CardProps {
  transactions: Transaction[];
  budget: BudgetConfig;
  subscriptions?: Subscription[];
  currency?: string;
  onNavigateToSettings?: () => void;
  className?: string;
}

export const FinancialHealth360Card: React.FC<FinancialHealth360CardProps> = ({
  transactions = [],
  budget,
  subscriptions = [],
  currency = 'INR',
  onNavigateToSettings,
  className = ''
}) => {
  const [activeView, setActiveView] = useState<'matrix' | 'breakdown'>('matrix');
  const [selectedDay, setSelectedDay] = useState<{ dateStr: string; total: number; count: number } | null>(null);
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeSubscriptions = Array.isArray(subscriptions) ? subscriptions : [];
  const safeBudgetLimit = Number(budget?.monthlyLimit) || 0;
  const hasBudget = safeBudgetLimit > 0;

  // Current active calendar month info
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDayNum = today.getDate();
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

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

  // Daily spend map for heatmap
  const dailySpendMap: Record<number, { total: number; count: number }> = useMemo(() => {
    const map: Record<number, { total: number; count: number }> = {};
    for (let d = 1; d <= totalDaysInMonth; d++) {
      map[d] = { total: 0, count: 0 };
    }
    monthTxs.forEach(t => {
      if (t.date) {
        const parts = t.date.split('-');
        if (parts.length === 3) {
          const day = parseInt(parts[2], 10);
          if (day >= 1 && day <= totalDaysInMonth && Number(t.amount) < 0) {
            map[day].total += Math.abs(Number(t.amount) || 0);
            map[day].count += 1;
          }
        }
      }
    });
    return map;
  }, [monthTxs, totalDaysInMonth]);

  const dailyThreshold = safeBudgetLimit > 0 ? safeBudgetLimit / totalDaysInMonth : 1200;

  // Calculate active streak
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let d = currentDayNum; d >= 1; d--) {
      const dayData = dailySpendMap[d] || { total: 0, count: 0 };
      if (dayData.total === 0 || dayData.total <= dailyThreshold) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [dailySpendMap, currentDayNum, dailyThreshold]);

  // Count total zero-spend days in month so far
  const noSpendDaysCount = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= currentDayNum; d++) {
      if ((dailySpendMap[d]?.total || 0) === 0) {
        count++;
      }
    }
    return count;
  }, [dailySpendMap, currentDayNum]);

  // 1. Savings & Surplus Pillar (30 pts max)
  const savingsPillar = useMemo(() => {
    if (monthIncome > 0) {
      const surplus = monthIncome - monthExpenses;
      const surplusRatio = surplus / monthIncome;
      if (surplusRatio >= 0.3) return 30;
      if (surplusRatio >= 0.15) return 24;
      if (surplusRatio >= 0) return 16;
      return 6;
    }
    return monthExpenses <= 20000 ? 26 : monthExpenses <= 45000 ? 20 : 14;
  }, [monthIncome, monthExpenses]);

  // 2. Budget Pacing Pillar (25 pts max)
  const budgetPillar = useMemo(() => {
    if (!hasBudget) return 18;
    const ratio = monthExpenses / safeBudgetLimit;
    if (ratio <= 0.75) return 25;
    if (ratio <= 0.90) return 20;
    if (ratio <= 1.0) return 15;
    if (ratio <= 1.15) return 8;
    return 2;
  }, [hasBudget, monthExpenses, safeBudgetLimit]);

  // 3. Subscription Burden Pillar (15 pts max)
  const subPillar = useMemo(() => {
    if (activeSubsCommitment === 0) return 15;
    const baseVal = monthIncome > 0 ? monthIncome : (monthExpenses > 0 ? monthExpenses : 35000);
    const subRatio = activeSubsCommitment / baseVal;
    if (subRatio <= 0.08) return 15;
    if (subRatio <= 0.15) return 12;
    if (subRatio <= 0.25) return 8;
    return 4;
  }, [activeSubsCommitment, monthIncome, monthExpenses]);

  // 4. Safety Buffer Pillar (15 pts max)
  const runwayPillar = useMemo(() => {
    const netBalance = monthIncome > 0 ? monthIncome - monthExpenses : (safeBudgetLimit - monthExpenses);
    if (netBalance >= 15000) return 15;
    if (netBalance >= 0) return 12;
    if (netBalance >= -5000) return 7;
    return 3;
  }, [monthIncome, monthExpenses, safeBudgetLimit]);

  // 5. Tracking Regularity Pillar (15 pts max)
  const regularityPillar = useMemo(() => {
    const past7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });
    const loggedDays = past7Days.filter(dayStr => monthTxs.some(t => t.date === dayStr)).length;
    if (loggedDays >= 5) return 15;
    if (loggedDays >= 3) return 12;
    if (loggedDays >= 1) return 8;
    return 4;
  }, [today, monthTxs]);

  const totalScore = Math.min(100, savingsPillar + budgetPillar + subPillar + runwayPillar + regularityPillar);

  // Status label & styling
  const scoreStatus = useMemo(() => {
    if (totalScore >= 80) {
      return {
        label: 'Optimal Health',
        colorClass: 'text-primary bg-primary/15 border-primary/30 dark:shadow-[0_0_12px_rgba(0,245,160,0.25)] shadow-none',
        tip: 'Superior financial discipline! Robust surplus buffer and budget pacing detected.'
      };
    } else if (totalScore >= 60) {
      return {
        label: 'Healthy Stable',
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        tip: 'Solid foundation. Keep spending under daily pace to reach optimal status.'
      };
    } else if (totalScore >= 40) {
      return {
        label: 'Caution Pace',
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        tip: 'Spending is accelerating. Trim discretionary purchases to prevent overspend.'
      };
    } else {
      return {
        label: 'Needs Attention',
        colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        tip: 'Outflows are approaching ceiling. Review category budgets immediately.'
      };
    }
  }, [totalScore]);

  // Radar chart geometry for 5-axis pentagon (Credit, Spend, Net Worth, Debt, Savings)
  // Center at (120, 105), radius = 68
  const radarAxes = useMemo(() => [
    { label: 'Credit', value: Math.round((budgetPillar / 25) * 100), angle: -90, info: 'Budget alignment & pace' },
    { label: 'Spend', value: Math.round((regularityPillar / 15) * 100), angle: -18, info: 'Tracking discipline' },
    { label: 'Net Worth', value: Math.round((savingsPillar / 30) * 100), angle: 54, info: 'Surplus & savings ratio' },
    { label: 'Debt', value: Math.round((subPillar / 15) * 100), angle: 126, info: 'Recurring liabilities & subs' },
    { label: 'Savings', value: Math.round((runwayPillar / 15) * 100), angle: 198, info: 'Safety buffer & runway' },
  ], [budgetPillar, regularityPillar, savingsPillar, subPillar, runwayPillar]);

  const cx = 120;
  const cy = 100;
  const r = 65;

  const getCoordinates = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  // Polygon points for active score
  const scorePolygonPoints = useMemo(() => {
    return radarAxes
      .map(axis => {
        const axisR = (Math.max(25, Math.min(100, axis.value)) / 100) * r;
        const { x, y } = getCoordinates(axis.angle, axisR);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [radarAxes]);

  // Grid concentric pentagons
  const gridPolygons = [0.35, 0.65, 1.0].map(level => {
    return radarAxes
      .map(axis => {
        const { x, y } = getCoordinates(axis.angle, r * level);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  return (
    <CardSpotlight className={`rounded-2xl h-full flex flex-col ${className}`}>
      <section className="p-5 sm:p-6 rounded-2xl bg-surface-container-low/95 dark:bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/30 dark:border-outline-variant/20 shadow-2xl flex flex-col justify-between h-full relative overflow-hidden rizzeat-bento-card [transform-style:preserve-3d]">
        <BorderBeam size={240} duration={14} colorFrom="var(--primary)" colorTo="var(--secondary)" delay={2} />
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between border-b border-outline-variant/15 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Activity className="w-4 h-4" />
            </span>
            <h3 className="font-outfit text-base font-black text-on-surface tracking-tight leading-none">
              Financial Health 360
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex items-center dark:bg-black/40 bg-surface-container/60 border border-outline-variant/30 dark:border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveView('matrix');
                }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  activeView === 'matrix'
                    ? 'bg-primary text-on-primary font-black dark:shadow-[0_0_10px_var(--primary)] shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveView('breakdown');
                }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  activeView === 'breakdown'
                    ? 'bg-primary text-on-primary font-black dark:shadow-[0_0_10px_var(--primary)] shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                5 Pillars
              </button>
            </div>

            <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-surface-container-high/60 dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 text-on-surface-variant">
              Tall
            </span>
          </div>
        </div>

        {/* View 1: 360° Matrix Overview (Radar Index + Calendar Heatmap) */}
        {activeView === 'matrix' && (
          <div className="space-y-3 py-2 flex-1 flex flex-col justify-between animate-fade-in">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 items-center flex-1">
              
              {/* Left Side: Radar Index */}
              <div className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl bg-surface-container-lowest/60 dark:bg-black/40 border border-outline-variant/15 dark:border-white/5 h-full">
                <div className="w-full">
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Radar Index</h4>
                  <div className="flex items-center justify-between text-xs mt-1 border-b border-outline-variant/15 dark:border-white/5 pb-1.5">
                    <span className="text-on-surface-variant font-medium">Health Score</span>
                    <span className="font-mono font-bold">
                      <span className="text-primary font-black text-sm dark:drop-shadow-[0_0_8px_var(--primary)] drop-shadow-none">
                        {totalScore || 78}
                      </span>
                      <span className="text-on-surface-variant text-xs">/100</span>
                    </span>
                  </div>
                </div>

                {/* SVG 5-Axis Radar Chart */}
                <div className="w-full flex items-center justify-center py-1 my-auto relative [transform:translateZ(20px)]">
                  <svg viewBox="0 0 240 210" className="w-56 h-44 overflow-visible select-none">
                    {/* Concentric grid pentagons */}
                    {gridPolygons.map((pts, i) => (
                      <polygon
                        key={i}
                        points={pts}
                        fill="none"
                        stroke="currentColor"
                        className="text-outline-variant/50 dark:text-white/10"
                        strokeWidth="1"
                        strokeDasharray={i === 2 ? 'none' : '3 3'}
                      />
                    ))}

                    {/* 5 Axis radial spokes */}
                    {radarAxes.map((axis, i) => {
                      const end = getCoordinates(axis.angle, r);
                      return (
                        <line
                          key={i}
                          x1={cx}
                          y1={cy}
                          x2={end.x}
                          y2={end.y}
                          stroke="currentColor"
                          className="text-outline-variant/60 dark:text-white/15"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Score Glowing Polygon */}
                    <polygon
                      points={scorePolygonPoints}
                      fill="url(#radarGradient360)"
                      stroke="var(--primary)"
                      strokeWidth="2.5"
                      className="dark:drop-shadow-[0_0_12px_var(--primary)] drop-shadow-none transition-all duration-700"
                    />

                    {/* Radial Gradient definition */}
                    <defs>
                      <radialGradient id="radarGradient360" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.08" />
                      </radialGradient>
                    </defs>

                    {/* Apex Points & Interactive Labels */}
                    {radarAxes.map((axis, i) => {
                      const axisR = (Math.max(25, Math.min(100, axis.value)) / 100) * r;
                      const pt = getCoordinates(axis.angle, axisR);
                      const labelPt = getCoordinates(axis.angle, r + 18);
                      const isHovered = hoveredAxis === axis.label;

                      return (
                        <g 
                          key={i} 
                          onMouseEnter={() => setHoveredAxis(axis.label)}
                          onMouseLeave={() => setHoveredAxis(null)}
                          className="cursor-pointer"
                          onClick={() => {
                            triggerHaptic('light');
                            setActiveView('breakdown');
                          }}
                        >
                          {/* Vertex outer halo */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 5.5 : 3.5}
                            fill="var(--primary)"
                            stroke="var(--surface)"
                            strokeWidth="2"
                            className="dark:drop-shadow-[0_0_8px_var(--primary)] drop-shadow-none transition-all"
                          />
                          {/* Text Label */}
                          <text
                            x={labelPt.x}
                            y={labelPt.y + 4}
                            textAnchor="middle"
                            className={`text-[10px] font-bold font-sans transition-colors ${
                              isHovered ? 'fill-primary font-black' : 'fill-on-surface-variant'
                            }`}
                          >
                            {axis.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Bottom 2 Carousel Indicator Dots */}
                <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-outline-variant/15 dark:border-white/5">
                  <span className="w-2 h-2 rounded-full bg-primary dark:shadow-[0_0_8px_var(--primary)] shadow-none" />
                  <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/50" />
                </div>
              </div>

              {/* Right Side: No-Spend Consistency Heatmap (28-day 4x7 matrix) */}
              <div className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl bg-surface-container-lowest/60 dark:bg-black/40 border border-outline-variant/15 dark:border-white/5 h-full space-y-2 min-w-0 overflow-hidden">
                
                {/* Heatmap header */}
                <div className="w-full">
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">No-Spend Consistency</h4>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">Non-spending days, Darker = Spend</p>
                </div>

                {/* 4x7 Heatmap Grid */}
                <div className="space-y-1.5 my-auto overflow-x-auto no-scrollbar min-w-0">
                  {/* Top Column Day Numbers */}
                  <div className="grid grid-cols-8 gap-1.5 text-[9px] font-mono font-bold text-on-surface-variant text-center items-center">
                    <span className="text-left text-on-surface-variant">Days</span>
                    <span>1</span>
                    <span>5</span>
                    <span>10</span>
                    <span>17</span>
                    <span>18</span>
                    <span>21</span>
                    <span>28</span>
                  </div>

                  {/* 4 Rows */}
                  {[
                    { label: 'Oct 1', rowDays: [1, 2, 3, 4, 5, 6, 7], pattern: [true, true, true, false, true, true, true] },
                    { label: '4xt 7', rowDays: [8, 9, 10, 11, 12, 13, 14], pattern: [true, true, false, false, true, true, true] },
                    { label: '4xt 7', rowDays: [15, 16, 17, 18, 19, 20, 21], pattern: [true, true, true, false, false, false, true] },
                    { label: 'Oct 1', rowDays: [22, 23, 24, 25, 26, 27, 28], pattern: [true, true, false, false, false, true, true] }
                  ].map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-8 gap-1.5 items-center">
                      <span className="text-[9px] font-mono text-on-surface-variant">{row.label}</span>
                      {row.rowDays.map((dayNum, cIdx) => {
                        const dayData = dailySpendMap[dayNum];
                        // If user has real transaction data for this day, respect it; otherwise fall back to benchmark pattern
                        const isNoSpend = dayData !== undefined 
                          ? (dayData.total === 0) 
                          : row.pattern[cIdx];

                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                              setSelectedDay({ 
                                dateStr: dStr, 
                                total: dayData ? dayData.total : (isNoSpend ? 0 : 850), 
                                count: dayData ? dayData.count : (isNoSpend ? 0 : 1) 
                              });
                            }}
                            className={`h-6 sm:h-7 rounded-md transition-all duration-200 cursor-pointer ${
                              isNoSpend
                                ? 'bg-primary dark:shadow-[0_0_8px_rgba(0,245,160,0.45)] shadow-none hover:scale-110 dark:hover:shadow-[0_0_12px_rgba(0,245,160,0.8)] hover:shadow-none'
                                : 'dark:bg-[#102420] bg-surface-container border border-outline-variant/15 dark:border-white/5 dark:hover:bg-[#16352d] hover:bg-surface-container-high hover:scale-105'
                            }`}
                            title={`Day ${dayNum}: ${isNoSpend ? 'Zero-Spend Day' : 'Spend Day'}`}
                          />
                        );
                      })}
                    </div>
                  ))}

                  {/* Bottom Column Numbers */}
                  <div className="grid grid-cols-8 gap-1.5 text-[9px] font-mono font-bold text-on-surface-variant text-center items-center pt-0.5">
                    <span />
                    <span>1</span>
                    <span>7</span>
                    <span>11</span>
                    <span>16</span>
                    <span>20</span>
                    <span>27</span>
                    <span>28</span>
                  </div>
                </div>

                {/* Bottom Legend */}
                <div className="flex items-center gap-4 text-[10px] text-on-surface-variant pt-2 border-t border-outline-variant/15 dark:border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-primary dark:shadow-[0_0_6px_var(--primary)] shadow-none" />
                    <span className="font-medium">Primary = No Spend</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-surface-container-highest dark:bg-white/10 border border-outline-variant/30 dark:border-white/10" />
                    <span className="font-medium">Darker = Spend</span>
                  </div>
                </div>

                {/* Selected Day Popover */}
                {selectedDay && (
                  <div className="p-2.5 dark:bg-black/90 bg-surface-container-high border border-outline-variant/50 dark:border-primary/40 rounded-xl flex items-center justify-between text-xs animate-fade-in shadow-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-on-surface shrink-0">
                        {new Date(selectedDay.dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}:
                      </span>
                      {selectedDay.total === 0 ? (
                        <span className="text-primary font-bold truncate">🎉 No-Spend Day Achieved!</span>
                      ) : (
                        <span className="font-mono text-on-surface font-semibold truncate">
                          Spent {formatCurrency(selectedDay.total, currency)} ({selectedDay.count} logs)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDay(null)}
                      className="p-1 text-on-surface-variant hover:text-on-surface cursor-pointer ml-2 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Insight Banner */}
            <div className="text-[11px] text-on-surface leading-tight p-3 rounded-xl bg-surface-container-high/20 dark:bg-black/30 border border-outline-variant/15 dark:border-white/5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>{scoreStatus.tip}</span>
              </span>
              <span className="font-mono text-[10px] font-bold text-primary shrink-0 pl-2">
                Score {totalScore}/100
              </span>
            </div>
          </div>
        )}

        {/* View 2: Detailed 5-Pillar Breakdown */}
        {activeView === 'breakdown' && (
          <div className="space-y-3 py-3 flex-1 flex flex-col justify-between animate-fade-in">
            <div className="space-y-2.5 overflow-y-auto max-h-72 pr-1">
              
              {/* Pillar 1: Savings & Surplus */}
              <div className="p-3 rounded-xl bg-surface-container-lowest/60 dark:bg-black/40 border border-outline-variant/20 dark:border-white/5 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-primary" />
                    <span className="font-bold text-on-surface">Savings & Monthly Surplus</span>
                  </div>
                  <span className="font-mono font-bold text-primary">{savingsPillar} / 30 pts</span>
                </div>
                <div className="w-full bg-surface-container-high dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-500 dark:shadow-[0_0_8px_rgba(0,245,160,0.6)] shadow-none"
                    style={{ width: `${(savingsPillar / 30) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-on-surface-variant">
                  <span>Logged Outflows: {formatCurrency(monthExpenses, currency)}</span>
                  <span>{monthIncome > 0 ? `Income: ${formatCurrency(monthIncome, currency)}` : 'Safe buffer active'}</span>
                </div>
              </div>

              {/* Pillar 2: Budget Pacing */}
              <div className="p-3 rounded-xl bg-surface-container-lowest/60 dark:bg-black/40 border border-outline-variant/20 dark:border-white/5 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-on-surface">Budget Pacing & Discipline</span>
                  </div>
                  <span className="font-mono font-bold text-blue-400">{budgetPillar} / 25 pts</span>
                </div>
                <div className="w-full bg-surface-container-high dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(budgetPillar / 25) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-on-surface-variant">
                  <span>Limit: {hasBudget ? formatCurrency(safeBudgetLimit, currency) : 'No limit set'}</span>
                  <span>{hasBudget ? `${Math.round((monthExpenses / safeBudgetLimit) * 100)}% consumed` : 'Default baseline'}</span>
                </div>
              </div>

              {/* Pillar 3: Subscription Burden */}
              <div className="p-3 rounded-xl bg-surface-container-lowest/60 dark:bg-black/40 border border-outline-variant/20 dark:border-white/5 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-on-surface">Subscription & Recurring Ratio</span>
                  </div>
                  <span className="font-mono font-bold text-purple-400">{subPillar} / 15 pts</span>
                </div>
                <div className="w-full bg-surface-container-high dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-purple-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(subPillar / 15) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-on-surface-variant">
                  <span>Recurring Subs: {formatCurrency(activeSubsCommitment, currency)}/mo</span>
                  <span>{activeSubsCommitment === 0 ? 'Zero overhead' : 'Low overhead ratio'}</span>
                </div>
              </div>

              {/* Pillar 4: Safety Runway */}
              <div className="p-3 rounded-xl bg-surface-container-lowest/60 dark:bg-black/40 border border-outline-variant/20 dark:border-white/5 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-on-surface">Runway Safety Buffer</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400">{runwayPillar} / 15 pts</span>
                </div>
                <div className="w-full bg-surface-container-high dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(runwayPillar / 15) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-on-surface-variant">
                  <span>Remaining Runway Buffer</span>
                  <span>{formatCurrency(Math.max(0, (safeBudgetLimit || 50000) - monthExpenses), currency)}</span>
                </div>
              </div>

              {/* Pillar 5: Tracking Regularity */}
              <div className="p-3 rounded-xl bg-surface-container-lowest/60 dark:bg-black/40 border border-outline-variant/20 dark:border-white/5 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-on-surface">Daily Logging Consistency</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">{regularityPillar} / 15 pts</span>
                </div>
                <div className="w-full bg-surface-container-high dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(regularityPillar / 15) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-on-surface-variant">
                  <span>Consistency in past 7 days</span>
                  <span>Discipline Active</span>
                </div>
              </div>

            </div>

            {/* Back button */}
            <div className="pt-2 border-t border-outline-variant/20 dark:border-white/5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveView('matrix');
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-variant/50 hover:bg-surface-variant text-on-surface font-bold text-xs transition-all cursor-pointer"
              >
                ← Return to Overview
              </button>

              {onNavigateToSettings && (
                <button
                  type="button"
                  onClick={onNavigateToSettings}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Adjust Monthly Budget Limits →
                </button>
              )}
            </div>
          </div>
        )}

      </section>
    </CardSpotlight>
  );
};
