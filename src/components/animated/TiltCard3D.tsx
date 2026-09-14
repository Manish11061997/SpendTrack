import React, { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

interface TiltCard3DProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max degrees of tilt, default 6
  perspective?: number; // perspective in px, default 1000
  glareEffect?: boolean;
}

export const TiltCard3D: React.FC<TiltCard3DProps> = ({
  children,
  className = '',
  maxTilt = 6,
  perspective = 1000,
  glareEffect = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  // Smooth springs running off-thread without triggering React component re-renders
  const rotateX = useSpring(y, { stiffness: 320, damping: 30, mass: 0.4 });
  const rotateY = useSpring(x, { stiffness: 320, damping: 30, mass: 0.4 });
  const springScale = useSpring(scale, { stiffness: 320, damping: 30, mass: 0.4 });

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const xRatio = (px / rect.width) * 2 - 1;
    const yRatio = (py / rect.height) * 2 - 1;

    x.set(Math.max(-maxTilt, Math.min(maxTilt, xRatio * maxTilt)));
    y.set(Math.max(-maxTilt, Math.min(maxTilt, -yRatio * maxTilt)));
    scale.set(1.012);

    if (glareEffect && glareRef.current) {
      const gx = (px / rect.width) * 100;
      const gy = (py / rect.height) * 100;
      glareRef.current.style.opacity = '0.12';
      glareRef.current.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 65%)`;
    }
  }, [maxTilt, shouldReduceMotion, glareEffect, x, y, scale]);

  const handlePointerLeave = useCallback(() => {
    x.set(0);
    y.set(0);
    scale.set(1);
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  }, [x, y, scale]);

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      style={{ perspective: `${perspective}px` }}
      className="relative w-full"
    >
      <motion.div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        style={{
          rotateX,
          rotateY,
          scale: springScale,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        className={`relative ${className}`}
      >
        {children}

        {/* Dynamic Holographic Glare Reflection Layer */}
        {glareEffect && (
          <div
            ref={glareRef}
            className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 z-30"
            style={{
              opacity: 0,
              mixBlendMode: 'overlay',
            }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TiltCard3D;
