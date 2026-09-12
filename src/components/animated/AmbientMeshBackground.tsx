import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const AmbientMeshBackground: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Subtle micro-grid layer for fintech depth */}
      <div className="absolute inset-0 bg-fintech-grid opacity-50 dark:opacity-40" />

      {/* Atmospheric radial vignette */}
      <div className="absolute inset-0 bg-radial from-transparent via-transparent to-background/60 dark:to-background/80" />

      {/* Orb 1: Primary Electric Cyan / Blue floating orb */}
      <motion.div
        className="absolute -top-[12%] -left-[10%] w-[65vw] h-[65vw] max-w-[550px] max-h-[550px] rounded-full blur-[90px] opacity-45 dark:opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.65) 0%, rgba(59, 130, 246, 0.3) 45%, rgba(37, 99, 235, 0) 70%)',
          willChange: 'transform',
        }}
        animate={{
          x: [0, 45, -30, 0],
          y: [0, 50, 20, 0],
          scale: [1, 1.12, 0.94, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Orb 2: Electric Indigo / Violet floating orb */}
      <motion.div
        className="absolute top-[28%] -right-[15%] w-[70vw] h-[70vw] max-w-[600px] max-h-[600px] rounded-full blur-[100px] opacity-40 dark:opacity-45"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.55) 0%, rgba(99, 102, 241, 0.3) 45%, rgba(124, 58, 237, 0) 70%)',
          willChange: 'transform',
        }}
        animate={{
          x: [0, -55, 25, 0],
          y: [0, -45, 45, 0],
          scale: [1, 0.92, 1.15, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Orb 3: Emerald financial-green floating subtle orb */}
      <motion.div
        className="absolute -bottom-[8%] left-[15%] w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] rounded-full blur-[90px] opacity-35 dark:opacity-35"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, rgba(5, 150, 105, 0.25) 45%, rgba(16, 185, 129, 0) 70%)',
          willChange: 'transform',
        }}
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -35, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
};

export default AmbientMeshBackground;

