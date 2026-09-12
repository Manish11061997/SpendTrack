import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PressSlideTextProps {
  children: React.ReactNode;
  className?: string;
  duration?: number; // ms, default 220
}

export const PressSlideText: React.FC<PressSlideTextProps> = ({
  children,
  className = '',
  duration = 220,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isPressed, setIsPressed] = useState(false);

  const handlePressStart = () => {
    setIsPressed(true);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
  };

  if (shouldReduceMotion) {
    return <span className={className}>{children}</span>;
  }

  const transition = {
    duration: duration / 1000,
    ease: [0.16, 1, 0.3, 1] as const,
  };

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden align-middle select-none ${className}`}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerCancel={handlePressEnd}
      onPointerLeave={handlePressEnd}
      style={{ height: '1.25em', verticalAlign: 'middle' }}
    >
      {/* Primary Label: slides up on press */}
      <motion.span
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
        initial={false}
        animate={{
          y: isPressed ? '-100%' : '0%',
          opacity: isPressed ? 0 : 1,
        }}
        transition={transition}
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.span>

      {/* Secondary Duplicate: slides in from below on press */}
      <motion.span
        className="absolute inset-0 flex items-center justify-center gap-1.5 whitespace-nowrap"
        initial={false}
        animate={{
          y: isPressed ? '0%' : '100%',
          opacity: isPressed ? 1 : 0,
        }}
        transition={transition}
        style={{ willChange: 'transform, opacity' }}
        aria-hidden="true"
      >
        {children}
      </motion.span>
    </span>
  );
};

export default PressSlideText;
