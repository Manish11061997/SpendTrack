import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserProfile, BudgetConfig } from '../types';
import { COLOR_PRESETS, ThemePreset } from '../theme';
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
  Palette
} from 'lucide-react';

interface SettingsTabProps {
  profile: UserProfile;
  budget: BudgetConfig;
  onUpdateProfile: (profile: UserProfile) => void;
  onUpdateBudget: (budget: BudgetConfig) => void;
  onClearData: () => void;
  darkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
  dailyReminderEnabled: boolean;
  onToggleDailyReminder: (enabled: boolean) => void;
  onTestNotification: () => void;
  onLogout: () => void;
  themePresetId: string;
  onSelectThemePreset: (id: string) => void;
}

export default function SettingsTab({
  profile,
  budget,
  onUpdateProfile,
  onUpdateBudget,
  onClearData,
  darkMode,
  onToggleDarkMode,
  dailyReminderEnabled,
  onToggleDailyReminder,
  onTestNotification,
  onLogout,
  themePresetId,
  onSelectThemePreset
}: SettingsTabProps) {
  const [profileName, setProfileName] = useState<string>(profile.name);
  const [profileEmail, setProfileEmail] = useState<string>(profile.email);
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatarUrl);
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
  const [isThemeEditing, setIsThemeEditing] = useState<boolean>(false);
  const [isReminderEditing, setIsReminderEditing] = useState<boolean>(false);

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
      limitNum = parseFloat(budgetLimit);
      if (isNaN(limitNum) || limitNum < 0) {
        setBudgetError('Please enter a valid positive budget limit (or leave blank to disable).');
        return;
      }
    }

    const categoryLimits: {[key: string]: number} = {};
    if (foodLimit.trim()) {
      const val = parseFloat(foodLimit);
      if (!isNaN(val) && val > 0) categoryLimits['Food'] = val;
    }
    if (transportLimit.trim()) {
      const val = parseFloat(transportLimit);
      if (!isNaN(val) && val > 0) categoryLimits['Transport'] = val;
    }
    if (rentLimit.trim()) {
      const val = parseFloat(rentLimit);
      if (!isNaN(val) && val > 0) categoryLimits['Rent'] = val;
    }
    if (shoppingLimit.trim()) {
      const val = parseFloat(shoppingLimit);
      if (!isNaN(val) && val > 0) categoryLimits['Shopping'] = val;
    }
    if (otherLimit.trim()) {
      const val = parseFloat(otherLimit);
      if (!isNaN(val) && val > 0) categoryLimits['Other'] = val;
    }

    onUpdateBudget({
      monthlyLimit: limitNum,
      categoryLimits
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
        <p className="text-sm text-on-surface-variant">Configure your budget rules, profile, and sandbox data.</p>
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
                src={profile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop'} 
                alt="Avatar preview" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop';
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
              <div className="w-12 h-12 rounded-full bg-primary-container overflow-hidden border border-primary shadow-sm flex items-center justify-center shrink-0">
                <img 
                  src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop'} 
                  alt="Avatar preview" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-on-surface truncate">{profileName || 'Anonymous'}</p>
                <p className="text-[10px] text-on-surface-variant font-mono truncate">{profileEmail || 'no-email@spendtrack.com'}</p>
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
                  {budget.monthlyLimit > 0 ? `₹${budget.monthlyLimit.toLocaleString('en-IN')}` : 'No Overall Limit (Optional)'}
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
                      <span className="text-primary font-black">₹{limit.toLocaleString('en-IN')}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleBudgetSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant block px-0.5" htmlFor="b-limit">
                Default Monthly Budget (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-primary">₹</span>
                <input 
                  id="b-limit"
                  type="number" 
                  step="any"
                  value={budgetLimit}
                  onChange={(e) => {
                    setBudgetLimit(e.target.value);
                    setBudgetError(null);
                  }}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-on-surface-variant leading-tight">
                Sets the universal baseline target threshold displayed on Dashboard metrics and progress gauges.
              </p>
            </div>

            {/* Category-Specific Budget Limits */}
            <div className="border-t border-outline-variant/15 pt-3.5 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wide">Category Budget Caps</h4>
                <p className="text-[10px] text-on-surface-variant leading-tight">
                  Define optional individual limits for separate ledger bounds. Leave empty to ignore category limits.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Food Limit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block px-0.5" htmlFor="food-limit-input">
                    Food Cap (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">₹</span>
                    <input 
                      id="food-limit-input"
                      type="number" 
                      value={foodLimit}
                      onChange={(e) => setFoodLimit(e.target.value)}
                      placeholder="None"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-7 pr-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Transport Limit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block px-0.5" htmlFor="transport-limit-input">
                    Transport Cap (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">₹</span>
                    <input 
                      id="transport-limit-input"
                      type="number" 
                      value={transportLimit}
                      onChange={(e) => setTransportLimit(e.target.value)}
                      placeholder="None"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-7 pr-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Rent Limit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block px-0.5" htmlFor="rent-limit-input">
                    Rent Cap (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">₹</span>
                    <input 
                      id="rent-limit-input"
                      type="number" 
                      value={rentLimit}
                      onChange={(e) => setRentLimit(e.target.value)}
                      placeholder="None"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-7 pr-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Shopping Limit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block px-0.5" htmlFor="shopping-limit-input">
                    Shopping Cap (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">₹</span>
                    <input 
                      id="shopping-limit-input"
                      type="number" 
                      value={shoppingLimit}
                      onChange={(e) => setShoppingLimit(e.target.value)}
                      placeholder="None"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-7 pr-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Other Limit */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block px-0.5" htmlFor="other-limit-input">
                    Other Cap (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">₹</span>
                    <input 
                      id="other-limit-input"
                      type="number" 
                      value={otherLimit}
                      onChange={(e) => setOtherLimit(e.target.value)}
                      placeholder="None"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-7 pr-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
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
      <section className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
          <h3 className="font-outfit text-sm font-black text-primary flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Reminder Notifications
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
                <span className="text-xs font-bold text-on-surface">{dailyReminderEnabled ? 'Enabled (8:00 PM alert)' : 'Disabled'}</span>
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
                  Receive local push alerts at 8:00 PM if no daily ledger logs have been registered.
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

      {/* Sandbox & Data Administration */}
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
