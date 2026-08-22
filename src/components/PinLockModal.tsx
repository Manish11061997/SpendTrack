import React, { useState } from 'react';
import { Lock, Delete, Sparkles, KeyRound } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  correctPin: string;
  onUnlock: () => void;
  onResetPin?: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({ isOpen, correctPin, onUnlock, onResetPin }) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + num;
      setEnteredPin(next);
      setError(false);

      if (next.length === 4) {
        if (next === correctPin) {
          onUnlock();
          setEnteredPin('');
        } else {
          setError(true);
          setTimeout(() => setEnteredPin(''), 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setEnteredPin(enteredPin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d0d15] text-white p-4 animate-in fade-in">
      <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-7 text-center">
        <div className="p-4 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-full animate-bounce">
          <Lock className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white">SpendTrack Protected</h2>
          <p className="text-xs text-gray-400 mt-1">Enter 4-digit PIN to access your finances</p>
        </div>

        {/* PIN Indicators */}
        <div className="flex gap-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                error
                  ? 'border-rose-500 bg-rose-500 animate-shake'
                  : enteredPin.length > idx
                  ? 'border-purple-500 bg-purple-500 scale-110'
                  : 'border-white/20 bg-transparent'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-xs text-rose-400 font-semibold animate-shake">Incorrect PIN. Try again.</p>}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-16 rounded-full bg-white/5 border border-white/10 hover:bg-purple-600/30 active:scale-95 text-xl font-bold text-white flex items-center justify-center transition-all cursor-pointer"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-full bg-white/5 border border-white/10 hover:bg-purple-600/30 active:scale-95 text-xl font-bold text-white flex items-center justify-center transition-all cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-16 rounded-full bg-white/5 border border-white/10 hover:bg-rose-600/30 active:scale-95 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Forgot PIN Recovery Button */}
        {onResetPin && (
          <button
            onClick={onResetPin}
            className="text-xs text-purple-400 hover:text-purple-300 underline font-semibold transition-colors cursor-pointer pt-2"
          >
            Forgot PIN? Reset via Account
          </button>
        )}
      </div>
    </div>
  );
};
