import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Shield, Cpu, CreditCard } from 'lucide-react';
import { ThreeDCardCanvas } from './animated/ThreeDCardCanvas';
import { BorderBeam } from './ui/BorderBeam';

interface ThreeDCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  currencySymbol: string;
  cardHolder?: string;
}

export const ThreeDCardModal: React.FC<ThreeDCardModalProps> = ({
  isOpen,
  onClose,
  balance,
  currencySymbol,
  cardHolder = 'Alexander Chen',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-all"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="relative w-full max-w-2xl bg-surface-container-low/95 dark:bg-[#0B0F17]/95 backdrop-blur-2xl border border-outline-variant/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden z-10 space-y-6"
          >
            <BorderBeam size={280} duration={14} colorFrom="var(--primary)" colorTo="var(--secondary)" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-outfit text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
                    <span>SpendTrack Titanium 3D Studio</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-black">
                      WebGL
                    </span>
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Interactive physical 3D card • Drag in any direction to rotate 360°
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-surface-variant/40 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3D Canvas Viewport */}
            <div className="w-full bg-surface-container-lowest/60 dark:bg-black/50 border border-outline-variant/20 rounded-2xl p-4 flex flex-col items-center justify-center">
              <ThreeDCardCanvas
                balance={balance.toLocaleString()}
                currencySymbol={currencySymbol}
                cardHolder={cardHolder}
              />
            </div>

            {/* Features Info Pills */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-surface-container-lowest/40 border border-outline-variant/20 space-y-1">
                <div className="flex items-center justify-center text-primary">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-on-surface">Smart EMV Chip</div>
                <div className="text-[10px] text-on-surface-variant">Real-time ledger encryption</div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-lowest/40 border border-outline-variant/20 space-y-1">
                <div className="flex items-center justify-center text-primary">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-on-surface">Zero Liability</div>
                <div className="text-[10px] text-on-surface-variant">Dynamic offline CVV security</div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-lowest/40 border border-outline-variant/20 space-y-1">
                <div className="flex items-center justify-center text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-on-surface">Titanium Alloy</div>
                <div className="text-[10px] text-on-surface-variant">Laser-engraved physical profile</div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ThreeDCardModal;
