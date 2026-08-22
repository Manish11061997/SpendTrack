import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserProfile, BudgetConfig } from '../types';
import { COLOR_PRESETS, ThemePreset } from '../theme';
import { formatCurrency as formatCustomCurrency, getCurrencySymbol, formatInputAmount, parseRawAmount } from '../utils/currency';
import { 
  Settings, 
  User, 
  Wallet, 
  Database, 
  RefreshCw, 
  Sparkles, 
  Check, 
  LogOut,
  Mail,
  Image as ImageIcon,
  CheckCircle,
  HelpCircle,
  PiggyBank,
  Sun,
  Moon,
  Bell,
  Palette,
  Camera,
  Globe,
  Zap,
  Plus,
  Trash2,
  ChevronDown,
  ShieldCheck,
  FileText,
  ExternalLink,
  Download
} from 'lucide-react';
import { QuickLogTemplate, Transaction } from '../types';
import { LegalModal } from './LegalModal';
import { exportTransactionsToCSV } from '../utils/exportCsv';

interface SettingsTabProps {
  profile: UserProfile;
  budget: BudgetConfig;
  transactions?: Transaction[];
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdateBudget: (budget: BudgetConfig) => void;
  onClearData: () => void;
  darkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
  dailyReminderEnabled: boolean;
  onToggleDailyReminder: (enabled: boolean) => void;
  reminderTime?: string;
  onUpdateReminderTime?: (time: string) => void;
  onTestNotification: () => void;
  onLogout: () => void;
  themePresetId: string;
  onSelectThemePreset: (id: string) => void;
  onOpenCsvImport?: () => void;
  onOpenBadges?: () => void;
}

