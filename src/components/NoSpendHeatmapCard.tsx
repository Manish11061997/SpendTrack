import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, BudgetConfig } from '../types';
import { formatCurrency } from '../utils/currency';
import { Flame, Award, Calendar as CalendarIcon, CheckCircle2, Zap, Sparkles, ChevronRight } from 'lucide-react';

interface NoSpendHeatmapCardProps {
  transactions: Transaction[];
  budget: BudgetConfig;
}

export const NoSpendHeatmapCard: React.FC<NoSpendHeatmapCardProps> = ({
  transactions = [],
  budget
}) => {
  const [selectedDay, setSelectedDay] = useState<{ dateStr: string; total: number; count: number } | null>(null);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeBudgetLimit = Number(budget?.monthlyLimit) || 0;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  const currentDayNum = today.getDate();

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Daily spend map
  const dailySpendMap: Record<number, { total: number; count: number }> = {};
  for (let d = 1; d <= totalDaysInMonth; d++) {
    dailySpendMap[d] = { total: 0, count: 0 };
  }

  safeTransactions.forEach(t => {
    if (t && t.date && typeof t.date === 'string' && t.date.startsWith(currentMonthKey)) {
      const parts = t.date.split('-');
      if (parts.length === 3) {
        const dayNum = parseInt(parts[2], 10);
        if (dayNum >= 1 && dayNum <= totalDaysInMonth) {
          if (Number(t.amount) < 0) {
            const absAmt = Math.abs(Number(t.amount) || 0);
            dailySpendMap[dayNum].total += absAmt;
            dailySpendMap[dayNum].count += 1;
          }
        }
      }
    }
  });

  const dailyThreshold = safeBudgetLimit > 0 ? safeBudgetLimit / totalDaysInMonth : 1000;

  // Calculate active streak (consecutive days ending today with 0 or moderate spend)
  let currentStreak = 0;
  for (let d = currentDayNum; d >= 1; d--) {
    const dayData = dailySpendMap[d];
    if (dayData.total === 0 || dayData.total <= dailyThreshold) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Count total no-spend days in month so far
  let noSpendDaysCount = 0;
  for (let d = 1; d <= currentDayNum; d++) {
    if (dailySpendMap[d].total === 0) {
      noSpendDaysCount++;
    }
  }

  // Achievement Badges
  const badges = [
    { title: '3-Day Discipline Spark', req: 3, isUnlocked: currentStreak >= 3 || noSpendDaysCount >= 3, icon: Zap, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    { title: '7-Day Wealth Warrior', req: 7, isUnlocked: currentStreak >= 7 || noSpendDaysCount >= 7, icon: Flame, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
    { title: '14-Day Budget Master', req: 14, isUnlocked: currentStreak >= 14 || noSpendDaysCount >= 14, icon: Award, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
    { title: '30-Day Zen Guru', req: 30, isUnlocked: currentStreak >= 30 || noSpendDaysCount >= 25, icon: Sparkles, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }
  ];

  return (
    <div className="p-5 bg-surface-container-lowest border border-outline-variant/30 rounded-3xl space-y-4 shadow-sm backdrop-blur-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Flame className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-bold text-xs text-on-surface flex items-center gap-1.5">
              No-Spend Heatmap & Discipline Streaks
            </h3>
            <p className="text-[10px] text-on-surface-variant">Track zero-expense days & streak badges</p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black font-mono">
          <Flame className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>{currentStreak} Day Streak</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant px-1">
          <span>{today.toLocaleString('en-IN', { month: 'long', year: 'numeric' })} Heatmap</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-mono">{noSpendDaysCount} Zero-Spend Days</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 p-3 bg-surface-container border border-outline-variant/20 rounded-2xl">
          {Array.from({ length: totalDaysInMonth }, (_, idx) => {
            const dayNum = idx + 1;
            const isFuture = dayNum > currentDayNum;
            const isToday = dayNum === currentDayNum;
            const dayData = dailySpendMap[dayNum];

            let tileStyle = 'bg-surface-container-highest/40 text-on-surface-variant/40';
            let tileBorder = 'border-transparent';

            if (!isFuture) {
              if (dayData.total === 0) {
                tileStyle = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold';
                tileBorder = 'border-emerald-500/30';
              } else if (dayData.total <= dailyThreshold) {
                tileStyle = 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium';
                tileBorder = 'border-amber-500/30';
              } else {
                tileStyle = 'bg-error/20 text-error font-medium';
                tileBorder = 'border-error/30';
              }
            }

            return (
              <button
                key={dayNum}
                onClick={() => {
                  if (!isFuture) {
                    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    setSelectedDay({ dateStr: dStr, total: dayData.total, count: dayData.count });
                  }
                }}
                className={`h-8 rounded-xl border flex flex-col items-center justify-center text-[10px] transition-all hover:scale-105 cursor-pointer relative ${tileStyle} ${tileBorder} ${
                  isToday ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900 font-black' : ''
                }`}
              >
                <span>{dayNum}</span>
                {dayData.total === 0 && !isFuture && (
                  <span className="w-1 h-1 rounded-full bg-emerald-500 absolute bottom-1"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[9px] text-on-surface-variant font-medium pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-emerald-500/30 border border-emerald-500/40"></span>
            <span>Zero Spend (No-Spend Day)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-amber-500/30 border border-amber-500/40"></span>
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-md bg-error/30 border border-error/40"></span>
            <span>High Spend</span>
          </div>
        </div>
      </div>

      {/* Selected Day Detail Popover */}
      {selectedDay && (
        <div className="p-3 bg-surface-container border border-outline-variant/30 rounded-2xl flex items-center justify-between text-xs animate-fade-in">
          <div>
            <span className="font-bold text-on-surface">
              {new Date(selectedDay.dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}:
            </span>{' '}
            {selectedDay.total === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">🎉 No-Spend Day Achieved!</span>
            ) : (
              <span className="font-mono text-on-surface-variant font-semibold">
                Spent {formatCurrency(selectedDay.total, budget?.currency || 'INR')} ({selectedDay.count} logs)
              </span>
            )}
          </div>
          <button
            onClick={() => setSelectedDay(null)}
            className="text-[10px] text-on-surface-variant hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Gamification Badges */}
      <div className="pt-2 border-t border-outline-variant/20 space-y-2">
        <span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider block">
          Discipline Milestone Badges
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {badges.map((b) => {
            const IconComp = b.icon;
            return (
              <div
                key={b.title}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                  b.isUnlocked
                    ? b.color
                    : 'bg-surface-container/40 border-outline-variant/15 text-on-surface-variant/40 opacity-60'
                }`}
              >
                <IconComp className="w-4 h-4" />
                <span className="text-[9px] font-bold leading-tight">{b.title}</span>
                <span className="text-[8px] font-mono font-medium">
                  {b.isUnlocked ? '✓ Unlocked' : `${b.req} Days Target`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
