import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RollingNumberProps {
  value: number;
  duration?: number; // ms, default 800
  prefix?: string;
  suffix?: string;
  className?: string;
  locale?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

interface DigitColumnProps {
  digit: number;
  duration: number;
  shouldReduceMotion: boolean | null;
}

const DigitColumn: React.FC<DigitColumnProps> = ({ digit, duration, shouldReduceMotion }) => {
  return (
    <span
      className="inline-block relative overflow-hidden"
      style={{
        height: '1.15em',
        verticalAlign: 'baseline',
        lineHeight: 1.15,
      }}
    >
      <motion.span
        className="flex flex-col select-none"
        initial={false}
        animate={{
          y: shouldReduceMotion ? `-${digit * 10}%` : `-${digit * 10}%`,
        }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                duration: duration / 1000,
                ease: [0.16, 1, 0.3, 1] as const, // snappy cubic ease-out
              }
        }
        style={{ willChange: 'transform' }}
      >
        {DIGITS.map((d) => (
          <span
            key={d}
            className="flex items-center justify-center"
            style={{ height: '1.15em', lineHeight: 1.15 }}
          >
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
};

export const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  duration = 800,
  prefix = '',
  suffix = '',
  className = '',
  locale = 'en-IN',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format the absolute value with thousands/lakhs separators
  const absVal = Math.abs(Math.round(value));
  const isNegative = value < 0;
  const formattedString = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(absVal);

  const characters = formattedString.split('');

  return (
    <span
      className={`inline-flex items-baseline font-mono tracking-tight ${className}`}
      aria-label={`${isNegative ? '-' : ''}${prefix}${formattedString}${suffix}`}
    >
      {isNegative && <span className="mr-0.5">-</span>}
      {prefix && <span className="mr-0.5 select-none">{prefix}</span>}
      {characters.map((char, index) => {
        const isDigit = !isNaN(parseInt(char, 10));
        if (isDigit) {
          const num = parseInt(char, 10);
          return (
            <DigitColumn
              key={`digit-${index}-${characters.length}`}
              digit={mounted ? num : 0}
              duration={duration}
              shouldReduceMotion={shouldReduceMotion}
            />
          );
        }
        return (
          <span key={`char-${index}`} className="select-none px-px">
            {char}
          </span>
        );
      })}
      {suffix && <span className="ml-0.5 select-none">{suffix}</span>}
    </span>
  );
};

export default RollingNumber;
