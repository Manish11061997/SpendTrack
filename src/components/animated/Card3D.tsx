import React, { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  depth?: number; // max tilt degrees (default: 6)
  scaleOnHover?: number; // scale on hover/touch (default: 1.015)
  glare?: boolean; // show holographic sheen (default: true)
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = '',
  depth = 6,
  scaleOnHover = 1.015,
  glare = true,
  onClick,
  style = {},
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  // Smooth springs running off-thread without triggering React component re-renders
  const rotateX = useSpring(y, { stiffness: 350, damping: 28, mass: 0.4 });
  const rotateY = useSpring(x, { stiffness: 350, damping: 28, mass: 0.4 });
  const springScale = useSpring(scale, { stiffness: 350, damping: 28, mass: 0.4 });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (shouldReduceMotion || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const xRatio = (px / rect.width) * 2 - 1;
      const yRatio = (py / rect.height) * 2 - 1;

      x.set(Math.max(-depth, Math.min(depth, xRatio * depth)));
      y.set(Math.max(-depth, Math.min(depth, -yRatio * depth)));
      scale.set(scaleOnHover);

      if (glare && glareRef.current) {
        const gx = (px / rect.width) * 100;
        const gy = (py / rect.height) * 100;
        glareRef.current.style.opacity = '0.12';
        glareRef.current.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 65%)`;
      }
    },
    [depth, scaleOnHover, shouldReduceMotion, glare, x, y, scale]
  );

  const handlePointerLeave = useCallback(() => {
    x.set(0);
    y.set(0);
    scale.set(1);
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  }, [x, y, scale]);

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
        style={{
          rotateX,
          rotateY,
          scale: springScale,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          ...style,
        }}
        whileTap={{ scale: 0.985 }}
        className={`relative ${className}`}
      >
        {children}

        {/* Dynamic Holographic Glare Layer */}
        {glare && (
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

export default Card3D;
