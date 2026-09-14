import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`p-8 sm:p-10 rounded-3xl bg-surface-container-low/70 dark:bg-surface-container-lowest/60 backdrop-blur-md border border-dashed border-outline-variant/50 text-center flex flex-col items-center justify-center gap-3 select-none ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-container-high/60 dark:bg-white/5 border border-outline-variant/30 flex items-center justify-center text-on-surface-variant shadow-xs">
        <Icon className="w-7 h-7 text-primary/80" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="font-outfit text-sm sm:text-base font-bold text-on-surface">{title}</h4>
        {description && (
          <p className="text-xs text-on-surface-variant leading-relaxed">{description}</p>
        )}
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-on-primary text-xs font-bold rounded-xl shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
};
