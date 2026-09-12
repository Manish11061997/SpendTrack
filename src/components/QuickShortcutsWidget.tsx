import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Mic, Calendar, Sparkles, Plus, Activity, Settings } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface QuickShortcutsWidgetProps {
  onOpenExportAudit: () => void;
  onOpenVoice?: () => void;
  onOpenCalendar: () => void;
  onOpenAddTx: () => void;
  onOpenInsights: () => void;
  onNavigateToSettings?: () => void;
  onOpenSms?: () => void;
  onOpenAiCoach?: () => void;
  onScrollToHealthRadar?: () => void;
  onScrollToNoSpend?: () => void;
}

export const QuickShortcutsWidget: React.FC<QuickShortcutsWidgetProps> = ({
  onOpenExportAudit,
  onOpenVoice,
  onOpenCalendar,
  onOpenAddTx,
  onOpenInsights,
  onNavigateToSettings
}) => {
  const shortcuts = [
    { label: 'Audit', icon: FileText, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30 group-hover:border-indigo-500/60', iconColor: 'text-indigo-400', action: onOpenExportAudit },
    { label: 'Voice Log', icon: Mic, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30 group-hover:border-emerald-500/60', iconColor: 'text-emerald-400', action: onOpenVoice || onOpenAddTx },
    { label: 'Insights', icon: Activity, color: 'text-blue-400 bg-blue-500/15 border-blue-500/30 group-hover:border-blue-500/60', iconColor: 'text-blue-400', action: onOpenInsights },
    { label: 'Settings', icon: Settings, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30 group-hover:border-purple-500/60', iconColor: 'text-purple-400', action: onNavigateToSettings || onOpenInsights },
    { label: 'Calendar', icon: Calendar, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30 group-hover:border-cyan-500/60', iconColor: 'text-cyan-400', action: onOpenCalendar },
    { label: 'Add Log', icon: Plus, color: 'text-amber-400 bg-amber-500/15 border-amber-500/30 group-hover:border-amber-500/60', iconColor: 'text-amber-400', action: onOpenAddTx },
  ];

  return (
    <div className="p-3 sm:p-4 glass-card-punchy rounded-2xl space-y-2.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] uppercase font-bold text-on-surface-variant tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Quick Actions
        </span>
        <span className="text-[9px] font-mono font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
          Cockpit
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
        {shortcuts.map((sc) => {
          const IconComp = sc.icon;
          return (
            <motion.button
              key={sc.label}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                sc.action();
              }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.93, y: 1 }}
              transition={{ type: 'spring', stiffness: 480, damping: 22 }}
              className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group ${sc.color} transition-all duration-200 active:scale-95`}
            >
              <span className="p-1.5 rounded-lg bg-surface-container-lowest/80 dark:bg-slate-900/80 shadow-2xs transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6">
                <IconComp className={`w-4 h-4 ${sc.iconColor}`} />
              </span>
              <span className="text-[11px] sm:text-xs font-bold tracking-tight text-on-surface truncate w-full">
                {sc.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
