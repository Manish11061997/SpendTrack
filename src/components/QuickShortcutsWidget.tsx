import React from 'react';
import { FileText, Mic, Calendar, Sparkles, Plus, Activity, Settings } from 'lucide-react';

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
    { label: 'Audit', icon: FileText, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20 active:bg-indigo-500/20', action: onOpenExportAudit },
    { label: 'Voice Log', icon: Mic, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 active:bg-emerald-500/20', action: onOpenVoice || onOpenAddTx },
    { label: 'Insights', icon: Activity, color: 'text-primary bg-primary/10 border-primary/20 active:bg-primary/20', action: onOpenInsights },
    { label: 'Settings', icon: Settings, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20 active:bg-slate-500/20', action: onNavigateToSettings || onOpenInsights },
    { label: 'Calendar', icon: Calendar, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20 active:bg-blue-500/20', action: onOpenCalendar },
    { label: 'Add Log', icon: Plus, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20 active:bg-purple-500/20', action: onOpenAddTx },
  ];

  return (
    <div className="p-2.5 sm:p-3.5 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl space-y-2 shadow-2xs">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Shortcuts
        </span>
        <span className="text-[9px] font-mono text-on-surface-variant font-semibold px-2 py-0.5 bg-surface-container-high rounded-full border border-outline-variant/20">
          Cockpit
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1 sm:gap-2">
        {shortcuts.map((sc) => {
          const IconComp = sc.icon;
          return (
            <button
              key={sc.label}
              type="button"
              onClick={sc.action}
              className={`p-1.5 sm:p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer text-center group ${sc.color}`}
            >
              <span className="p-1 rounded-md bg-surface-container-lowest/90 transition-transform group-active:scale-90">
                <IconComp className="w-3.5 h-3.5" />
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-tight leading-none text-on-surface truncate w-full">{sc.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
