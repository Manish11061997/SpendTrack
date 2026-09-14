import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const AmbientMeshBackground: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Theme-Reactive Ambient Glow Orbs */}
      <div className="absolute inset-0 opacity-45 dark:opacity-35 transition-opacity duration-700">
        {/* Orb 1: Primary Brand Ambient Glow */}
        <motion.div
          className="absolute -top-[18%] -left-[12%] w-[65vw] h-[65vw] max-w-[650px] max-h-[650px] rounded-full blur-[100px]"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--primary, #10B981) 40%, transparent) 0%, transparent 70%)',
            willChange: 'transform',
          }}
          animate={{
            scale: [1, 1.04, 1],
            opacity: [0.85, 1, 0.85],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Orb 2: Tertiary / Accent Atmospheric Orb */}
        <motion.div
          className="absolute top-[30%] -right-[18%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full blur-[110px]"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--tertiary, #8B5CF6) 32%, transparent) 0%, transparent 70%)',
            willChange: 'transform',
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.8, 0.95, 0.8],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Orb 3: Secondary / Counter-Glow Orb */}
        <motion.div
          className="absolute -bottom-[15%] left-[25%] w-[55vw] h-[55vw] max-w-[550px] max-h-[550px] rounded-full blur-[95px]"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--secondary, #06B6D4) 28%, transparent) 0%, transparent 70%)',
            willChange: 'transform',
          }}
          animate={{
            scale: [1, 1.04, 1],
            opacity: [0.85, 1, 0.85],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Subtle Cinematic Micro-Grain Texture overlay (eliminates banding & gives tactile finish) */}
      <div 
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.045] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
};

export default AmbientMeshBackground;
