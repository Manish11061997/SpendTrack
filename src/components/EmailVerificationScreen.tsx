import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, CheckCircle, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { sendEmailVerification, signOut } from 'firebase/auth';

interface EmailVerificationScreenProps {
  onVerified: () => void;
  onLogout: () => void;
}

export default function EmailVerificationScreen({ onVerified, onLogout }: EmailVerificationScreenProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);
  const user = auth.currentUser;

  // Poll for verification status every 5 seconds as a convenience
  useEffect(() => {
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          clearInterval(interval);
          onVerified();
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [onVerified]);

  const handleCheckVerification = async () => {
    if (!user) return;
    setIsChecking(true);
    setMessage(null);
    try {
      await user.reload();
      if (user.emailVerified) {
        setMessage({ text: 'Email successfully verified! Redirecting...', type: 'success' });
        setTimeout(() => {
          onVerified();
        }, 1200);
      } else {
        setMessage({ text: 'Email is not verified yet. Please check your inbox (and spam folder) for the verification link.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to check verification status.', type: 'error' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (!user) return;
    setIsResending(true);
    setMessage(null);
    try {
      await sendEmailVerification(user);
      setMessage({ text: 'Verification link resent successfully! Please check your email.', type: 'success' });
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setMessage({ text: 'Too many requests. Please wait a few moments before trying again.', type: 'error' });
      } else {
        setMessage({ text: err.message || 'Failed to resend email.', type: 'error' });
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4 selection:bg-primary/20 selection:text-primary">
      {/* Background accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-surface-container-low border border-outline-variant/35 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 text-center z-10"
      >
        <div className="inline-flex p-4 bg-primary/10 text-primary rounded-full relative">
          <Mail className="w-10 h-10 animate-pulse" />
          <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-surface-container-low" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-primary">Verify your email</h2>
          <p className="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
            We sent a verification link to <span className="font-semibold text-on-surface break-all">{user?.email}</span>. Please verify your email to access the SpendTrack dashboard.
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl border text-xs text-left flex items-start gap-2.5 animate-fade-in ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-error/10 border-error/30 text-error'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleCheckVerification}
            disabled={isChecking}
            className="w-full py-3.5 px-4 bg-primary text-on-primary font-bold rounded-2xl shadow-md hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isChecking ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>I have verified my email</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleResendEmail}
            disabled={isResending}
            className="w-full py-3 px-4 bg-surface-container-high border border-outline-variant/30 text-on-surface font-semibold rounded-2xl hover:bg-surface-container-highest transition-colors active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isResending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>Resend Verification Email</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3 px-4 bg-transparent text-on-surface-variant hover:text-on-surface font-medium rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
