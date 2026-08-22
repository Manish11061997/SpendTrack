import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Award, Sparkles, Flame, Zap,
  ShieldCheck, PiggyBank, Target, Crown, Star,
  CheckCircle2, Lock, Trophy
} from 'lucide-react';
import { AchievementBadge } from '../types';

interface AchievementBadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: AchievementBadge[];
}

interface BadgeStyleDef {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  glow: string;
}

const BADGE_STYLES: Record<string, BadgeStyleDef> = {
  Sparkles: {
    icon: <Sparkles className="w-5 h-5" />,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    glow: '0 0 16px rgba(245, 158, 11, 0.25)',
  },
  Flame: {
    icon: <Flame className="w-5 h-5" />,
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.14)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    glow: '0 0 16px rgba(244, 63, 94, 0.25)',
  },
  Zap: {
    icon: <Zap className="w-5 h-5" />,
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.14)',
    borderColor: 'rgba(234, 179, 8, 0.35)',
    glow: '0 0 16px rgba(234, 179, 8, 0.25)',
  },
  ShieldCheck: {
    icon: <ShieldCheck className="w-5 h-5" />,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    glow: '0 0 16px rgba(16, 185, 129, 0.25)',
  },
  PiggyBank: {
    icon: <PiggyBank className="w-5 h-5" />,
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.14)',
    borderColor: 'rgba(236, 72, 153, 0.35)',
    glow: '0 0 16px rgba(236, 72, 153, 0.25)',
  },
  Target: {
    icon: <Target className="w-5 h-5" />,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.14)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    glow: '0 0 16px rgba(139, 92, 246, 0.25)',
  },
  Crown: {
    icon: <Crown className="w-5 h-5" />,
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.14)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    glow: '0 0 16px rgba(6, 182, 212, 0.25)',
  },
  Star: {
    icon: <Star className="w-5 h-5" />,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.14)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    glow: '0 0 16px rgba(59, 130, 246, 0.25)',
  },
};

const DEFAULT_STYLE: BadgeStyleDef = {
  icon: <Award className="w-5 h-5" />,
  color: '#f59e0b',
  bgColor: 'rgba(245, 158, 11, 0.14)',
  borderColor: 'rgba(245, 158, 11, 0.35)',
  glow: '0 0 16px rgba(245, 158, 11, 0.25)',
};

const getRankInfo = (unlocked: number, total: number) => {
  const ratio = total > 0 ? unlocked / total : 0;
  if (ratio === 0)   return { title: 'Rookie Tracker',      icon: Star,   color: '#94a3b8' };
  if (ratio <= 0.3)  return { title: 'Budget Explorer',     icon: Trophy, color: '#f59e0b' };
  if (ratio <= 0.6)  return { title: 'Financial Strategist',icon: Award,  color: '#10b981' };
  if (ratio <= 0.9)  return { title: 'Master Accumulator', icon: Zap,    color: '#3b82f6' };
  return               { title: 'Grand Wealth Master', icon: Crown,  color: '#a78bfa' };
};

export const AchievementBadgesModal: React.FC<AchievementBadgesModalProps> = ({
  isOpen,
  onClose,
  badges = [],
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  if (!isOpen) return null;

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const totalCount    = badges.length;
  const pct           = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
  const rank          = getRankInfo(unlockedCount, totalCount);
  const RankIcon      = rank.icon;

  const filtered = badges.filter(b => {
    if (filter === 'unlocked') return b.unlocked;
    if (filter === 'locked')   return !b.unlocked;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      {/* Backdrop click listener */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full sm:max-w-xl bg-surface-container-lowest border border-outline-variant/40 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] sm:max-h-[85vh]"
      >
        {/* ── Modal Header ── */}
        <div className="shrink-0 p-5 space-y-4 border-b border-outline-variant/20 bg-surface-container-low/40">
          {/* Header Title & Close Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-on-surface font-outfit leading-tight">
                  Financial Achievements
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs"
                    style={{
                      color: rank.color,
                      backgroundColor: `${rank.color}15`,
                      border: `1px solid ${rank.color}35`,
                    }}
                  >
                    <RankIcon className="w-3 h-3" />
                    {rank.title}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close achievements"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Overall XP Progress Bar */}
          <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/25 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-on-surface-variant flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-500" />
                Mastery Score
              </span>
              <span className="font-mono font-black text-primary">
                {unlockedCount} / {totalCount} Badges ({pct}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden p-0.5 border border-outline-variant/15">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-primary shadow-xs"
              />
            </div>
          </div>

          {/* Filter Segmented Control */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-surface-container-low border border-outline-variant/20 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-primary text-on-primary shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilter('unlocked')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'unlocked'
                  ? 'bg-primary text-on-primary shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Unlocked ({unlockedCount})
            </button>
            <button
              onClick={() => setFilter('locked')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'locked'
                  ? 'bg-primary text-on-primary shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Locked ({totalCount - unlockedCount})
            </button>
          </div>
        </div>

        {/* ── Badges List Grid ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
                <Award className="w-6 h-6 text-on-surface-variant/40" />
              </div>
              <p className="text-xs font-semibold text-on-surface-variant">
                {filter === 'unlocked'
                  ? 'No badges unlocked yet! Keep logging transactions to earn achievements.'
                  : 'All available badges unlocked! Fantastic job! 🎉'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <AnimatePresence mode="popLayout">
                {filtered.map((badge, idx) => {
                  const style = BADGE_STYLES[badge.icon] ?? DEFAULT_STYLE;
                  const isUnlocked = badge.unlocked;
                  const progressPct = Math.max(0, Math.min(100, badge.progress ?? 0));

                  return (
                    <motion.div
                      key={badge.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all relative overflow-hidden ${
                        isUnlocked
                          ? 'bg-surface-container-low hover:bg-surface-container-high border-outline-variant/40 shadow-xs'
                          : 'bg-surface-container-lowest border-outline-variant/20 opacity-75'
                      }`}
                      style={{
                        borderColor: isUnlocked ? style.borderColor : undefined,
                        boxShadow: isUnlocked ? style.glow : undefined,
                      }}
                    >
                      {/* Badge Card Top Row */}
                      <div className="flex items-start justify-between gap-3">
                        {/* Emblem Icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform"
                          style={{
                            backgroundColor: isUnlocked ? style.bgColor : 'var(--surface-container)',
                            borderColor: isUnlocked ? style.borderColor : 'var(--outline-variant)',
                            color: isUnlocked ? style.color : 'var(--on-surface-variant)',
                          }}
                        >
                          {style.icon}
                        </div>

                        {/* Status Tag */}
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Unlocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant/70 border border-outline-variant/30 shrink-0">
                            <Lock className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h4 className="text-xs sm:text-sm font-bold text-on-surface leading-tight font-outfit">
                          {badge.title}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant leading-normal">
                          {badge.description}
                        </p>
                      </div>

                      {/* Bottom Status / Progress Indicator */}
                      {isUnlocked ? (
                        <div className="pt-1 flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-t border-outline-variant/15">
                          <span>Achievement Mastered</span>
                          <span>100%</span>
                        </div>
                      ) : (
                        <div className="pt-1 space-y-1.5 border-t border-outline-variant/15">
                          <div className="flex items-center justify-between text-[10px] font-bold text-on-surface-variant">
                            <span>Requirement Progress</span>
                            <span className="font-mono">{progressPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="shrink-0 p-4 border-t border-outline-variant/20 bg-surface-container-low/40">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/95 transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
