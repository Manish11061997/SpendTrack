import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight, 
  PiggyBank, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { UserAccount } from '../types';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

interface AuthScreenProps {
  onLoginSuccess: (email: string, name: string) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Local helper to fetch all registered users
  const getRegisteredUsers = (): UserAccount[] => {
    const stored = localStorage.getItem('spendtrack_users');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // Local helper to save registered users
  const saveRegisteredUsers = (users: UserAccount[]) => {
    localStorage.setItem('spendtrack_users', JSON.stringify(users));
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Common validations
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      if (isLogin) {
        // --- REAL FIREBASE LOGIN ---
        setSuccess('Signing in...');
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;
        setSuccess(`Welcome back, ${user.displayName || user.email}!`);
        setTimeout(() => {
          onLoginSuccess(user.email!, user.displayName || user.email!);
        }, 800);

      } else {
        // --- REAL FIREBASE SIGNUP ---
        if (!name.trim()) {
          setError('Please enter your full name.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }

        setSuccess('Creating your account...');
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // Set display name on the Firebase user profile
        await updateProfile(user, { displayName: name.trim() });

        // Write user profile to Firestore immediately to avoid "User" fallback race condition
        await setDoc(doc(db, 'users', user.uid), {
          name: name.trim(),
          email: user.email!,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name.trim())}`
        });

        // Send email verification link
        try {
          await sendEmailVerification(user);
        } catch (verificationErr) {
          console.error("Verification email sending failed: ", verificationErr);
        }

        setSuccess('Account created! Verification link sent to your email.');
        setTimeout(() => {
          onLoginSuccess(user.email!, name.trim());
        }, 1200);
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      // Translate Firebase error codes into user-friendly messages
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please try again.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a moment and try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err?.message || 'Authentication failed. Please try again.');
      }
      setSuccess('');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    try {
      if (Capacitor.isNativePlatform()) {
        // Sign out first so Google always shows the account picker
        try { await FirebaseAuthentication.signOut(); } catch (_) {}
        const result = await FirebaseAuthentication.signInWithGoogle({
          customParameters: [{ key: 'prompt', value: 'select_account' }],
        });
        if (result.credential && result.credential.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          const userCredential = await signInWithCredential(auth, credential);
          const user = userCredential.user;
          if (user && user.email) {
            setSuccess(`Successfully signed in as ${user.displayName || 'User'}!`);
            setTimeout(() => {
              onLoginSuccess(user.email!, user.displayName || 'Google User');
            }, 800);
          }
        } else {
          throw new Error("No native credential returned.");
        }
      } else {
        // Web: force account picker via prompt parameter
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        if (user && user.email) {
          setSuccess(`Successfully signed in as ${user.displayName || 'User'}!`);
          setTimeout(() => {
            onLoginSuccess(user.email!, user.displayName || 'Google User');
          }, 800);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to authenticate with Google.');
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-4 selection:bg-primary/20 selection:text-primary">
      {/* Visual background accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-primary/10 text-primary rounded-2xl shadow-xs">
            <PiggyBank className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary font-sans">
            SpendTrack
          </h1>
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
            Smart Expense Tracker & Forecasting Engine
          </p>
        </div>

        {/* Card Container */}
        <motion.div 
          layout
          className="bg-surface-container-low border border-outline-variant/35 rounded-3xl p-6 md:p-8 shadow-xl space-y-6"
        >
          {/* View Toggle */}
          <div className="flex bg-surface-container-high rounded-2xl p-1 relative">
            <button
              id="auth-toggle-login-btn"
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer relative z-10 ${
                isLogin ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Log In
              {isLogin && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-surface-container-lowest border border-outline-variant/35 shadow-xs rounded-xl -z-10" 
                />
              )}
            </button>
            <button
              id="auth-toggle-signup-btn"
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer relative z-10 ${
                !isLogin ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign Up
              {!isLogin && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-surface-container-lowest border border-outline-variant/35 shadow-xs rounded-xl -z-10" 
                />
              )}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            
            {/* Full Name field (Sign Up only) */}
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1.5"
              >
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="signup-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-9 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary transition-all font-sans"
                  />
                </div>
              </motion.div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="auth-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary transition-all font-sans"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary transition-all font-sans font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password field (Sign Up only) */}
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1.5"
              >
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="signup-confirm-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-9 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary transition-all font-sans font-mono"
                  />
                </div>
              </motion.div>
            )}

            {/* Notification and Messages */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-error-container/20 border border-error/20 rounded-xl text-xs text-error flex items-start gap-2 font-semibold"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                <span>{success}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              className="w-full py-3 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Or Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-outline-variant/35" />
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-outline-variant/35" />
          </div>

          {/* Google Sign In Button */}
          <button
            id="auth-google-btn"
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold transition-all border border-outline-variant/45 flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" width="100%" height="100%">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 12-5.38z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

        </motion.div>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-on-surface-variant font-medium max-w-sm mx-auto">
          <div className="p-2 space-y-1">
            <span className="block text-primary font-bold">📂 Isolated Data</span>
            Separate ledgers for every email
          </div>
          <div className="p-2 space-y-1 border-x border-outline-variant/30">
            <span className="block text-primary font-bold">🔮 EOM Forecasts</span>
            Predictive cashflow analysis
          </div>
          <div className="p-2 space-y-1">
            <span className="block text-primary font-bold">💳 Auto-Recurring</span>
            Factored commitments
          </div>
        </div>

      </div>
    </div>
  );
}
