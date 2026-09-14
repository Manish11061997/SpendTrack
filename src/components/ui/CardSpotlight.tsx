import React, { useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface CardSpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  borderSpotlightColor?: string;
  spotlightSize?: number;
  enableTilt?: boolean;
  maxTilt?: number;
  scaleOnHover?: number;
  glareEffect?: boolean;
}

export const CardSpotlight: React.FC<CardSpotlightProps> = ({
  children,
  className = '',
  spotlightColor = 'color-mix(in srgb, var(--primary, #10B981) 12%, transparent)',
  borderSpotlightColor = 'color-mix(in srgb, var(--primary, #10B981) 35%, transparent)',
  spotlightSize = 350,
  enableTilt = false,
  maxTilt = 0,
  scaleOnHover = 1.0,
  glareEffect = true,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState<number>(0);
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number; glareX: number; glareY: number }>({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
  });

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPosition({ x, y });
    setOpacity(1);

    if (enableTilt && !shouldReduceMotion) {
      const xRatio = (x / rect.width) * 2 - 1;
      const yRatio = (y / rect.height) * 2 - 1;
      const rotateY = Math.max(-maxTilt, Math.min(maxTilt, xRatio * maxTilt));
      const rotateX = Math.max(-maxTilt, Math.min(maxTilt, -yRatio * maxTilt));
      setTilt({
        rotateX,
        rotateY,
        glareX: (x / rect.width) * 100,
        glareY: (y / rect.height) * 100,
      });
    }
  }, [enableTilt, maxTilt, shouldReduceMotion]);

  const handlePointerEnter = useCallback(() => {
    setOpacity(1);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setOpacity(0);
    setTilt({
      rotateX: 0,
      rotateY: 0,
      glareX: 50,
      glareY: 50,
    });
  }, []);

  if (shouldReduceMotion || !enableTilt) {
    return (
      <div
        ref={containerRef}
        onMouseMove={(e) => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          setOpacity(1);
        }}
        onMouseEnter={() => setOpacity(1)}
        onMouseLeave={() => setOpacity(0)}
        className={`relative overflow-hidden transition-all duration-300 ${className}`}
        {...props}
      >
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300 -z-10 rounded-[inherit]"
          style={{
            opacity,
            background: `radial-gradient(${spotlightSize}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
          }}
        />
        <div
          className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity,
            background: `radial-gradient(${spotlightSize * 0.75}px circle at ${position.x}px ${position.y}px, ${borderSpotlightColor}, transparent 70%)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1px',
          }}
        />
        {children}
      </div>
    );
  }

  return (
    <div
      style={{ perspective: 1000 }}
      className="relative w-full h-full"
    >
      <motion.div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        animate={{
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
          scale: opacity > 0 ? scaleOnHover : 1,
        }}
        whileTap={{ scale: 0.985 }}
        transition={{
          type: 'spring',
          stiffness: 350,
          damping: 25,
          mass: 0.4,
        }}
        style={{
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        className={`relative overflow-hidden ${className}`}
        {...(props as any)}
      >
        {/* Dynamic Cursor Spotlight Layer */}
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300 -z-10 rounded-[inherit]"
          style={{
            opacity,
            background: `radial-gradient(${spotlightSize}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
          }}
        />

        {/* Dynamic Border Illumination Layer */}
        <div
          className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity,
            background: `radial-gradient(${spotlightSize * 0.75}px circle at ${position.x}px ${position.y}px, ${borderSpotlightColor}, transparent 70%)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1px',
          }}
        />

        {/* Dynamic Holographic Glare Reflection Layer */}
        {glareEffect && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-30 overflow-hidden"
            style={{
              opacity: opacity > 0 ? 0.12 : 0,
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 65%)`,
              mixBlendMode: 'overlay',
            }}
          />
        )}

        {children}
      </motion.div>
    </div>
  );
};

export default CardSpotlight;
