import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Sparkles } from 'lucide-react';

interface SuccessConfettiProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  amount: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string; size: number;
  rotation: number; rotationSpeed: number;
  opacity: number; shape: 'circle' | 'square' | 'triangle';
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

    // Use CSS variable resolved values for confetti
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue('--primary').trim() || '#2563EB';
    const colors = [primaryColor, '#93C5FD', '#BFDBFE', '#CBD5E1', '#94A3B8', '#10B981', '#FCD34D'];

    const shapes: Array<'circle' | 'square' | 'triangle'> = ['circle', 'square', 'triangle'];
    const particles: Particle[] = [];

    const createParticle = (x: number, y: number, isLeft: boolean): Particle => {
      const angle = isLeft
        ? -Math.PI / 4 + (Math.random() * 0.4 - 0.2)
        : -3 * Math.PI / 4 + (Math.random() * 0.4 - 0.2);
      const force = 12 + Math.random() * 10;
      return {
        x, y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      };
    };

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
        p.vx *= drag; p.vy *= drag;
        p.vy += gravity;
        p.x += p.vx; p.y += p.vy;
        p.rotation += p.rotationSpeed;
        if (p.vy > 1) p.opacity -= 0.012;
        if (p.opacity <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.shape === 'circle') {
          ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
        } else if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      if (particles.length > 0) animationFrameId = requestAnimationFrame(render);
    };

    render();
    const timer = setTimeout(() => onClose(), 5000);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [isVisible, onClose]);

  const isExpense = amount < 0;
  const formattedAmount = Math.abs(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  return (
    <AnimatePresence>
      {isVisible && (
        <div id="confetti-animation-overlay" className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop — same blur pattern used in app headers */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/25 backdrop-blur-sm pointer-events-none"
          />

          {/* Confetti canvas */}
          <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" />

          {/* Card — same rounded-2xl + shadow pattern as app cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 14 }}
            transition={{ type: 'spring', damping: 22, stiffness: 360 }}
            className="pointer-events-auto relative w-[272px] overflow-hidden rounded-2xl shadow-2xl border border-outline-variant/30"
          >
            {/* Header — exactly matches the decorative card in AddTransactionForm */}
            <div className={`relative overflow-hidden flex flex-col items-center justify-center pt-7 pb-5 px-5 ${
              isExpense
                ? 'bg-gradient-to-br from-primary to-primary-container'
                : 'bg-gradient-to-br from-emerald-600 to-emerald-400 dark:from-emerald-500 dark:to-emerald-700'
            }`}>
              {/* Glow orbs — same as AddTransactionForm decorative card */}
              <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-20 h-20 bg-secondary-container/20 rounded-full blur-xl pointer-events-none" />

              {/* Animated checkmark — white/10 bg same as AddTransactionForm icon wrappers */}
              <div className="relative mb-3 z-10">
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full border-2 border-white/30"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 16, stiffness: 300, delay: 0.06 }}
                  className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner"
                >
                  <Check className="w-7 h-7 text-white stroke-[2.5]" />
                </motion.div>
              </div>

              <motion.h3
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="font-outfit font-black text-[15px] text-white tracking-tight text-center leading-tight z-10"
              >
                {title}
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[11px] text-white/75 mt-1 text-center leading-snug px-2 z-10"
              >
                {message}
              </motion.p>
            </div>

            {/* Body — uses exact same tokens as rest of the app */}
            <div className="bg-surface px-4 pt-4 pb-5 flex flex-col gap-3">

              {/* Amount row — same style as surface-container rows in app */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span className="text-[11px] font-semibold text-on-surface-variant">
                    {isExpense ? 'Expense saved' : 'Income recorded'}
                  </span>
                </div>
                <span className={`text-sm font-black font-mono ${
                  isExpense ? 'text-on-surface' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {isExpense ? `−${formattedAmount}` : `+${formattedAmount}`}
                </span>
              </motion.div>

              {/* Button — exact same class as Save button in AddTransactionForm */}
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                onClick={onClose}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-on-primary bg-primary hover:bg-primary/95 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Excellent
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
