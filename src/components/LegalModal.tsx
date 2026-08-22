import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, FileText, X, ExternalLink, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface LegalModalProps {
  initialTab?: 'privacy' | 'terms';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ initialTab = 'privacy', onClose }) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-surface-container-high border border-outline-variant/40 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-lowest/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              {activeTab === 'privacy' ? <ShieldCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-outfit font-black text-lg text-on-surface leading-tight">
                {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
              </h2>
              <p className="text-[11px] text-on-surface-variant">SpendTrack Data Protection & User Agreement</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 cursor-pointer transition-colors"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-2 bg-surface-container-low border-b border-outline-variant/20 flex gap-2 shrink-0 px-4">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-variant/30'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'terms'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-variant/30'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms & Conditions</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-on-surface-variant leading-relaxed font-sans flex-1">
          {activeTab === 'privacy' ? (
            <>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-2.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[11px]">100% Encrypted & Local First</p>
                  <p className="text-[10px] opacity-90">Your transaction data is encrypted in Firestore (`users/{'{uid}'}`) and local SMS/receipt scanning never leaves your device.</p>
                </div>
              </div>

              <section className="space-y-1.5">
                <h3 className="font-bold text-sm text-on-surface">1. Information We Collect</h3>
                <p>SpendTrack collects account information (Name, Email, Google Auth Profile) and user-logged financial records (amounts, categories, subscription rules, budget targets) strictly to render personalized financial insights.</p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-sm text-on-surface">2. On-Device SMS & Receipt Processing</h3>
                <p>Features such as Bank SMS Parsing and OCR Receipt Scanner process text and camera captures directly on your local device. We do not store or transmit raw SMS text messages or receipt images to external third-party servers.</p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-sm text-on-surface">3. Cloud Firestore Storage</h3>
                <p>Your ledger records are secured with Firebase Cloud Firestore security rules. Access is restricted exclusively to your authenticated account credentials.</p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-sm text-on-surface">4. Your Ownership & Right to Erase</h3>
                <p>You maintain full ownership of your data. You may export your ledger to PDF reports or wipe all data and delete your account at any time via Settings.</p>
              </section>
            </>
          ) : (
            <>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-2.5 text-indigo-600 dark:text-indigo-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[11px]">Personal Tracking Utility Disclaimer</p>
                  <p className="text-[10px] opacity-90">SpendTrack is designed for personal expense organization and does not replace certified financial, tax, or banking services.</p>
                </div>
              </div>

              <section className="space-y-1.5">
                <h3 className="font-bold text-sm text-on-surface">1. Acceptance of Terms</h3>
                <p>By logging in or using SpendTrack, you agree to these Terms & Conditions. If you do not agree to these terms, please discontinue use of the app.</p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-sm text-on-surface">2. Financial Disclaimer</h3>
                <p>Projections, forecasts, and health scores generated within SpendTrack are automated estimates and do not constitute certified financial or investment advice.</p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-sm text-on-surface">3. SMS & OCR Parsing Verification</h3>
                <p>Automated text parsing features are provided for convenience. Users should review parsed amounts and categories before confirming transactions.</p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-sm text-on-surface">4. Account Security</h3>
                <p>You are responsible for safeguarding your login credentials and PIN lock configuration. SpendTrack is not responsible for unauthorized device access.</p>
              </section>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-outline-variant/20 bg-surface-container-lowest/60 flex items-center justify-between shrink-0">
          <a 
            href={activeTab === 'privacy' ? '/privacy.html' : '/terms.html'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Public Page</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </div>
  );
};
