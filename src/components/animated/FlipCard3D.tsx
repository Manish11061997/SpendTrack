import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface FlipCard3DProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  isFlipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
}

export const FlipCard3D: React.FC<FlipCard3DProps> = ({
  front,
  back,
  className = '',
  isFlipped: controlledFlipped,
  onFlipChange,
}) => {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const handleFlip = () => {
    const next = !isFlipped;
    if (onFlipChange) {
      onFlipChange(next);
    } else {
      setInternalFlipped(next);
    }
  };

  if (shouldReduceMotion) {
    return (
      <div className={`relative ${className}`}>
        {isFlipped ? back : front}
      </div>
    );
  }

  return (
    <div
      className={`relative perspective-1000 w-full ${className}`}
      style={{ perspective: 1000 }}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: 0.55,
          ease: [0.16, 1, 0.3, 1] as const, // snappy ease-out
        }}
        style={{
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        className="relative w-full"
      >
        {/* Front Face */}
        <div
          className="w-full backface-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {front}
        </div>

        {/* Back Face */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
};

export default FlipCard3D;
