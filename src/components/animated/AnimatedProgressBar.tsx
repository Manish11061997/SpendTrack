import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface AnimatedProgressBarProps {
  percentage: number; // 0 to 100+
  className?: string;
  barClassName?: string;
  duration?: number; // seconds, default 0.6
  showThresholdColors?: boolean; // green -> amber -> red
  heightClassName?: string;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  percentage,
  className = '',
  barClassName = '',
  duration = 0.6,
  showThresholdColors = true,
  heightClassName = 'h-2',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const clampedPct = Math.max(0, Math.min(percentage, 100));
  const scaleRatio = clampedPct / 100;

  // Determine dynamic threshold color
  const getColorClass = () => {
    if (!showThresholdColors) return 'bg-primary';
    if (percentage > 100) return 'bg-error';
    if (percentage >= 85) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div
      className={`w-full bg-surface-container-highest/60 rounded-full overflow-hidden relative ${heightClassName} ${className}`}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={`h-full origin-left rounded-full relative overflow-hidden ${getColorClass()} ${barClassName}`}
        initial={shouldReduceMotion ? { scaleX: scaleRatio } : { scaleX: 0 }}
        animate={{ scaleX: scaleRatio }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                duration,
                ease: [0.16, 1, 0.3, 1] as const, // snappy ease-out
              }
        }
        style={{ willChange: 'transform' }}
      >
        {/* Shimmer light wave highlight */}
        {!shouldReduceMotion && (
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer"
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default AnimatedProgressBar;
