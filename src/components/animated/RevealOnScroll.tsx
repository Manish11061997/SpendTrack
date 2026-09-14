import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number; // Delay multiplier based on list index (seconds or index)
  delay?: number; // Base delay in seconds
  duration?: number; // Duration in seconds (default 0.35)
}

export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  className = '',
  stagger,
  delay = 0,
  duration = 0.35,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  // Calculate actual delay if stagger is passed as index or seconds
  const computedDelay = stagger !== undefined ? Math.min(stagger * 0.05, 0.3) + delay : delay;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{
        duration,
        delay: computedDelay,
        ease: [0.25, 1, 0.5, 1] as const, // ease-out
      }}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
};

export default RevealOnScroll;
