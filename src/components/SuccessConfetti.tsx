import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Award } from 'lucide-react';

interface SuccessConfettiProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  amount: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'circle' | 'square' | 'triangle';
}

export default function SuccessConfetti({ isVisible, onClose, title, message, amount }: SuccessConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.width = window.innerWidth;
        height = canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // MD3 Inspired Theme colors
    const colors = [
      '#6750A4', // MD3 Primary
      '#D0BCFF', // MD3 Light Purple
      '#7D5260', // MD3 Tertiary
      '#EFB8C8', // MD3 Light Pink
      '#381E72', // MD3 Dark Purple
      '#4CAF50', // Emerald Green success
      '#2196F3', // Cool Blue
    ];

    const shapes: Array<'circle' | 'square' | 'triangle'> = ['circle', 'square', 'triangle'];
    const particles: Particle[] = [];

    // Initialize 120 explosion particles from bottom-middle / sides
    const createParticle = (x: number, y: number, isLeft: boolean): Particle => {
      const angle = isLeft 
        ? -Math.PI / 4 + (Math.random() * 0.4 - 0.2) // Aim top-right
        : -3 * Math.PI / 4 + (Math.random() * 0.4 - 0.2); // Aim top-left
      const force = 12 + Math.random() * 10;
      
      return {
        x,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      };
    };

    // Spawn burst from left and right corners
    for (let i = 0; i < 60; i++) {
      particles.push(createParticle(0, height - 100, true));
      particles.push(createParticle(width, height - 100, false));
    }

    const gravity = 0.35;
    const drag = 0.985;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        // Physics update
        p.vx *= drag;
        p.vy *= drag;
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        
        // Dissolve slowly once falling
        if (p.vy > 1) {
          p.opacity -= 0.012;
        }

        if (p.opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      if (particles.length > 0) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    // Auto-unmount/close after 4 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div id="confetti-animation-overlay" className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
          {/* Canvas for full-screen confetti physics */}
          <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" />

          {/* Success Dialog Modal - elegant MD3 design */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="pointer-events-auto max-w-sm w-full mx-4 bg-surface-container-high rounded-3xl p-6 border border-outline-variant/30 shadow-2xl flex flex-col items-center text-center space-y-4"
          >
            {/* Elegant outer concentric circle icon wrapper */}
            <div className="relative flex items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary"
              >
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="absolute -inset-1.5 rounded-full border border-primary/20 pointer-events-none"
              />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-on-surface tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed px-2">
                {message}
              </p>
            </div>

            <div className="w-full bg-surface-container-lowest py-2.5 px-4 rounded-2xl border border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-semibold text-on-surface-variant">Remaining Budget Safe</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {amount < 0 ? `-${Math.abs(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}` : `+${amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`}
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-xs hover:bg-primary/95 active:scale-98 transition-all cursor-pointer"
            >
              Excellent
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
