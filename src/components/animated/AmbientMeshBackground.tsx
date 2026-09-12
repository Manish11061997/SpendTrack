import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const AmbientMeshBackground: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-30">
      {/* Orb 1: Primary Cyan/Blue floating gradient orb */}
      <motion.div
        className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] max-w-[500px] max-h-[500px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.45) 0%, rgba(37, 99, 235, 0) 70%)',
          willChange: 'transform',
        }}
        animate={{
          x: [0, 40, -30, 0],
          y: [0, 50, 20, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Orb 2: Violet/Purple accent floating orb */}
      <motion.div
        className="absolute top-[35%] -right-[15%] w-[60vw] h-[60vw] max-w-[550px] max-h-[550px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.35) 0%, rgba(124, 58, 237, 0) 70%)',
          willChange: 'transform',
        }}
        animate={{
          x: [0, -50, 20, 0],
          y: [0, -40, 40, 0],
          scale: [1, 0.92, 1.12, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Orb 3: Emerald financial-green floating subtle orb */}
      <motion.div
        className="absolute -bottom-[10%] left-[20%] w-[50vw] h-[50vw] max-w-[450px] max-h-[450px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0) 70%)',
          willChange: 'transform',
        }}
        animate={{
          x: [0, 35, -25, 0],
          y: [0, -30, 25, 0],
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
