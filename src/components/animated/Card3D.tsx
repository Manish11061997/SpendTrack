import React, { useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  depth?: number; // max tilt degrees (default: 8)
  scaleOnHover?: number; // scale on hover/touch (default: 1.02)
  glare?: boolean; // show holographic sheen (default: true)
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = '',
  depth = 8,
  scaleOnHover = 1.02,
  glare = true,
  onClick,
  style = {},
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const [tilt, setTilt] = useState<{
    rotateX: number;
    rotateY: number;
    glareX: number;
    glareY: number;
    isActive: boolean;
  }>({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
    isActive: false,
  });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (shouldReduceMotion || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const xRatio = (x / rect.width) * 2 - 1;
      const yRatio = (y / rect.height) * 2 - 1;

      const rotateY = Math.max(-depth, Math.min(depth, xRatio * depth));
      const rotateX = Math.max(-depth, Math.min(depth, -yRatio * depth));

      setTilt({
        rotateX,
        rotateY,
        glareX: (x / rect.width) * 100,
        glareY: (y / rect.height) * 100,
        isActive: true,
      });
    },
    [depth, shouldReduceMotion]
  );

  const handlePointerLeave = useCallback(() => {
    setTilt(prev => ({
      ...prev,
      rotateX: 0,
      rotateY: 0,
      isActive: false,
    }));
  }, []);

  if (shouldReduceMotion) {
    return (
      <div onClick={onClick} className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div
      style={{ perspective: 1000 }}
      className="relative w-full"
    >
      <motion.div
        ref={cardRef}
        onClick={onClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        animate={{
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
          scale: tilt.isActive ? scaleOnHover : 1,
        }}
        whileTap={{ scale: 0.98 }}
        transition={{
          type: 'spring',
          stiffness: 380,
          damping: 24,
          mass: 0.4,
        }}
        style={{
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          ...style,
        }}
        className={`relative ${className}`}
      >
        {children}

        {glare && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 z-30 overflow-hidden"
            style={{
              opacity: tilt.isActive ? 0.16 : 0,
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 65%)`,
              mixBlendMode: 'overlay',
            }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default Card3D;
