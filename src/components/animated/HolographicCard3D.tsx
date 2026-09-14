import React, { useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface HolographicCard3DProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  perspective?: number;
  showChip?: boolean;
  cardHolder?: string;
  memberSince?: string;
  cardNumber?: string;
}

export const HolographicCard3D: React.FC<HolographicCard3DProps> = ({
  children,
  className = '',
  maxTilt = 8,
  perspective = 1100,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const [tilt, setTilt] = useState<{
    rotateX: number;
    rotateY: number;
    glareX: number;
    glareY: number;
    isInteracting: boolean;
  }>({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    isInteracting: false,
  });

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current || e.pointerType === 'touch') return;
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xRatio = (x / rect.width) * 2 - 1;
    const yRatio = (y / rect.height) * 2 - 1;

    const rotateY = Math.max(-maxTilt, Math.min(maxTilt, xRatio * maxTilt));
    const rotateX = Math.max(-maxTilt, Math.min(maxTilt, -yRatio * maxTilt));

    const glareX = Math.round((x / rect.width) * 100);
    const glareY = Math.round((y / rect.height) * 100);

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

  // Dynamic holographic iridescent angle based on cursor position
  const rainbowAngle = Math.round(115 + (tilt.glareX - 50) * 1.8);

  return (
    <div
      style={{ perspective: `${perspective}px` }}
      className="relative w-full h-full"
    >
      <motion.div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        animate={{
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
          scale: tilt.isInteracting ? 1.018 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 350,
          damping: 26,
          mass: 0.6,
        }}
        style={{
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        className={`relative ${className}`}
      >
        {children}

        {/* 1. Brushed Metal Anisotropic Light Sheen */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 z-30 overflow-hidden"
          style={{
            opacity: tilt.isInteracting ? 0.22 : 0.08,
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.1) 40%, transparent 70%)`,
            mixBlendMode: 'overlay',
          }}
        />

        {/* 2. Prismatic Holographic Rainbow Foil Sweep */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-400 z-30 overflow-hidden"
          style={{
            opacity: tilt.isInteracting ? 0.28 : 0.05,
            background: `linear-gradient(${rainbowAngle}deg, 
              transparent 15%, 
              rgba(56, 189, 248, 0.35) 30%, 
              rgba(168, 85, 247, 0.4) 45%, 
              rgba(236, 72, 153, 0.35) 55%, 
              rgba(16, 185, 129, 0.4) 70%, 
              transparent 85%
            )`,
            mixBlendMode: 'color-dodge',
          }}
        />

        {/* 3. Specular Edge Highlight & Depth Inset */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-30 ring-1 ring-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]"
        />
      </motion.div>
    </div>
  );
};

export default HolographicCard3D;