export default function SettingsTab({
  profile,
  budget,
  transactions = [],
  onUpdateProfile,
  onUpdateBudget,
  onClearData,
  darkMode,
  onToggleDarkMode,
  dailyReminderEnabled,
  onToggleDailyReminder,
  reminderTime = '20:00',
  onUpdateReminderTime,
  onTestNotification,
  onLogout,
  themePresetId,
  onSelectThemePreset,
  onOpenCsvImport,
  onOpenBadges
}: SettingsTabProps) {
  const [profileName, setProfileName] = useState<string>(profile.name);
  const [profileEmail, setProfileEmail] = useState<string>(profile.email);
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatarUrl);
  const [preferredCurrency, setPreferredCurrency] = useState<string>(budget?.currency || 'INR');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const formatTime12h = (t24: string) => {
    const [hStr, mStr] = (t24 || '20:00').split(':');
    let h = parseInt(hStr, 10) || 20;
    const m = parseInt(mStr, 10) || 0;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  const [budgetLimit, setBudgetLimit] = useState<string>((budget?.monthlyLimit ?? '').toString());
  const [foodLimit, setFoodLimit] = useState<string>((budget?.categoryLimits?.['Food'] ?? '').toString());
  const [transportLimit, setTransportLimit] = useState<string>((budget?.categoryLimits?.['Transport'] ?? '').toString());
  const [rentLimit, setRentLimit] = useState<string>((budget?.categoryLimits?.['Rent'] ?? '').toString());
  const [shoppingLimit, setShoppingLimit] = useState<string>((budget?.categoryLimits?.['Shopping'] ?? '').toString());
  const [otherLimit, setOtherLimit] = useState<string>((budget?.categoryLimits?.['Other'] ?? '').toString());
  
  const [profileSaved, setProfileSaved] = useState<boolean>(false);
  const [budgetSaved, setBudgetSaved] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState<boolean>(false);

  const [isProfileEditing, setIsProfileEditing] = useState<boolean>(false);
  const [isBudgetEditing, setIsBudgetEditing] = useState<boolean>(false);
  const [isReminderEditing, setIsReminderEditing] = useState<boolean>(false);
  const [isThemeEditing, setIsThemeEditing] = useState<boolean>(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState<boolean>(false);
  const [isQuickPresetsOpen, setIsQuickPresetsOpen] = useState<boolean>(false);
  const [isLegalOpen, setIsLegalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms' | null>(null);

  const [enableRollover, setEnableRollover] = useState<boolean>(budget?.enableCategoryRollover ?? false);
  const [recurringSalaryTitle, setRecurringSalaryTitle] = useState<string>(budget?.recurringIncome?.title || 'Monthly Salary');
  const [recurringSalaryAmt, setRecurringSalaryAmt] = useState<string>(budget?.recurringIncome?.amount ? budget.recurringIncome.amount.toString() : '');
  const [recurringSalaryDay, setRecurringSalaryDay] = useState<string>(budget?.recurringIncome?.dayOfMonth ? budget.recurringIncome.dayOfMonth.toString() : '1');
  const [recurringSalaryActive, setRecurringSalaryActive] = useState<boolean>(budget?.recurringIncome?.isActive ?? false);

  const [quickTemplates, setQuickTemplates] = useState<QuickLogTemplate[]>(
    budget?.quickTemplates || []
  );
  const [newTplTitle, setNewTplTitle] = useState('');
  const [newTplAmount, setNewTplAmount] = useState('');
  const [newTplCategory, setNewTplCategory] = useState<'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other'>('Food');

  // Synchronize local states with props when props change
  useEffect(() => {
    if (!isProfileEditing) {
      setProfileName(profile.name);
      setProfileEmail(profile.email);
      setAvatarUrl(profile.avatarUrl);
    }
  }, [profile, isProfileEditing]);

  useEffect(() => {
    if (!isBudgetEditing) {
      setBudgetLimit((budget?.monthlyLimit ?? '').toString());
      setFoodLimit((budget?.categoryLimits?.['Food'] ?? '').toString());
      setTransportLimit((budget?.categoryLimits?.['Transport'] ?? '').toString());
      setRentLimit((budget?.categoryLimits?.['Rent'] ?? '').toString());
      setShoppingLimit((budget?.categoryLimits?.['Shopping'] ?? '').toString());
      setOtherLimit((budget?.categoryLimits?.['Other'] ?? '').toString());
      setPreferredCurrency(budget?.currency || 'INR');
      setEnableRollover(budget?.enableCategoryRollover ?? false);
      setRecurringSalaryTitle(budget?.recurringIncome?.title || 'Monthly Salary');
      setRecurringSalaryAmt(budget?.recurringIncome?.amount ? budget.recurringIncome.amount.toString() : '');
      setRecurringSalaryDay(budget?.recurringIncome?.dayOfMonth ? budget.recurringIncome.dayOfMonth.toString() : '1');
      setRecurringSalaryActive(budget?.recurringIncome?.isActive ?? false);
      if (budget?.quickTemplates !== undefined) {
        setQuickTemplates(budget.quickTemplates);
      }
    }
  }, [budget, isBudgetEditing]);

  const handleProfileSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setProfileError(null);
    if (!profileName.trim()) {
      setProfileError('Profile name cannot be empty.');
      return;
    }
    onUpdateProfile({
      name: profileName.trim(),
      email: profileEmail.trim(),
      avatarUrl: avatarUrl.trim()
    });
    setIsProfileEditing(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleBudgetSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    let limitNum = 0;
    if (budgetLimit.trim() !== '') {
      limitNum = parseFloat(parseRawAmount(budgetLimit));
      if (isNaN(limitNum) || limitNum < 0) {
        setBudgetError('Please enter a valid positive budget limit (or leave blank to disable).');
        return;
      }
    }

    const categoryLimits: {[key: string]: number} = {};
    if (foodLimit.trim()) {
      const val = parseFloat(parseRawAmount(foodLimit));
      if (!isNaN(val) && val > 0) categoryLimits['Food'] = val;
    }
    if (transportLimit.trim()) {
      const val = parseFloat(parseRawAmount(transportLimit));
      if (!isNaN(val) && val > 0) categoryLimits['Transport'] = val;
    }
    if (rentLimit.trim()) {
      const val = parseFloat(parseRawAmount(rentLimit));
      if (!isNaN(val) && val > 0) categoryLimits['Rent'] = val;
    }
    if (shoppingLimit.trim()) {
      const val = parseFloat(parseRawAmount(shoppingLimit));
      if (!isNaN(val) && val > 0) categoryLimits['Shopping'] = val;
    }
    if (otherLimit.trim()) {
      const val = parseFloat(parseRawAmount(otherLimit));
      if (!isNaN(val) && val > 0) categoryLimits['Other'] = val;
    }

    onUpdateBudget({
      ...budget,
      monthlyLimit: limitNum,
      currency: preferredCurrency,
      categoryLimits,
      enableCategoryRollover: enableRollover,
      recurringIncome: {
        title: recurringSalaryTitle.trim() || 'Monthly Salary',
        amount: parseFloat(parseRawAmount(recurringSalaryAmt)) || 0,
        dayOfMonth: parseInt(recurringSalaryDay) || 1,
        category: 'Other',
        isActive: recurringSalaryActive
      },
      quickTemplates
    });
    setIsBudgetEditing(false);
    setBudgetSaved(true);
    setTimeout(() => setBudgetSaved(false), 2000);
  };


  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-outfit text-2xl font-black text-on-surface tracking-tight">Settings</h2>
        <p className="text-sm text-on-surface-variant">Configure your budget rules, profile, and account details.</p>
      </div>

      {/* Profile Details Section */}
      <section className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
          <h3 className="font-outfit text-sm font-black text-primary flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Details
          </h3>
          {!isProfileEditing && (
            <button
              id="edit-profile-trigger"
              type="button"
              onClick={() => setIsProfileEditing(true)}
              className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          )}
        </div>
        
        {profileError && (
          <div className="p-3 bg-error/15 border border-error/30 text-error text-xs font-bold rounded-xl animate-fade-in text-left">
            ⚠️ {profileError}
          </div>
        )}

        {!isProfileEditing ? (
          /* View Profile Mode */
          <div className="flex items-center gap-4 py-1">
            <div className="w-14 h-14 rounded-full bg-primary-container overflow-hidden border-2 border-primary shadow-sm flex items-center justify-center shrink-0">
              <img 
                src={profile.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.name || 'User')}`} 
                alt="Avatar preview" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.name || 'User')}`;
                }}
              />
            </div>
            <div className="flex-1 space-y-1 min-w-0">
              <p className="font-bold text-sm text-on-surface truncate">{profile.name || 'Anonymous User'}</p>
              <p className="text-xs text-on-surface-variant font-mono truncate">{profile.email || 'no-email@spendtrack.com'}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {/* Edit Profile Form */}
            <div className="flex items-center gap-4 py-2 border-b border-outline-variant/15">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-full bg-primary-container overflow-hidden border-2 border-primary shadow-sm flex items-center justify-center shrink-0 cursor-pointer relative group"
                title="Click to change profile picture"
              >
                <img 
                  src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.name || 'User')}`} 
                  alt="Avatar preview" 
                  className="w-full h-full object-cover group-hover:opacity-70 transition-opacity"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.name || 'User')}`;
                  }}
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <input 
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarFileChange}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-on-surface truncate">{profileName || 'Anonymous'}</p>
                <p className="text-[10px] text-on-surface-variant font-mono truncate">{profileEmail || 'no-email@spendtrack.com'}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] text-primary font-bold hover:underline mt-1 block"
                >
                  Upload Photo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant block px-0.5" htmlFor="p-name">
                  Full Name
                </label>
                <input 
                  id="p-name"
                  type="text" 
                  value={profileName}
                  onChange={(e) => {
                    setProfileName(e.target.value);
                    setProfileError(null);
                  }}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant block px-0.5" htmlFor="p-email">
                  Email Address
                </label>
                <div className="relative">
                  <input 
                    id="p-email"
                    type="email" 
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-10 pr-4 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  />
                  <Mail className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                id="cancel-profile-edit"
                type="button"
                onClick={() => {
                  setProfileName(profile.name);
                  setProfileEmail(profile.email);
                  setAvatarUrl(profile.avatarUrl);
                  setProfileError(null);
                  setIsProfileEditing(false);
                }}
                className="px-5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-bold text-xs rounded-full transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-profile-settings"
                type="submit"
                onClick={handleProfileSubmit}
                className="px-6 py-2 bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs rounded-full shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {profileSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save Details
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Budget Controls Section */}
      <section className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
          <h3 className="font-outfit text-sm font-black text-primary flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Budget Controls
          </h3>
          {!isBudgetEditing && (
            <button
              id="edit-budget-trigger"
              type="button"
              onClick={() => setIsBudgetEditing(true)}
              className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              Edit Budget
            </button>
          )}
        </div>

        {budgetError && (
          <div className="p-3 bg-error/15 border border-error/30 text-error text-xs font-bold rounded-xl animate-fade-in text-left">
            ⚠️ {budgetError}
          </div>
        )}

        {!isBudgetEditing ? (
          <div className="space-y-4">
            {/* View Budget Mode */}
            <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/25 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-on-surface-variant block">Monthly Target Limit</span>
                <span className="text-lg font-extrabold text-primary block">
                  {budget.monthlyLimit > 0 ? formatCustomCurrency(budget.monthlyLimit, budget.currency || 'INR') : 'No Overall Limit (Optional)'}
                </span>
              </div>
              <div className="px-3.5 py-1.5 bg-primary/5 text-primary text-xs font-bold rounded-lg border border-primary/10">
                Active Cap
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Category Limits Summary</h4>
              {Object.keys(budget.categoryLimits || {}).length === 0 ? (
                <p className="text-xs text-on-surface-variant italic">No category-specific caps configured.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(budget.categoryLimits || {}).map(([category, limit]) => (
                    <span 
                      key={category} 
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-surface-container-lowest rounded-xl text-xs font-bold text-on-surface border border-outline-variant/30 shadow-2xs"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                      <span>{category}:</span>
                      <span className="text-primary font-black">{formatCustomCurrency(limit, budget.currency || 'INR')}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleBudgetSubmit} className="space-y-4 animate-fade-in">
            {/* Preferred Currency Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant block px-0.5">
                Preferred Currency
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                  className="w-full flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-pointer text-left"
                >
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                    <Globe className="w-4 h-4" />
                  </span>
                  <span>
                    {preferredCurrency === 'INR' && 'INR (₹) - Indian Rupee'}
                    {preferredCurrency === 'USD' && 'USD ($) - US Dollar'}
                    {preferredCurrency === 'EUR' && 'EUR (€) - Euro'}
                    {preferredCurrency === 'GBP' && 'GBP (£) - British Pound'}
                    {preferredCurrency === 'AED' && 'AED (AED) - UAE Dirham'}
                  </span>
                  <span className={`text-[10px] text-on-surface-variant transition-transform duration-200 ${isCurrencyOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {isCurrencyOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsCurrencyOpen(false)}></div>
                    <div className="absolute left-0 right-0 mt-1 bg-surface-container-high border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto">
                      {[
                        { value: 'INR', label: 'INR (₹) - Indian Rupee' },
                        { value: 'USD', label: 'USD ($) - US Dollar' },
                        { value: 'EUR', label: 'EUR (€) - Euro' },
                        { value: 'GBP', label: 'GBP (£) - British Pound' },
                        { value: 'AED', label: 'AED (AED) - UAE Dirham' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setPreferredCurrency(opt.value);
                            setBudgetError(null);
                            setIsCurrencyOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                            preferredCurrency === opt.value
                              ? 'bg-primary text-on-primary'
                              : 'text-on-surface hover:bg-surface-variant/40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant block px-0.5" htmlFor="b-limit">
                Default Monthly Budget ({getCurrencySymbol(preferredCurrency).trim()})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-primary">{getCurrencySymbol(preferredCurrency)}</span>
                <input 
                  id="b-limit"
                  type="text" 
                  inputMode="decimal"
                  value={formatInputAmount(budgetLimit, preferredCurrency)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '');
                    setBudgetLimit(raw);
                    setBudgetError(null);
                  }}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              {budgetLimit && !isNaN(parseFloat(parseRawAmount(budgetLimit))) && (
                <div className="text-[10px] text-on-surface-variant font-mono pl-1 font-semibold">
                  Preview: {formatCustomCurrency(parseFloat(parseRawAmount(budgetLimit)), preferredCurrency)}
                </div>
              )}
              <p className="text-[10px] text-on-surface-variant leading-tight">
                Sets the universal baseline target threshold displayed on Dashboard metrics and progress gauges.
              </p>
            </div>

            {/* Category-Specific Budget Limits */}
            <div className="border-t border-outline-variant/15 pt-3.5 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wide">Category Budget Limits</h4>
                <p className="text-[10px] text-on-surface-variant leading-tight">
                  Define optional individual limits for separate ledger bounds. Leave empty to ignore category limits.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Food Limit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block px-0.5" htmlFor="food-limit-input">
                    Food Limit ({getCurrencySymbol(preferredCurrency).trim()})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">{getCurrencySymbol(preferredCurrency)}</span>
                    <input 
                      id="food-limit-input"
                      type="text" 
                      inputMode="decimal"
                      value={formatInputAmount(foodLimit, preferredCurrency)}
                      onChange={(e) => setFoodLimit(e.target.value.replace(/,/g, ''))}
                      placeholder="None"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-7 pr-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  {foodLimit && !isNaN(parseFloat(parseRawAmount(foodLimit))) && (
                    <div className="text-[9px] text-on-surface-variant font-mono pl-1 font-semibold">
                      {formatCustomCurrency(parseFloat(parseRawAmount(foodLimit)), preferredCurrency)}
                    </div>
                  )}
                </div>

                {/* Transport Limit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block px-0.5" htmlFor="transport-limit-input">
                    Transport Limit ({getCurrencySymbol(preferredCurrency).trim()})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">{getCurrencySymbol(preferredCurrency)}</span>
                    <input 
                      id="transport-limit-input"
                      type="text" 
                      inputMode="decimal"
                      value={formatInputAmount(transportLimit, preferredCurrency)}
                      onChange={(e) => setTransportLimit(e.target.value.replace(/,/g, ''))}
                      placeholder="None"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-7 pr-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  {transportLimit && !isNaN(parseFloat(parseRawAmount(transportLimit))) && (
                    <div className="text-[9px] text-on-surface-variant font-mono pl-1 font-semibold">
                      {formatCustomCurrency(parseFloat(parseRawAmount(transportLimit)), preferredCurrency)}
                    </div>
                  )}
                </div>

                {/* Rent Limit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block px-0.5" htmlFor="rent-limit-input">
                    Rent Budget Limit ({getCurrencySymbol(preferredCurrency).trim()})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">{getCurrencySymbol(preferredCurrency)}</span>
                    <input 
                      id="rent-limit-input"
                      type="text" 
                      inputMode="decimal"
                      value={formatInputAmount(rentLimit, preferredCurrency)}
                      onChange={(e) => setRentLimit(e.target.value.replace(/,/g, ''))}
                      placeholder="None"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-7 pr-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  {rentLimit && !isNaN(parseFloat(parseRawAmount(rentLimit))) && (
                    <div className="text-[9px] text-on-surface-variant font-mono pl-1 font-semibold">
                      {formatCustomCurrency(parseFloat(parseRawAmount(rentLimit)), preferredCurrency)}
                    </div>
                  )}
                </div>

                {/* Shopping Limit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block px-0.5" htmlFor="shopping-limit-input">
                    Shopping Limit ({getCurrencySymbol(preferredCurrency).trim()})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">{getCurrencySymbol(preferredCurrency)}</span>
                    <input 
                      id="shopping-limit-input"
                      type="text" 
                      inputMode="decimal"
                      value={formatInputAmount(shoppingLimit, preferredCurrency)}
                      onChange={(e) => setShoppingLimit(e.target.value.replace(/,/g, ''))}
                      placeholder="None"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-7 pr-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  {shoppingLimit && !isNaN(parseFloat(parseRawAmount(shoppingLimit))) && (
                    <div className="text-[9px] text-on-surface-variant font-mono pl-1 font-semibold">
                      {formatCustomCurrency(parseFloat(parseRawAmount(shoppingLimit)), preferredCurrency)}
                    </div>
                  )}
                </div>

                {/* Other Limit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block px-0.5" htmlFor="other-limit-input">
                    Other Limit ({getCurrencySymbol(preferredCurrency).trim()})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">{getCurrencySymbol(preferredCurrency)}</span>
                    <input 
                      id="other-limit-input"
                      type="text" 
                      inputMode="decimal"
                      value={formatInputAmount(otherLimit, preferredCurrency)}
                      onChange={(e) => setOtherLimit(e.target.value.replace(/,/g, ''))}
                      placeholder="None"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-7 pr-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  {otherLimit && !isNaN(parseFloat(parseRawAmount(otherLimit))) && (
                    <div className="text-[9px] text-on-surface-variant font-mono pl-1 font-semibold">
                      {formatCustomCurrency(parseFloat(parseRawAmount(otherLimit)), preferredCurrency)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Category Rollover & Recurring Income Options */}
            <div className="pt-4 border-t border-outline-variant/15 space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Category Budget Rollover</h4>
                  <p className="text-[10px] text-on-surface-variant">Automatically roll over unspent category budget into the next month.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableRollover}
                    onChange={(e) => setEnableRollover(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="p-3.5 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">Recurring Salary / Auto-Income</h4>
                    <p className="text-[10px] text-on-surface-variant">Automatically log your salary credit on a specific day of the month.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recurringSalaryActive}
                      onChange={(e) => setRecurringSalaryActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {recurringSalaryActive && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase">Title</label>
                      <input
                        type="text"
                        value={recurringSalaryTitle}
                        onChange={(e) => setRecurringSalaryTitle(e.target.value)}
                        placeholder="Monthly Salary"
                        className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase">Monthly Amount</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={recurringSalaryAmt}
                        onChange={(e) => setRecurringSalaryAmt(e.target.value.replace(/,/g, ''))}
                        placeholder="e.g. 75000"
                        className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase">Day of Month</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={recurringSalaryDay}
                        onChange={(e) => setRecurringSalaryDay(e.target.value)}
                        className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                id="cancel-budget-edit"
                type="button"
                onClick={() => {
                  setBudgetLimit((budget?.monthlyLimit ?? '').toString());
                  setFoodLimit((budget?.categoryLimits?.['Food'] ?? '').toString());
                  setTransportLimit((budget?.categoryLimits?.['Transport'] ?? '').toString());
                  setRentLimit((budget?.categoryLimits?.['Rent'] ?? '').toString());
                  setShoppingLimit((budget?.categoryLimits?.['Shopping'] ?? '').toString());
                  setOtherLimit((budget?.categoryLimits?.['Other'] ?? '').toString());
                  setBudgetError(null);
                  setIsBudgetEditing(false);
                }}
                className="px-5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-bold text-xs rounded-full transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-budget-settings"
                type="submit"
                onClick={handleBudgetSubmit}
                className="px-6 py-2 bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs rounded-full shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {budgetSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save Limits
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Data & Power Tools Section */}
      <section className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-on-surface font-sans">Data & Power Tools</h3>
            <p className="text-[11px] font-semibold text-on-surface-variant">Import bank statements & view achievement milestones.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Export CSV */}
          <button
            type="button"
            onClick={() => exportTransactionsToCSV(transactions)}
            className="flex items-center justify-between p-3.5 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 rounded-2xl transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <Download className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="block font-bold text-xs text-on-surface">Export Data (CSV)</span>
                <span className="block text-[10px] text-on-surface-variant">Download Excel / CSV spreadsheet</span>
              </div>
            </div>
            <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">↓</span>
          </button>

          {/* CSV Import */}
          <button
            type="button"
            onClick={onOpenCsvImport}
            className="flex items-center justify-between p-3.5 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 rounded-2xl transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="block font-bold text-xs text-on-surface">Import Bank CSV</span>
                <span className="block text-[10px] text-on-surface-variant">HDFC, SBI, ICICI, Mint</span>
              </div>
            </div>
            <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">→</span>
          </button>

          {/* Achievement Badges */}
          <button
            type="button"
            onClick={onOpenBadges}
            className="flex items-center justify-between p-3.5 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 rounded-2xl transition-all text-left cursor-pointer group sm:col-span-2"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="block font-bold text-xs text-on-surface">Financial Badges</span>
                <span className="block text-[10px] text-on-surface-variant">View unlocked milestones</span>
              </div>
            </div>
            <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        </div>
      </section>

      {/* Collapsible Standalone Quick Presets Manager Section */}
      <section className="bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm transition-all duration-300">
        <button
          type="button"
          onClick={() => setIsQuickPresetsOpen(!isQuickPresetsOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-surface-container-high/40 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-outfit text-sm font-black text-on-surface flex items-center gap-2">
                1-Tap Quick Presets Manager
                <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full font-mono">
                  {quickTemplates.length} Presets
                </span>
              </h3>
              <p className="text-[11px] text-on-surface-variant font-medium">Configure your favorite 1-tap expense shortcuts for instant logging</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary hidden sm:inline">
              {isQuickPresetsOpen ? 'Collapse' : 'Expand'}
            </span>
            <div className={`p-1.5 rounded-full bg-surface-container-high text-on-surface-variant transition-transform duration-200 ${isQuickPresetsOpen ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Collapsible Content */}
        {isQuickPresetsOpen && (
          <div className="p-5 pt-0 border-t border-outline-variant/10 space-y-4 animate-in fade-in slide-in-from-top-2">
            {/* Existing Presets List */}
            {quickTemplates.length === 0 ? (
              <div className="text-center py-6 text-xs text-on-surface-variant italic bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/30">
                No quick presets created yet. Add one below!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {quickTemplates.map((tpl) => (
                  <div key={tpl.id} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20 hover:border-outline-variant/40 transition-colors">
                    <div className="overflow-hidden pr-2">
                      <span className="text-xs font-bold text-on-surface truncate block">{tpl.title}</span>
                      <span className="text-[11px] font-extrabold text-primary">{formatCustomCurrency(tpl.amount, preferredCurrency)} • {tpl.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = quickTemplates.filter(t => t.id !== tpl.id);
                        setQuickTemplates(updated);
                        onUpdateBudget({ ...budget, quickTemplates: updated });
                      }}
                      className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Remove Preset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Preset Form */}
            <div className="pt-3 border-t border-outline-variant/15 space-y-2">
              <h4 className="text-xs font-bold text-primary flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add New Quick Preset
              </h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Preset Name (e.g. Evening Chai)"
                  value={newTplTitle}
                  onChange={(e) => setNewTplTitle(e.target.value)}
                  className="flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs text-on-surface focus:border-primary outline-none"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount (e.g. 20)"
                  value={newTplAmount}
                  onChange={(e) => setNewTplAmount(e.target.value.replace(/,/g, ''))}
                  className="w-full sm:w-28 bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs text-on-surface focus:border-primary outline-none"
                />
                <select
                  value={newTplCategory}
                  onChange={(e) => setNewTplCategory(e.target.value as any)}
                  className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
                >
                  <option value="Food">Food ☕</option>
                  <option value="Transport">Transport 🚕</option>
                  <option value="Shopping">Shopping 🛍️</option>
                  <option value="Rent">Rent 🏠</option>
                  <option value="Other">Other ⚡</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!newTplTitle.trim()) return;
                    const amt = parseFloat(parseRawAmount(newTplAmount));
                    if (isNaN(amt) || amt <= 0) return;
                    const newPreset: QuickLogTemplate = {
                      id: `tpl-${Date.now()}`,
                      title: newTplTitle.trim(),
                      amount: amt,
                      category: newTplCategory
                    };
                    const updated = [...quickTemplates, newPreset];
                    setQuickTemplates(updated);
                    onUpdateBudget({ ...budget, quickTemplates: updated });
                    setNewTplTitle('');
                    setNewTplAmount('');
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Save Preset
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Appearance Section */}
      <section className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
          <h3 className="font-outfit text-sm font-black text-primary flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Theme & Appearance
          </h3>
          {!isThemeEditing && (
            <button
              id="edit-theme-trigger"
              type="button"
              onClick={() => setIsThemeEditing(true)}
              className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5" />
              Edit Theme
            </button>
          )}
        </div>

        {!isThemeEditing ? (
          /* View Theme Mode */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/25">
              <span 
                className="w-6 h-6 rounded-full border border-black/10 shrink-0" 
                style={{ backgroundColor: COLOR_PRESETS.find(p => p.id === themePresetId)?.colorHex || '#1A2F4C' }}
              />
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Active Palette</span>
                <span className="text-xs font-bold text-on-surface">{COLOR_PRESETS.find(p => p.id === themePresetId)?.name || 'Oxford Navy'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/25">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {darkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Visual Mode</span>
                <span className="text-xs font-bold text-on-surface">{darkMode ? 'Dark Mode Active' : 'Light Mode Active'}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Theme Mode */
          <div className="space-y-4">
            <div className="space-y-2 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/25">
              <h4 className="font-bold text-xs text-on-surface">Classical Color Scheme</h4>
              <p className="text-[11px] text-on-surface-variant leading-tight">
                Select a refined historical brand color palette. Accents and dashboard visuals will adjust dynamically.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = preset.id === themePresetId;
                  
                  return (
                    <button
                      key={preset.id}
                      id={`theme-preset-${preset.id}`}
                      type="button"
                      onClick={() => onSelectThemePreset(preset.id)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs' 
                          : 'border-outline-variant/30 hover:border-outline-variant hover:bg-surface-container-high'
                      }`}
                    >
                      <span 
                        className="w-5 h-5 rounded-full border border-black/10 shrink-0" 
                        style={{ backgroundColor: preset.colorHex }}
                      />
                      <span className="text-xs font-bold text-on-surface truncate">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/25">
              <div className="space-y-1 pr-4">
                <h4 className="font-bold text-sm text-on-surface">Dark Mode Theme</h4>
                <p className="text-xs text-on-surface-variant leading-tight">
                  Toggle deep obsidian contrast backgrounds for low-light tracking environments.
                </p>
              </div>
              
              <button
                id="theme-dark-mode-toggle"
                onClick={() => onToggleDarkMode(!darkMode)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-1 focus:ring-primary/40 ${
                  darkMode ? 'bg-primary' : 'bg-outline-variant'
                }`}
                aria-label="Toggle Dark Mode"
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-surface-container-lowest shadow-md transition duration-200 ease-in-out flex items-center justify-center ${
                    darkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {darkMode ? (
                    <Moon className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-secondary" />
                  )}
                </span>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                id="close-theme-edit"
                type="button"
                onClick={() => setIsThemeEditing(false)}
                className="px-5 py-2 bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs rounded-full shadow transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Daily Reminders Section */}
      <section className="bg-surface-container/40 dark:bg-surface-container/20 rounded-3xl p-5 sm:p-6 border border-outline-variant/30 backdrop-blur-md shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Daily Reminders & Alerts
          </h3>
          {!isReminderEditing && (
            <button
              id="edit-reminder-trigger"
              type="button"
              onClick={() => setIsReminderEditing(true)}
              className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              Edit Reminders
            </button>
          )}
        </div>

        {!isReminderEditing ? (
          /* View Reminder Mode */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/25">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Reminder Status</span>
                <span className="text-xs font-bold text-on-surface">
                  {dailyReminderEnabled ? `Enabled (${formatTime12h(reminderTime)} alert)` : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/25">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">System Status</span>
                <span className="text-xs font-bold text-on-surface">
                  {typeof window !== 'undefined' && 'Notification' in window ? (
                    Notification.permission === 'granted' ? 'Permission Granted' : Notification.permission === 'denied' ? 'Permission Denied' : 'Default'
                  ) : 'Unsupported'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Reminder Mode */
          <div className="space-y-4">
            {/* Main Switch Row */}
            <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/25">
              <div className="space-y-1 pr-4">
                <h4 className="font-bold text-sm text-on-surface">Enable Daily Alert Reminder</h4>
                <p className="text-xs text-on-surface-variant leading-tight">
                  Receive local push alerts at {formatTime12h(reminderTime)} if no daily ledger logs have been registered.
                </p>
              </div>

              <button
                id="toggle-daily-reminders"
                onClick={() => onToggleDailyReminder(!dailyReminderEnabled)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-1 focus:ring-primary/40 ${
                  dailyReminderEnabled ? 'bg-primary' : 'bg-outline-variant'
                }`}
                aria-label="Toggle Daily Reminders"
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-surface-container-lowest shadow-md transition duration-200 ease-in-out flex items-center justify-center ${
                    dailyReminderEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  <Bell className={`w-3.5 h-3.5 ${dailyReminderEnabled ? 'text-primary' : 'text-on-surface-variant'}`} />
                </span>
              </button>
            </div>

            {/* Scheduled Time Selector */}
            {dailyReminderEnabled && (
              <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/25">
                <div className="space-y-0.5 pr-4">
                  <h4 className="font-bold text-sm text-on-surface">Reminder Scheduled Time</h4>
                  <p className="text-xs text-on-surface-variant leading-tight">
                    Daily notification will trigger at this time if no expenses are logged.
                  </p>
                </div>
                <input
                  id="reminder-time-picker"
                  type="time"
                  value={reminderTime || '20:00'}
                  onChange={(e) => onUpdateReminderTime?.(e.target.value)}
                  className="px-3 py-2 bg-surface-container/60 border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                />
              </div>
            )}

            {/* Permission details */}
            {dailyReminderEnabled && (
              <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/25 space-y-3.5">
                <div className="flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-on-surface block text-sm">System Permission Status</span>
                    <span className="text-xs text-on-surface-variant leading-tight block mt-1">
                      {typeof window !== 'undefined' && 'Notification' in window ? (
                        Notification.permission === 'granted' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">● Active (Permission Granted)</span>
                        ) : Notification.permission === 'denied' ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">● Blocked (Permission Denied)</span>
                        ) : (
                          <span className="text-primary font-semibold">● Requesting Setup (Click Allow)</span>
                        )
                      ) : (
                        <span className="text-amber-600 font-semibold">● System Push Unsupported</span>
                      )}
                    </span>
                  </div>

                  {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
                    <button
                      id="request-notification-permission-btn"
                      onClick={() => {
                        Notification.requestPermission().then(() => {
                          onToggleDailyReminder(dailyReminderEnabled);
                        });
                      }}
                      className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Grant Access
                    </button>
                  )}
                </div>

                {/* Simulation/Test Section */}
                <div className="border-t border-outline-variant/20 pt-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-xs text-on-surface">Test Push Dispatcher</h5>
                    <p className="text-[10px] text-on-surface-variant leading-tight">
                      Trigger an immediate test push to verify alert configurations.
                    </p>
                  </div>
                  <button
                    id="simulate-daily-reminder-btn"
                    onClick={onTestNotification}
                    className="px-4 py-2 bg-secondary-container hover:bg-secondary-container/90 text-on-secondary-container font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Simulate
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                id="close-reminder-edit"
                type="button"
                onClick={() => setIsReminderEditing(false)}
                className="px-5 py-2 bg-primary hover:bg-primary/95 text-on-primary font-bold text-xs rounded-full shadow transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Legal & Privacy Section */}
      <section className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 space-y-4 shadow-sm">
        <button
          onClick={() => setIsLegalOpen(!isLegalOpen)}
          className="w-full flex items-center justify-between text-left cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-outfit text-sm font-black text-on-surface">Legal & Privacy</h3>
              <p className="text-[11px] text-on-surface-variant">Terms of Service, Privacy Policy & Disclaimers</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${isLegalOpen ? 'rotate-180 text-primary' : ''}`} />
        </button>

        {isLegalOpen && (
          <div className="pt-3 border-t border-outline-variant/20 space-y-2 animate-fade-in">
            <button
              onClick={() => setLegalModalTab('privacy')}
              className="w-full p-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high border border-outline-variant/30 flex items-center justify-between text-xs font-bold text-on-surface cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Privacy Policy</span>
              </div>
              <ChevronDown className="w-4 h-4 -rotate-90 text-on-surface-variant" />
            </button>

            <button
              onClick={() => setLegalModalTab('terms')}
              className="w-full p-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high border border-outline-variant/30 flex items-center justify-between text-xs font-bold text-on-surface cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-secondary" />
                <span>Terms & Conditions</span>
              </div>
              <ChevronDown className="w-4 h-4 -rotate-90 text-on-surface-variant" />
            </button>
          </div>
        )}
      </section>

      {/* Render Legal Modal if open */}
      {legalModalTab && (
        <LegalModal
          initialTab={legalModalTab}
          onClose={() => setLegalModalTab(null)}
        />
      )}

      {/* Data Administration */}
      <section className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 space-y-4 shadow-sm">
        <h3 className="font-outfit text-sm font-black text-error flex items-center gap-2">
          <Database className="w-5 h-5 text-error" />
          Data Administration
        </h3>

        <div className="space-y-4">
          <div className="p-4 bg-error/5 rounded-xl border border-error/10 flex items-start gap-3">
            <Database className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-error">Wipe Database</h4>
              <p className="text-xs text-on-surface-variant leading-normal">
                Delete all custom and demonstration transactions to start with a fresh, empty ledger.
              </p>
              {confirmWipe ? (
                <div className="mt-3 flex flex-col gap-2 max-w-sm p-3 bg-error/10 rounded-xl border border-error/20 animate-fade-in">
                  <span className="text-[10px] font-bold text-error uppercase tracking-wider">Are you sure? This cannot be undone.</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onClearData();
                        setConfirmWipe(false);
                      }}
                      className="px-4 py-1.5 bg-error text-white hover:bg-error/90 rounded-full text-xs font-black cursor-pointer transition-colors shadow-sm"
                    >
                      Yes, Wipe
                    </button>
                    <button
                      onClick={() => setConfirmWipe(false)}
                      className="px-3.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-full text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  id="clear-all-data"
                  onClick={() => setConfirmWipe(true)}
                  className="mt-3 px-4 py-2 bg-error text-white hover:bg-error/95 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Database className="w-4 h-4" />
                  Wipe Database
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Account Session (Moved to the very bottom) */}
      <section className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 space-y-4 shadow-sm">
        <h3 className="font-outfit text-sm font-black text-error flex items-center gap-2">
          <LogOut className="w-5 h-5 text-error" />
          Account Session
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/25 gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-on-surface">Logged in as {profile.name}</h4>
            <p className="text-xs text-on-surface-variant font-mono">{profile.email}</p>
          </div>
          <button
            id="settings-logout-btn"
            onClick={onLogout}
            className="px-5 py-2.5 bg-error text-on-error font-bold text-xs rounded-xl hover:bg-error/95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </section>

    </div>
  );
}
