import React, { useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface TiltCard3DProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // max degrees of tilt, default 7
  perspective?: number; // perspective in px, default 1000
  glareEffect?: boolean;
}

export const TiltCard3D: React.FC<TiltCard3DProps> = ({
  children,
  className = '',
  maxTilt = 7,
  perspective = 1000,
  glareEffect = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number; glareX: number; glareY: number; isInteracting: boolean }>({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    isInteracting: false,
  });

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Relative -1 to 1 from center
    const xRatio = (x / rect.width) * 2 - 1;
    const yRatio = (y / rect.height) * 2 - 1;

    // Clamped tilt
    const rotateY = Math.max(-maxTilt, Math.min(maxTilt, xRatio * maxTilt));
    const rotateX = Math.max(-maxTilt, Math.min(maxTilt, -yRatio * maxTilt));

    // Glare percentage
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({
      rotateX,
      rotateY,
      glareX,
      glareY,
      isInteracting: true,
    });
  }, [maxTilt, shouldReduceMotion]);

  const handlePointerLeave = useCallback(() => {
    setTilt(prev => ({
      ...prev,
      rotateX: 0,
      rotateY: 0,
      isInteracting: false,
    }));
  }, []);

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
        animate={{
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
          scale: tilt.isInteracting ? 1.015 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
          mass: 0.5,
        }}
        style={{
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        className={`relative ${className}`}
      >
        {children}

        {/* Dynamic Holographic Glare Reflection */}
        {glareEffect && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 z-30"
            style={{
              opacity: tilt.isInteracting ? 0.14 : 0,
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 65%)`,
              mixBlendMode: 'overlay',
            }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TiltCard3D;
