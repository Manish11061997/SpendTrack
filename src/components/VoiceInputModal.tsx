import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Sparkles, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { parseVoiceTranscript, ParsedVoiceCommand } from '../utils/voiceParser';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { getLocalDateString, getLocalTimeString } from '../utils/dateUtils';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  currency?: string;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  currency = 'INR'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedVoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Speech Recognition support in browser/mobile
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
      if (currentTranscript.trim()) {
        const cmd = parseVoiceTranscript(currentTranscript);
        setParsed(cmd);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please tap the microphone and try again.');
      } else {
        setError('Speech recognition failed. Try speaking clearly into your phone mic.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && isSupported) {
      startListening();
    } else if (!isOpen) {
      stopListening();
      setTranscript('');
      setParsed(null);
      setError(null);
    }
  }, [isOpen]);

  const startListening = () => {
    setError(null);
    setTranscript('');
    setParsed(null);

    if (!recognitionRef.current) {
      setError('Voice recognition is not supported on this browser.');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      // If already started, try stopping then starting
      try {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current?.start(), 150);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  const handleConfirm = () => {
    if (!parsed || parsed.amount <= 0) return;

    onAddTransaction({
      title: parsed.title,
      amount: parsed.type === 'expense' ? -Math.abs(parsed.amount) : Math.abs(parsed.amount),
      category: parsed.category,
      date: getLocalDateString(),
      time: getLocalTimeString(),
      label: parsed.type === 'income' ? 'Freelance' : 'Personal',
      notes: `Voice logged: "${parsed.rawTranscript}"`
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-3xl shadow-2xl p-6 space-y-6 z-10 text-center"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="space-y-1 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-extrabold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Voice Assistant</span>
          </div>
          <h2 className="text-xl font-black text-on-surface">Speak your Expense or Income</h2>
          <p className="text-xs text-on-surface-variant">
            Say something like: <strong className="text-on-surface font-mono">"Spent 250 on lunch"</strong> or <strong className="text-on-surface font-mono">"Paid 500 for taxi"</strong>
          </p>
        </div>

        {/* Animated Mic Listening Zone */}
        <div className="py-4 flex flex-col items-center justify-center">
          <div className="relative">
            {/* Glowing Pulse Rings when listening */}
            {isListening && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-error/30 -m-3"
                />
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.6, delay: 0.3, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-error/20 -m-6"
                />
              </>
            )}

            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer relative z-10 ${
                isListening
                  ? 'bg-error text-on-error shadow-error/30'
                  : 'bg-primary text-on-primary shadow-primary/30 hover:scale-105'
              }`}
            >
              {isListening ? (
                <Mic className="w-9 h-9 animate-bounce" />
              ) : (
                <MicOff className="w-9 h-9 opacity-90" />
              )}
            </button>
          </div>

          <p className="mt-3 text-xs font-extrabold text-on-surface">
            {isListening ? (
              <span className="text-error animate-pulse">● Listening... Speak now</span>
            ) : (
              <span className="text-on-surface-variant">Tap mic to start speaking</span>
            )}
          </p>
        </div>

        {/* Live Transcript / Result Display */}
        {transcript && (
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-2 text-left animate-fade-in">
            <span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Heard Speech:</span>
            <p className="text-xs italic text-on-surface font-serif">"{transcript}"</p>
          </div>
        )}

        {/* Parsed Fields Preview */}
        {parsed && parsed.amount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-primary/10 border border-primary/20 rounded-2xl space-y-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase">{parsed.type === 'expense' ? 'Expense Detected' : 'Income Detected'}</span>
              <span className="text-xs font-extrabold text-primary bg-primary/15 px-2.5 py-0.5 rounded-full">
                {parsed.category}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-sm font-extrabold text-on-surface">{parsed.title}</span>
              <span className={`text-base font-black ${parsed.type === 'expense' ? 'text-error' : 'text-emerald-500'}`}>
                {parsed.type === 'expense' ? '-' : '+'}{formatCurrency(parsed.amount, currency)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-xs text-error font-semibold flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={startListening}
            className="flex-1 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!parsed || parsed.amount <= 0}
            className="flex-1 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-md hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>Log Transaction</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
