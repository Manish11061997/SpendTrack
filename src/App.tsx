import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  TrendingUp, 
  Settings as SettingsIcon, 
  Menu, 
  Bell, 
  X, 
  Plus, 
  Search, 
  Info, 
  PiggyBank, 
  Sparkles,
  ArrowRight,
  TrendingDown,
  Trash2,
  Calendar,
  LogOut,
  ChevronDown,
  Sliders,
  Palette,
  Sun,
  Moon,
  RefreshCw,
  AlertCircle,
  Smartphone,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';
import { Transaction, UserProfile, BudgetConfig, Subscription } from './types';
import { COLOR_PRESETS } from './theme';
import { 
  INITIAL_TRANSACTIONS, 
  DEFAULT_PROFILE, 
  DEFAULT_BUDGET 
} from './initialData';
import { formatCurrency, isSubscriptionDoubleCounted } from './utils/currency';

// Modular Tab Views
import DashboardTab from './components/DashboardTab';
import HistoryTab from './components/HistoryTab';
import InsightsTab from './components/InsightsTab';
import SettingsTab from './components/SettingsTab';
import AddTransactionForm from './components/AddTransactionForm';
import SuccessConfetti from './components/SuccessConfetti';
import AuthScreen from './components/AuthScreen';
import ExportPDFButton from './components/ExportPDFButton';
import EmailVerificationScreen from './components/EmailVerificationScreen';
import { AiCoachWidget } from './components/AiCoachWidget';
import { PinLockModal } from './components/PinLockModal';
import { INITIAL_ACHIEVEMENT_BADGES, evaluateBadges, calculateBudgetRollover } from './utils/budgetRollover';
import { fetchLiveExchangeRates } from './utils/currencyConverter';
import { checkAlertRulesOnSave } from './utils/alertRulesEngine';

import { VoiceInputModal } from './components/VoiceInputModal';

// Modals (Static imports to ensure zero dynamic chunk loading failures on Android)
import { CalendarViewModal } from './components/CalendarViewModal';
import { PdfExportModal } from './components/PdfExportModal';
import { AlertRulesModal } from './components/AlertRulesModal';
import { CsvImportModal } from './components/CsvImportModal';
import { AchievementBadgesModal } from './components/AchievementBadgesModal';

// Firebase Imports
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, collection, setDoc, getDoc, deleteDoc, updateDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';

// Capacitor & Native Plugins
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';

type TabType = 'dashboard' | 'history' | 'insights' | 'settings';

const TAB_ORDER: TabType[] = ['dashboard', 'history', 'insights', 'settings'];

// Instant opacity-only swap — no layout-shifting slide animation
// This ensures navigation feels immediate, not sluggish
const slideVariants = {
  enter: (_dir: number) => ({
    opacity: 0,
  }),
  center: {
    opacity: 1,
  },
  exit: (_dir: number) => ({
    opacity: 0,
  })
};

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  // Seed currentUser from localStorage so there's ZERO login flash on refresh.
  // Firebase onAuthStateChanged will validate / clear this on first callback.
  const [currentUser, setCurrentUser] = useState<string | null>(() =>
    localStorage.getItem('spendtrack_active_user_uid')
  );
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState<boolean>(true);

  // ── User Data (all loaded from Firestore, never from localStorage) ────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Seed profile from cache so avatar/name renders instantly on reload.
  const [profile, setProfile]           = useState<UserProfile>(() => {
    try {
      const cached = localStorage.getItem('spendtrack_cached_profile');
      if (cached) return JSON.parse(cached) as UserProfile;
    } catch (_) {}
    return DEFAULT_PROFILE;
  });
  const [budget, setBudget]             = useState<BudgetConfig>(DEFAULT_BUDGET);
  
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    if (stored) {
      return stored === 'dark';
    }
    return document.documentElement.classList.contains('dark');
  });

  const [themePresetId, setThemePresetId] = useState<string>(() => {
    return localStorage.getItem('spendtrack_theme_preset') || 'navy';
  });

  // Commercial Feature States
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('spendtrack_privacy_mode') === 'true';
  });

  const [pinConfig, setPinConfig] = useState<{ isEnabled: boolean; pin: string }>(() => {
    const saved = localStorage.getItem('spendtrack_pin_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { isEnabled: false, pin: '' };
  });

  const [isPinUnlocked, setIsPinUnlocked] = useState<boolean>(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [isAlertRulesOpen, setIsAlertRulesOpen] = useState<boolean>(false);
  const [isPdfExportOpen, setIsPdfExportOpen] = useState<boolean>(false);

  const [sliderLimit, setSliderLimit] = useState<number>(0);
  const budgetUpdateTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (budget && budget.monthlyLimit !== undefined) {
      setSliderLimit(budget.monthlyLimit);
    }
  }, [budget?.monthlyLimit]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const preset = COLOR_PRESETS.find(p => p.id === themePresetId) || COLOR_PRESETS[0];
    const modeColors = darkMode ? preset.dark : preset.light;
    
    // Set all relevant CSS variables dynamically on documentElement
    document.documentElement.style.setProperty('--primary', modeColors.primary);
    document.documentElement.style.setProperty('--secondary', modeColors.secondary);
    document.documentElement.style.setProperty('--tertiary', modeColors.tertiary);
    document.documentElement.style.setProperty('--primary-container', modeColors.primaryContainer);
    document.documentElement.style.setProperty('--on-primary-container', modeColors.onPrimaryContainer);
    document.documentElement.style.setProperty('--secondary-container', modeColors.secondaryContainer);
    document.documentElement.style.setProperty('--on-secondary-container', modeColors.onSecondaryContainer);
    
    // Core Layout Variables
    document.documentElement.style.setProperty('--background', modeColors.background);
    document.documentElement.style.setProperty('--surface', modeColors.surface);
    document.documentElement.style.setProperty('--surface-container-lowest', modeColors.surfaceContainerLowest);
    document.documentElement.style.setProperty('--surface-container-low', modeColors.surfaceContainerLow);
    document.documentElement.style.setProperty('--surface-container', modeColors.surfaceContainer);
    document.documentElement.style.setProperty('--surface-container-high', modeColors.surfaceContainerHigh);
    document.documentElement.style.setProperty('--surface-container-highest', modeColors.surfaceContainerHighest);
    document.documentElement.style.setProperty('--outline-variant', modeColors.outlineVariant);

    localStorage.setItem('spendtrack_theme_preset', themePresetId);
  }, [themePresetId, darkMode]);

  // Success animation overlay state
  const [successAnimation, setSuccessAnimation] = useState<{
    isVisible: boolean;
    title: string;
    message: string;
    amount: number;
  } | null>(null);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [savingsGoals, setSavingsGoals]   = useState<any[]>([]);

  // ── Real-time Firestore listeners ────────────────────────────────────────
  // onAuthStateChanged sets up onSnapshot listeners for all user collections.
  // Firestore is the SINGLE SOURCE OF TRUTH. No localStorage for user data.
  useEffect(() => {
    let unsubTxs: (() => void) | null = null;
    let unsubSubs: (() => void) | null = null;
    let unsubGoals: (() => void) | null = null;
    let unsubProfile: (() => void) | null = null;
    let unsubBudget: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[DEBUG] onAuthStateChanged triggered. User:", firebaseUser ? firebaseUser.uid : "Logged Out");
      
      // Tear down any previous listeners before setting up new ones
      unsubTxs?.(); unsubSubs?.(); unsubGoals?.(); unsubProfile?.(); unsubBudget?.();
      unsubTxs = null; unsubSubs = null; unsubGoals = null; unsubProfile = null; unsubBudget = null;

      if (firebaseUser) {
        const uid = firebaseUser.uid;
        localStorage.setItem('spendtrack_active_user_uid', uid);
        setCurrentUser(uid);
        setEmailVerified(firebaseUser.emailVerified);

        // --- Background non-blocking check to ensure user profile & budget exist ---
        (async () => {
          try {
            const profileRef = doc(db, 'users', uid);
            const profileSnap = await getDoc(profileRef);
            const existingData = profileSnap.exists() ? (profileSnap.data() as UserProfile) : null;
            const isSarahJenkins = existingData && (existingData.name === 'Sarah Jenkins' || existingData.email === 'sarah.j@example.com');

            if (!existingData || !existingData.name || !existingData.email || isSarahJenkins) {
              const newProfile: UserProfile = {
                name: (isSarahJenkins ? '' : existingData?.name) || firebaseUser.displayName || 'User',
                email: (isSarahJenkins ? '' : existingData?.email) || firebaseUser.email || '',
                avatarUrl: firebaseUser.photoURL || existingData?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(firebaseUser.email || 'user')}`
              };
              await setDoc(profileRef, newProfile, { merge: true });
            } else if (firebaseUser.photoURL && firebaseUser.photoURL !== existingData?.avatarUrl) {
              await setDoc(profileRef, { avatarUrl: firebaseUser.photoURL }, { merge: true });
            }

            const budgetRef = doc(db, 'users', uid, 'config', 'budget');
            const budgetSnap = await getDoc(budgetRef);
            if (!budgetSnap.exists()) {
              await setDoc(budgetRef, DEFAULT_BUDGET);
            }
          } catch (err) {
            console.error("Async document check error:", err);
          }
        })();

        // --- Real-time listener: Profile ---
        unsubProfile = onSnapshot(doc(db, 'users', uid), (snap) => {
          if (snap.exists()) {
            const profileData = snap.data() as UserProfile;
            setProfile(profileData);
            try { localStorage.setItem('spendtrack_cached_profile', JSON.stringify(profileData)); } catch (_) {}
          }
        }, (err) => console.error('Profile listener error:', err));

        // --- Real-time listener: Budget ---
        unsubBudget = onSnapshot(doc(db, 'users', uid, 'config', 'budget'), (snap) => {
          if (snap.exists()) {
            const data = snap.data() || {};
            const sanitizedCategoryLimits: Record<string, number> = {};
            if (data.categoryLimits) {
              Object.entries(data.categoryLimits).forEach(([cat, val]) => {
                sanitizedCategoryLimits[cat] = typeof val === 'string' ? parseFloat(val) : (val as number || 0);
              });
            }
            setBudget({
              ...data,
              monthlyLimit: typeof data.monthlyLimit === 'string' ? parseFloat(data.monthlyLimit) : (data.monthlyLimit || 0),
              categoryLimits: sanitizedCategoryLimits,
              currency: data.currency || 'INR'
            } as BudgetConfig);
          }
        }, (err) => console.error('Budget listener error:', err));

        // --- Real-time listener: Transactions ---
        unsubTxs = onSnapshot(collection(db, 'users', uid, 'transactions'), (snap) => {
          const list: Transaction[] = [];
          snap.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
              ...data,
              amount: typeof data.amount === 'string' ? parseFloat(data.amount) : (data.amount || 0)
            } as Transaction);
          });
          list.sort((a, b) => {
            const dateA = (a && a.date ? String(a.date) : '');
            const dateB = (b && b.date ? String(b.date) : '');
            return dateB.localeCompare(dateA);
          });
          setTransactions(list);
        }, (err) => console.error('Transactions listener error:', err));

        // --- Real-time listener: Subscriptions ---
        unsubSubs = onSnapshot(collection(db, 'users', uid, 'subscriptions'), (snap) => {
          const list: Subscription[] = [];
          snap.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
              ...data,
              amount: typeof data.amount === 'string' ? parseFloat(data.amount) : (data.amount || 0)
            } as Subscription);
          });
          setSubscriptions(list);
        }, (err) => console.error('Subscriptions listener error:', err));

        // --- Real-time listener: Savings Goals ---
        unsubGoals = onSnapshot(collection(db, 'users', uid, 'savingsGoals'), (snap) => {
          const list: any[] = [];
          snap.forEach(d => {
            const data = d.data();
            list.push({
              id: d.id,
              ...data,
              targetAmount: typeof data.targetAmount === 'string' ? parseFloat(data.targetAmount) : (data.targetAmount || 0),
              currentAmount: typeof data.currentAmount === 'string' ? parseFloat(data.currentAmount) : (data.currentAmount || 0)
            });
          });
          setSavingsGoals(list);
        }, (err) => console.error('Goals listener error:', err));

      } else {
        localStorage.removeItem('spendtrack_active_user_uid');
        localStorage.removeItem('spendtrack_cached_profile');
        setCurrentUser(null);
        setEmailVerified(true);
        const storedGuestTxs = localStorage.getItem('spendtrack_guest_transactions');
        if (storedGuestTxs) {
          try { setTransactions(JSON.parse(storedGuestTxs)); } catch (e) {}
        } else {
          setTransactions([]);
        }
        const storedGuestBudget = localStorage.getItem('spendtrack_guest_budget');
        if (storedGuestBudget) {
          try { setBudget(JSON.parse(storedGuestBudget)); } catch (e) {}
        } else {
          setBudget(DEFAULT_BUDGET);
        }
        setSubscriptions([]);
        setSavingsGoals([]);
      }

      setIsAuthLoading(false);
    });

    return () => {
      unsubAuth();
      unsubTxs?.(); unsubSubs?.(); unsubGoals?.(); unsubProfile?.(); unsubBudget?.();
    };
  }, []);


  const handleSaveSubscription = async (newSubData: Omit<Subscription, 'id'>) => {
    const subId = Math.random().toString(36).substring(2, 11);
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser, 'subscriptions', subId), newSubData);
      } catch (err: any) {
        console.error('Firestore subscription save error:', err);
      }
    }
  };


  const handleUpdateSubscription = async (id: string, updatedSub: Partial<Subscription>) => {
    if (currentUser) {
      try {
        const { id: _, ...fieldsToUpdate } = updatedSub;
        if (fieldsToUpdate.amount !== undefined) {
          fieldsToUpdate.amount = typeof fieldsToUpdate.amount === 'string' ? parseFloat(fieldsToUpdate.amount) : (fieldsToUpdate.amount || 0);
        }
        await updateDoc(doc(db, 'users', currentUser, 'subscriptions', id), fieldsToUpdate);
      } catch (err: any) {
        console.error('Firestore subscription update error:', err);
      }
    }
  };


  const handleDeleteSubscription = async (id: string) => {
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'users', currentUser, 'subscriptions', id));
      } catch (err) {
        console.error("Firestore subscription delete error:", err);
      }
    }
  };

  // Daily tracker push notification states
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('spendtrack_daily_reminder_enabled');
    return stored === null ? true : stored === 'true';
  });

  // APK Download Progress state


  // Detect if running on an Android mobile device safely
  const isAndroidMobile = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');

  // Detect if running in an Android browser tab (not PWA standalone, not Capacitor native) safely
  const isAndroidBrowserTab = Boolean(
    isAndroidMobile &&
    typeof window !== 'undefined' &&
    !Capacitor?.isNativePlatform?.() &&
    !(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) &&
    !(window.navigator as any)?.standalone
  );

  // "Get the App" banner dismissed state (persists for 7 days)
  const [appBannerDismissed, setAppBannerDismissed] = useState<boolean>(() => {
    try {
      const ts = localStorage.getItem('spendtrack_app_banner_dismissed_ts');
      if (!ts) return false;
      return Date.now() - Number(ts) < 7 * 24 * 60 * 60 * 1000;
    } catch (e) {
      return false;
    }
  });

  const handleDismissAppBanner = () => {
    setAppBannerDismissed(true);
    localStorage.setItem('spendtrack_app_banner_dismissed_ts', String(Date.now()));
  };

  const handleStartApkDownload = () => {
    // Immediately trigger browser file download without fake progress delay
    const a = document.createElement('a');
    a.href = '/spendtrack.zip';
    a.download = 'SpendTrack.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast("SpendTrack.apk download started!", "success");
    setIsDownloadModalOpen(false);
  };

  const [reminderTime, setReminderTime] = useState<string>(() => {
    return localStorage.getItem('spendtrack_reminder_time') || '20:00';
  });

  const handleUpdateReminderTime = (time: string) => {
    setReminderTime(time);
    localStorage.setItem('spendtrack_reminder_time', time);
  };

  const [lastRemindedDate, setLastRemindedDate] = useState<string>(() => {
    return localStorage.getItem('spendtrack_last_reminded_date') || '';
  });

  const [inAppBannerDismissed, setInAppBannerDismissed] = useState<boolean>(
    localStorage.getItem('spendtrack_banner_dismissed_date') === new Date().toDateString()
  );

  const getTodayDateStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayDateStr();
  const hasTransactionsToday = transactions.some(t => t.date === todayStr);

  // Synchronize daily reminders toggle with localStorage
  const handleToggleDailyReminder = (enabled: boolean) => {
    setDailyReminderEnabled(enabled);
    localStorage.setItem('spendtrack_daily_reminder_enabled', String(enabled));
  };


  // Trigger a native system notification (push only — no in-app toast)
  const triggerNotification = async (title: string, body: string, tab: TabType) => {

    // Also fire a native system notification if Capacitor is native
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 100000),
              title,
              body,
              channelId: 'spendtrack-reminders',
              smallIcon: 'ic_stat_icon',
              largeIcon: 'ic_launcher',
              iconColor: '#6366F1',
              extra: { tab }
            }
          ]
        });
      } catch (err) {
        console.error("Failed to schedule system notification:", err);
      }
    } else if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, { body, icon: '/logo.jpg' });
        } catch (err) {
          console.error("Browser notification failed:", err);
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            new Notification(title, { body, icon: '/logo.jpg' });
          }
        });
      }
    }
  };

  // Native notification setup & click action listener
  useEffect(() => {
    const setupNativeNotifications = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Create Android channel (only on Android)
          if (Capacitor.getPlatform() === 'android') {
            await LocalNotifications.createChannel({
              id: 'spendtrack-reminders',
              name: 'SpendTrack Reminders',
              description: 'Notifications for daily transaction tracking reminders',
              importance: 4, // high
              visibility: 1, // public
              sound: 'default',
              vibration: true
            });
          }

          // Request permission
          let perm = await LocalNotifications.checkPermissions();
          if (perm.display !== 'granted') {
            await LocalNotifications.requestPermissions();
          }

          // Register Action click listener
          await LocalNotifications.removeAllListeners();
          await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
            const extra = action.notification.extra;
            if (extra && extra.tab) {
              setActiveTab(extra.tab);
            }
          });
        } catch (err) {
          console.error('Local notifications setup error:', err);
        }
      }
    };

    setupNativeNotifications();
  }, []);

  // Native daily reminder — scheduled ONCE on app open or setting change
  useEffect(() => {
    const scheduleDailyReminder = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        // ALWAYS await cancel to ensure no duplicate alarms accumulate
        await LocalNotifications.cancel({ notifications: [{ id: 101 }] }).catch(() => {});

        if (!dailyReminderEnabled) return;

        const [hStr, mStr] = (reminderTime || '20:00').split(':');
        const hour = parseInt(hStr, 10) || 20;
        const minute = parseInt(mStr, 10) || 0;

        await LocalNotifications.schedule({
          notifications: [{
            id: 101,
            title: '💰 Daily SpendTrack Reminder',
            body: "You haven't logged any expenses today. Tap to track your transactions!",
            schedule: {
              on: {
                hour,
                minute
              },
              repeats: true,
              allowWhileIdle: true
            },
            channelId: 'spendtrack-reminders',
            smallIcon: 'ic_stat_icon',
            largeIcon: 'ic_launcher',
            iconColor: '#6366F1',
            extra: { tab: 'dashboard' }
          }]
        });
      } catch (err) {
        console.error('Failed to schedule daily reminders:', err);
      }
    };

    scheduleDailyReminder();
  }, [dailyReminderEnabled, reminderTime]);



  // Native subscription renewal reminders — schedules monthly alerts for all active subscriptions
  useEffect(() => {
    const scheduleSubReminders = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        // Request/verify permissions
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }

        // Cancel previous subscription notifications (IDs 1000+)
        const pending = await LocalNotifications.getPending();
        const subIdsToCancel = pending.notifications
          .filter(n => n.id >= 1000 && n.id < 2000)
          .map(n => ({ id: n.id }));
        if (subIdsToCancel.length > 0) {
          await LocalNotifications.cancel({ notifications: subIdsToCancel });
        }

        // Filter active subscriptions that have NOT been manually logged as transactions in the current month
        const today = new Date();
        const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const currentMonthTxs = transactions.filter(t => t.date?.startsWith(currentMonthStr));

        const activeSubs = subscriptions.filter(s => {
          if (s.isActive === false) return false;
          // Check if there is already a manual transaction logged for this subscription in the current month
          const isAlreadyLogged = currentMonthTxs.some(t => 
            t.amount < 0 && isSubscriptionDoubleCounted(s.title, t.title)
          );
          return !isAlreadyLogged;
        });

        if (activeSubs.length === 0) return;

        const notificationsToSchedule = activeSubs.map((s, idx) => {
          const billingDay = Number(s.billingDate) || 1;
          const targetDay = billingDay > 1 ? billingDay - 1 : 28;
          return {
            id: 1000 + idx,
            title: '🔔 Subscription Due Tomorrow',
            body: `Your ${s.title} subscription of ${formatCurrency(Number(s.amount) || 0, budget?.currency || 'INR')} is renewing tomorrow.`,
            schedule: {
              on: {
                day: targetDay,
                hour: 9,
                minute: 0
              },
              repeats: true
            },
            channelId: 'spendtrack-reminders',
            smallIcon: 'ic_stat_icon',
            largeIcon: 'ic_launcher',
            iconColor: '#6366F1',
            extra: { tab: 'dashboard' }
          };
        });

        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      } catch (err) {
        console.error('Error scheduling subscription notifications:', err);
      }
    };

    scheduleSubReminders();
  }, [subscriptions, transactions, budget?.currency]);

  // Auto-log recurring income if active and date reached
  useEffect(() => {
    if (!budget?.recurringIncome || !budget.recurringIncome.isActive || budget.recurringIncome.amount <= 0) return;

    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const todayDate = today.getDate();

    if (todayDate >= (budget.recurringIncome.dayOfMonth || 1) && budget.recurringIncome.lastProcessedMonth !== currentMonthKey) {
      const isAlreadyLogged = transactions.some(t =>
        t.date.startsWith(currentMonthKey) &&
        t.amount > 0 &&
        t.title === budget.recurringIncome!.title
      );

      if (!isAlreadyLogged) {
        handleSaveTransaction({
          title: budget.recurringIncome.title,
          amount: Math.abs(budget.recurringIncome.amount),
          category: 'Other',
          date: `${currentMonthKey}-${String(budget.recurringIncome.dayOfMonth || 1).padStart(2, '0')}`,
          time: '12:00 PM',
          label: 'Personal'
        });

        handleUpdateBudget({
          ...budget,
          recurringIncome: {
            ...budget.recurringIncome,
            lastProcessedMonth: currentMonthKey
          }
        });
      }
    }
  }, [budget, transactions]);

  // In-app floating snackbar — fires ONLY when at/past reminder time AND no logs today
  useEffect(() => {
    if (!dailyReminderEnabled) return;

    const currentTodayStr = getTodayDateStr();
    const hasLogsToday = transactions.some(t => t.date === currentTodayStr);
    const alreadyRemindedToday = localStorage.getItem('spendtrack_last_reminded_date') === currentTodayStr;
    const bannerDismissedToday = localStorage.getItem('spendtrack_banner_dismissed_date') === new Date().toDateString();

    const [hStr, mStr] = (reminderTime || '20:00').split(':');
    const reminderHour = parseInt(hStr, 10) || 20;
    const reminderMinute = parseInt(mStr, 10) || 0;
    const now = new Date();
    const isPastReminderTime = now.getHours() > reminderHour || (now.getHours() === reminderHour && now.getMinutes() >= reminderMinute);

    // Only show in-app banner if: past reminder time AND no logs today AND not already reminded AND banner not dismissed
    if (isPastReminderTime && !hasLogsToday && !alreadyRemindedToday && !bannerDismissedToday) {
      showToast(
        "You haven't logged any expenses today. Track your transactions to stay on top of your budget!",
        "info"
      );
      localStorage.setItem('spendtrack_last_reminded_date', currentTodayStr);
      setLastRemindedDate(currentTodayStr);
    }
  }, [dailyReminderEnabled, reminderTime, transactions]);

  // Direct manual test — fires real native system notification immediately
  const handleTestNotification = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Fire immediately (1 second from now) so user sees it even with app open
        const fireAt = new Date(Date.now() + 1000);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 90000) + 10000,
              title: '🔔 SpendTrack Test Notification',
              body: 'Notifications are working! You will get daily reminders at 8:00 PM.',
              schedule: { at: fireAt, allowWhileIdle: true },
              channelId: 'spendtrack-reminders',
              smallIcon: 'ic_stat_icon',
              largeIcon: 'ic_launcher',
              iconColor: '#6366F1',
              extra: { tab: 'dashboard' }
            }
          ]
        });
      } catch (err) {
        console.error('Test notification failed:', err);
      }
    }
    // Always also show in-app notification
    triggerNotification(
      '🔔 SpendTrack Test Notification',
      'Notifications are working! You will get daily reminders at 8:00 PM.',
      'dashboard'
    );
  };
  
  // Navigation & Form visibility
  const [tabState, setTabState] = useState<{ current: TabType; prev: TabType }>({
    current: 'dashboard',
    prev: 'dashboard'
  });
  const activeTab = tabState.current;
  const setActiveTab = (newTab: TabType | ((prev: TabType) => TabType)) => {
    setTabState((prev) => {
      const next = typeof newTab === 'function' ? newTab(prev.current) : newTab;
      return { current: next, prev: prev.current };
    });
  };
  const prevIndex = TAB_ORDER.indexOf(tabState.prev);
  const currentIndex = TAB_ORDER.indexOf(tabState.current);
  const direction = currentIndex >= prevIndex ? 1 : -1;
  const [isAddFormVisible, setIsAddFormVisible] = useState<boolean>(false);
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const mainScrollRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Side Drawer & Notification States
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState<boolean>(false);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [achievementBadges, setAchievementBadges] = useState(INITIAL_ACHIEVEMENT_BADGES);

  // Fetch live exchange rates on mount
  useEffect(() => {
    fetchLiveExchangeRates();
  }, []);

  const [drawerResetConfirm, setDrawerResetConfirm] = useState<boolean>(false);
  const [brandingResetConfirm, setBrandingResetConfirm] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);

  // Toast notifications state
  interface ToastItem {
    id: string;
    message: string;
    type: 'success' | 'info' | 'warning';
  }
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };


  // Re-evaluate achievement badges on transactions/budget change
  useEffect(() => {
    const evaluated = evaluateBadges(transactions, budget, achievementBadges);
    setAchievementBadges(evaluated);
  }, [transactions, budget]);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K or 'N' to open Add Expense form)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (!isInput && e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        setIsAddFormVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser), updatedProfile);
      } catch (err) { console.error('Firestore profile update error:', err); }
    }
    showToast('Profile settings saved successfully!', 'success');
  };


  const handleUpdateBudget = async (updatedBudget: BudgetConfig) => {
    // Optimistically update local budget state so the UI updates instantly
    setBudget(updatedBudget);
    try {
      localStorage.setItem('spendtrack_guest_budget', JSON.stringify(updatedBudget));
    } catch (e) {}

    if (budgetUpdateTimeoutRef.current) {
      clearTimeout(budgetUpdateTimeoutRef.current);
    }

    budgetUpdateTimeoutRef.current = setTimeout(async () => {
      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser, 'config', 'budget'), updatedBudget);
        } catch (err) { console.error('Firestore budget update error:', err); }
      }
      showToast('Budget settings saved successfully!', 'success');
    }, 500);
  };


  // Callback to add new transaction — writes directly to Firestore or local state; updates UI instantly
  const handleSaveTransaction = (newTxData: Omit<Transaction, 'id'>) => {
    const txId = Math.random().toString(36).substring(2, 11);

    // Sanitize object to remove any undefined fields before Firestore setDoc
    const cleanData: any = {};
    Object.entries(newTxData).forEach(([k, v]) => {
      if (v !== undefined) cleanData[k] = v;
    });

    const activeMonthKey = getActiveMonth();
    const isNewTxExpense = (cleanData.amount || 0) < 0;
    const existingMonthExpenses = Math.abs(
      transactions.filter(t => t && t.date && typeof t.date === 'string' && t.date.startsWith(activeMonthKey) && Number(t.amount) < 0).reduce((s, t) => s + (Number(t.amount) || 0), 0)
    );
    const activeSubsTotal = subscriptions.filter(s => s.isActive !== false).reduce((s, sub) => s + sub.amount, 0);
    const totalMonthExpensesWithNew = existingMonthExpenses + (isNewTxExpense ? Math.abs(cleanData.amount) : 0) + activeSubsTotal;
    const withinBudget = budget.monthlyLimit > 0 && totalMonthExpensesWithNew <= budget.monthlyLimit;

    // 1. Optimistic UI update — add transaction to local state immediately
    const createdTx: Transaction = { id: txId, ...cleanData } as Transaction;
    setTransactions(prev => [createdTx, ...prev.filter(t => t.id !== txId)]);

    // Check custom alert rules in real-time
    checkAlertRulesOnSave(createdTx, transactions, budget, showToast);

    // 2. Close the form instantly
    setIsAddFormVisible(false);

    // 3. Show success popup immediately
    if (isNewTxExpense) {
      setSuccessAnimation({
        isVisible: true,
        title: withinBudget ? 'Expense Saved! 🎉' : 'Expense Logged! ✅',
        message: withinBudget
          ? `"${cleanData.title}" saved. Your spending is within budget!`
          : `"${cleanData.title}" has been saved successfully.`,
        amount: cleanData.amount
      });
    } else {
      setSuccessAnimation({
        isVisible: true,
        title: 'Income Recorded! 💰',
        message: `"${cleanData.title}" has been saved successfully.`,
        amount: cleanData.amount
      });
    }

    // 4. Save to Firestore if authenticated, or localStorage if guest mode
    if (currentUser) {
      const OFFLINE_QUEUE_KEY = 'spendtrack_offline_queue';
      setDoc(doc(db, 'users', currentUser, 'transactions', txId), cleanData).catch((err: any) => {
        console.error('Firestore transaction write error:', err);
        try {
          const existingQueue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
          existingQueue.push({ txId, userId: currentUser, data: cleanData, timestamp: Date.now() });
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(existingQueue));
          showToast('Saved offline — will sync when online.', 'warning');
        } catch (qErr) {
          console.error('Offline queue write failed:', qErr);
          showToast(`Cloud sync failed: ${err?.code || err?.message || 'unknown'}`, 'warning');
        }
      });
    } else {
      // Guest mode storage
      try {
        const guestTxs = JSON.parse(localStorage.getItem('spendtrack_guest_transactions') || '[]');
        localStorage.setItem('spendtrack_guest_transactions', JSON.stringify([createdTx, ...guestTxs]));
      } catch (err) {
        console.error('Guest tx save error:', err);
      }
    }
  };


  const handleDeleteTransaction = async (id: string) => {
    const deletedTx = transactions.find(t => t.id === id);
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'users', currentUser, 'transactions', id));
      } catch (err) { console.error('Firestore transaction delete error:', err); }
    }
    showToast(`Transaction "${deletedTx?.title || 'Item'}" deleted.`, 'info');
  };


  // Auto-sync offline queued transactions when connectivity restores
  useEffect(() => {
    const OFFLINE_QUEUE_KEY = 'spendtrack_offline_queue';
    const syncOfflineQueue = async () => {
      if (!currentUser) return;
      const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!rawQueue) return;
      let queue: { txId: string; userId: string; data: any; timestamp: number }[] = [];
      try { queue = JSON.parse(rawQueue); } catch { return; }
      const myQueue = queue.filter(item => item.userId === currentUser);
      if (myQueue.length === 0) return;

      showToast(`Syncing ${myQueue.length} offline transaction(s)…`, 'info');
      const failed: typeof myQueue = [];
      await Promise.all(myQueue.map(async (item) => {
        try {
          await setDoc(doc(db, 'users', item.userId, 'transactions', item.txId), item.data);
        } catch {
          failed.push(item);
        }
      }));

      const remaining = [...queue.filter(i => i.userId !== currentUser), ...failed];
      if (remaining.length === 0) {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
      } else {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
      }
      const synced = myQueue.length - failed.length;
      if (synced > 0) showToast(`${synced} transaction(s) synced to cloud!`, 'success');
    };

    window.addEventListener('online', syncOfflineQueue);
    if (navigator.onLine) syncOfflineQueue();
    return () => window.removeEventListener('online', syncOfflineQueue);
  }, [currentUser]);

  // Callback to update transaction
  const handleUpdateTransaction = async (id: string, updatedTx: Partial<Transaction>) => {
    if (currentUser) {
      try {
        const { id: _, ...fieldsToUpdate } = updatedTx;
        await updateDoc(doc(db, 'users', currentUser, 'transactions', id), fieldsToUpdate);
      } catch (err) { console.error('Firestore transaction update error:', err); }
    }
    showToast('Transaction updated successfully.', 'success');
  };


  const handleUpdateSavingsGoals = async (updatedGoals: any[]) => {
    if (!currentUser) return;
    try {
      const currentIds = savingsGoals.map(g => g.id);
      const newIds = updatedGoals.map(g => g.id);
      const deletedIds = currentIds.filter(id => !newIds.includes(id));

      await Promise.all(deletedIds.map(id => 
        deleteDoc(doc(db, 'users', currentUser, 'savingsGoals', id))
      ));

      await Promise.all(updatedGoals.map(goal => {
        const { id, ...fields } = goal;
        return setDoc(doc(db, 'users', currentUser, 'savingsGoals', id), fields);
      }));
    } catch (err) { console.error('Firestore savings goals update error:', err); }
    showToast('Savings goals synced.', 'success');
  };


  const handleClearData = async () => {
    if (currentUser) {
      const uid = currentUser;
      const deleteSubcollection = async (colName: string) => {
        const snap = await getDocs(collection(db, 'users', uid, colName));
        await Promise.all(snap.docs.map(doc => deleteDoc(doc.ref)));
      };
      try {
        await Promise.all([
          deleteSubcollection('transactions'),
          deleteSubcollection('subscriptions'),
          deleteSubcollection('savingsGoals')
        ]);
        
        // Preserve active user details instead of overwriting with the empty default profile
        const currentAuthUser = auth.currentUser;
        const userProfile: UserProfile = {
          name: currentAuthUser?.displayName || profile.name || 'User',
          email: currentAuthUser?.email || profile.email || '',
          avatarUrl: currentAuthUser?.photoURL || profile.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(currentAuthUser?.email || 'user')}`
        };
        await setDoc(doc(db, 'users', uid), userProfile);
        await setDoc(doc(db, 'users', uid, 'config', 'budget'), DEFAULT_BUDGET);
      } catch (err) {
        console.error("Firestore purge error:", err);
      }
    }
    
    setActiveTab('dashboard');
    showToast("All data successfully purged from database.", "warning");
  };

  const handleLoginSuccess = (_email: string, _name: string) => {
    // onAuthStateChanged is the authoritative handler for setting currentUser (UID) and loading data.
    // This callback only needs to navigate to the dashboard — do NOT set currentUser here,
    // as that would overwrite the UID with an email, breaking all Firestore writes.
    setActiveTab('dashboard');
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  const handleLogoutRequest = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    signOut(auth).catch(err => console.error("Firebase logout error:", err));
    localStorage.removeItem('spendtrack_logged_in_user');
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Reset all transactions (and optionally clear local queue)
  const handleResetData = async () => {
    if (!currentUser) return;
    try {
      const txCol = collection(db, 'users', currentUser, 'transactions');
      const snap = await getDocs(txCol);
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'users', currentUser, 'transactions', d.id))));
      localStorage.removeItem('spendtrack_offline_queue');
      showToast('All transactions cleared.', 'info');
    } catch (err) {
      console.error('Reset error:', err);
      showToast('Reset failed. Please try again.', 'warning');
    }
  };

  // Keep track of the latest states inside a ref to prevent stale closures in the Capacitor backButton event handler
  const backStateRef = useRef({
    isAddFormVisible,
    isDrawerOpen,
    showLogoutConfirm,
    activeTab
  });

  useEffect(() => {
    backStateRef.current = {
      isAddFormVisible,
      isDrawerOpen,
      showLogoutConfirm,
      activeTab
    };
  }, [isAddFormVisible, isDrawerOpen, showLogoutConfirm, activeTab]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let sub: { remove: () => void } | null = null;

    CapApp.addListener('backButton', () => {
      const state = backStateRef.current;
      if (state.isAddFormVisible) {
        setIsAddFormVisible(false);
      } else if (state.isDrawerOpen) {
        setIsDrawerOpen(false);
      } else if (state.showLogoutConfirm) {
        setShowLogoutConfirm(false);
      } else if (state.activeTab !== 'dashboard') {
        setActiveTab('dashboard');
      } else {
        CapApp.minimizeApp();
      }
    }).then(handler => {
      sub = handler;
    });

    return () => {
      if (sub) {
        sub.remove();
      }
    };
  }, []);

  // Notifications calculation
  // Group notifications for the user
  const currentRealMonthLabel = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  };

  const getActiveMonth = (): string => {
    if (transactions.length === 0) return currentRealMonthLabel();
    const available = Array.from(new Set(transactions.map(t => t.date.substring(0, 7)))) as string[];
    available.sort((a, b) => b.localeCompare(a));
    return available[0] || currentRealMonthLabel();
  };

  const activeMonthKey = getActiveMonth();
  const [activeYear, activeMonthNum] = activeMonthKey.split('-').map(Number);
  const activeMonthName = new Date(activeYear, activeMonthNum - 1, 1).toLocaleString('en-IN', { month: 'long' });

  // Sum active subscriptions only if they haven't already been manually logged in the current month's transactions
  const activeSubsTotal = subscriptions
    .filter(s => s.isActive !== false)
    .reduce((sum, s) => {
      const isAlreadyLogged = transactions.some(t => 
        t && t.date && typeof t.date === 'string' &&
        t.date.startsWith(activeMonthKey) &&
        Number(t.amount) < 0 &&
        isSubscriptionDoubleCounted(s.title, t.title)
      );
      return sum + (isAlreadyLogged ? 0 : (Number(s.amount) || 0));
    }, 0);

  const currentMonthExpenses = Math.abs(
    transactions
      .filter(t => t && t.date && typeof t.date === 'string' && t.date.startsWith(activeMonthKey) && Number(t.amount) < 0)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  ) + activeSubsTotal;
  const budgetAlert = budget.monthlyLimit > 0 && currentMonthExpenses > budget.monthlyLimit * 0.8;
  const unlockedBadgesCount = achievementBadges.filter(b => b.unlocked).length;

  // Intelligent Multi-Trigger Notifications Engine


  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-6 select-none font-sans relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center max-w-xs w-full text-center space-y-6 z-10">
          {/* Logo container */}
          <div className="w-24 h-24 rounded-3xl overflow-hidden border border-outline-variant/30 shadow-md bg-white p-0.5 animate-pulse">
            <img 
              src="/logo.jpg" 
              alt="SpendTrack Logo" 
              className="w-full h-full object-cover rounded-[22px]"
              onError={(e) => {
                // Fallback to Icon if image fails to load
                (e.target as HTMLElement).style.display = 'none';
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full bg-primary flex items-center justify-center text-on-primary';
                  fallback.innerHTML = `<svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`; // a temporary generic icon placeholder
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>

          {/* Text branding */}
          <div className="space-y-1.5">
            <h2 className="font-outfit text-2xl font-black text-primary tracking-tight">
              SpendTrack
            </h2>
            <p className="text-[11px] font-bold text-on-surface-variant/80 uppercase tracking-widest font-mono">
              Smart Wealth Management
            </p>
          </div>

          {/* Loader */}
          <div className="w-full pt-4">
            {/* Clean Material 3 linear infinite loading bar */}
            <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 bg-primary w-1/2 rounded-full animate-indeterminate-bar" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!currentUser ? (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="w-full h-full"
        >
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        </motion.div>
      ) : !emailVerified ? (
        <motion.div
          key="verify"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="w-full h-full"
        >
          <EmailVerificationScreen 
            onVerified={() => setEmailVerified(true)} 
            onLogout={handleLogoutRequest}
          />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="h-screen w-screen overflow-hidden"
        >
          <div className={`h-screen overflow-hidden bg-background text-on-background flex flex-col md:flex-row font-sans relative antialiased selection:bg-primary-container selection:text-on-primary-container ${isPrivacyMode ? 'privacy-blur-mode' : ''}`}>
      
      {/* If Add Form is active, render it exclusively in full viewport view */}
      {isAddFormVisible ? (
        <AddTransactionForm 
          onSave={handleSaveTransaction} 
          onCancel={() => setIsAddFormVisible(false)}
          budget={budget}
          transactions={transactions}
        />
      ) : (
        <>
          {/* Side Navigation Sidebar for wider screens */}
          <nav className="hidden md:flex w-64 bg-surface-container border-r border-outline-variant/30 flex-col py-6 px-4 shrink-0 h-screen sticky top-0 justify-between z-40 overflow-y-auto">
            <div className="flex flex-col gap-5 w-full">
              {/* App branding */}
              <div className="flex items-center gap-3 p-2">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-xs shrink-0">
                  <PiggyBank className="w-5.5 h-5.5 text-on-primary" />
                </div>
                <div>
                  <h1 className="font-outfit text-base font-black text-on-surface leading-none tracking-tight">SpendTrack</h1>
                  <span className="text-[9px] text-on-surface-variant font-mono font-medium tracking-wider uppercase">Secure Ledger</span>
                </div>
              </div>

              {/* Logged-in User Profile Widget */}
              <div className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl flex items-center gap-2.5">
                <img 
                  src={profile.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.name || 'User')}`} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full border border-primary/40 object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.name || 'User')}`;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-on-surface truncate leading-tight">{profile.name}</p>
                  <p className="text-[9px] text-on-surface-variant truncate font-medium">{profile.email}</p>
                </div>
              </div>
              
              {/* Navigation links (Styled lists with icons) */}
              <div className="flex flex-col space-y-1 w-full">
                {/* Dashboard Tab */}
                <button
                  id="rail-tab-dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer w-full text-left group ${
                    activeTab === 'dashboard'
                      ? 'bg-primary-container text-on-primary-container font-bold shadow-xs scale-101'
                      : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface'
                  }`}
                >
                  <LayoutDashboard className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${
                    activeTab === 'dashboard' ? 'text-primary' : 'text-on-surface-variant/80'
                  }`} />
                  <span className="text-xs font-semibold tracking-tight select-none">
                    Dashboard
                  </span>
                </button>

                {/* History Tab */}
                <button
                  id="rail-tab-history"
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer w-full text-left group ${
                    activeTab === 'history'
                      ? 'bg-primary-container text-on-primary-container font-bold shadow-xs scale-101'
                      : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface'
                  }`}
                >
                  <HistoryIcon className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${
                    activeTab === 'history' ? 'text-primary' : 'text-on-surface-variant/80'
                  }`} />
                  <span className="text-xs font-semibold tracking-tight select-none">
                    Transactions
                  </span>
                </button>

                {/* Insights Tab */}
                <button
                  id="rail-tab-insights"
                  onClick={() => setActiveTab('insights')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer w-full text-left group ${
                    activeTab === 'insights'
                      ? 'bg-primary-container text-on-primary-container font-bold shadow-xs scale-101'
                      : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface'
                  }`}
                >
                  <TrendingUp className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${
                    activeTab === 'insights' ? 'text-primary' : 'text-on-surface-variant/80'
                  }`} />
                  <span className="text-xs font-semibold tracking-tight select-none">
                    Insights
                  </span>
                </button>


                {/* Settings Tab */}
                <button
                  id="rail-tab-settings"
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer w-full text-left group ${
                    activeTab === 'settings'
                      ? 'bg-primary-container text-on-primary-container font-bold shadow-xs scale-101'
                      : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface'
                  }`}
                >
                  <SettingsIcon className={`w-4.5 h-4.5 transition-transform group-hover:scale-105 ${
                    activeTab === 'settings' ? 'text-primary' : 'text-on-surface-variant/80'
                  }`} />
                  <span className="text-xs font-semibold tracking-tight select-none">
                    Settings
                  </span>
                </button>

                {/* Quick Add Log Shortcut Button */}
                <div className="pt-2 px-1">
                  <button
                    onClick={() => setIsAddFormVisible(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-xs hover:bg-primary/95 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Quick Add Log</span>
                  </button>
                </div>
              </div>

              {/* Dynamic useful stats section */}
              <div className="pt-4 border-t border-outline-variant/15 space-y-3">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block px-1">Ledger Summary</span>
                
                {/* 1. Remaining Safe-to-Spend Widget (only if budget set) */}
                {budget && Number(budget.monthlyLimit) > 0 && (() => {
                  const today = new Date();
                  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                  const activeMonthTxs = transactions.filter(t => t && t.date && typeof t.date === 'string' && t.date.startsWith(currentMonthKey));
                  const monthSpent = Math.abs(activeMonthTxs.filter(t => t && Number(t.amount) < 0).reduce((sum, t) => sum + (Number(t.amount) || 0), 0));
                  const limit = Number(budget.monthlyLimit);
                  const remaining = limit - monthSpent;
                  const usagePct = Math.round((monthSpent / limit) * 100);

                  return (
                    <div className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant">
                        <span>Safe Left:</span>
                        <span className={remaining < 0 ? "text-error" : "text-primary font-mono"}>
                          {formatCurrency(remaining, budget?.currency || 'INR')}
                        </span>
                      </div>
                      
                      <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${remaining < 0 ? 'bg-error' : usagePct > 85 ? 'bg-amber-500' : 'bg-primary'}`} 
                          style={{ width: `${Math.min(100, usagePct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-mono font-bold text-on-surface-variant/75">
                        <span>{usagePct}% spent</span>
                        <span>Cap: {formatCurrency(limit, budget?.currency || 'INR')}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Key Metrics Badges */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-surface-container-low border border-outline-variant/20 rounded-xl text-center">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-on-surface-variant">Active Bills</span>
                    <p className="text-xs font-black font-mono text-primary mt-0.5">{subscriptions.filter(s => s.isActive !== false).length}</p>
                  </div>
                  <div className="p-2 bg-surface-container-low border border-outline-variant/20 rounded-xl text-center">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-on-surface-variant">Savings Goals</span>
                    <p className="text-xs font-black font-mono text-emerald-600 mt-0.5">{savingsGoals.length}</p>
                  </div>
                </div>

                {/* 3. Savings Goal Mini-Progress */}
                {savingsGoals.length > 0 && (() => {
                  const firstGoal = savingsGoals[0];
                  const goalPct = Math.round((firstGoal.currentAmount / firstGoal.targetAmount) * 100);
                  return (
                    <div className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant">
                        <span className="truncate max-w-[100px]">{firstGoal.title}:</span>
                        <span className="text-emerald-600 font-mono">
                          {goalPct}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(100, goalPct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-mono font-bold text-on-surface-variant/75">
                        <span>{formatCurrency(firstGoal.currentAmount, budget?.currency || 'INR')}</span>
                        <span>Goal: {formatCurrency(firstGoal.targetAmount, budget?.currency || 'INR')}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Logout trigger button */}
            <div className="pt-4 border-t border-outline-variant/15">
              <button
                onClick={handleLogoutRequest}
                className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer w-full text-left text-error hover:bg-error/10 font-bold text-xs group"
              >
                <LogOut className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform text-error" />
                <span>Log Out</span>
              </button>
            </div>
          </nav>

          {/* Main Layout Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Main Layout Header App Bar — Original Glassmorphic Design */}
            <header className="fixed top-0 md:left-64 left-0 right-0 h-16 bg-surface/80 dark:bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/20 flex items-center justify-between px-3.5 sm:px-5 z-30 transition-all duration-200">
              <div className="flex items-center gap-2.5">
                {/* Drawer Hamburger Button */}
                <button
                  id="hamburger-menu-button"
                  onClick={() => setIsDrawerOpen(true)}
                  aria-label="Open sidebar"
                  className="md:hidden p-2 rounded-xl hover:bg-surface-container-high text-primary transition-colors active:scale-95 duration-100 cursor-pointer"
                >
                  <Menu className="w-5.5 h-5.5" />
                </button>

                {/* Brand Logo & Name (Mobile) */}
                <div className="flex items-center gap-2 md:hidden">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-xs">
                    <PiggyBank className="w-4 h-4 text-on-primary" />
                  </div>
                  <h1 className="text-lg font-black tracking-tight text-primary font-outfit select-none">
                    SpendTrack
                  </h1>
                </div>

                {/* Breadcrumb Context Badge (Desktop) */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-container-low/70 border border-outline-variant/30 rounded-xl">
                  {activeTab === 'dashboard' && (
                    <>
                      <LayoutDashboard className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-on-surface font-outfit">Dashboard Overview</span>
                    </>
                  )}
                  {activeTab === 'history' && (
                    <>
                      <HistoryIcon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-on-surface font-outfit">Transaction Archive</span>
                    </>
                  )}
                  {activeTab === 'insights' && (
                    <>
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-on-surface font-outfit">Analytics & Intelligence</span>
                    </>
                  )}
                  {activeTab === 'settings' && (
                    <>
                      <SettingsIcon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-on-surface font-outfit">Settings & Preferences</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">

                {/* Privacy Blur Mode Toggle */}
                <button
                  id="privacy-mode-toggle"
                  onClick={() => {
                    const next = !isPrivacyMode;
                    setIsPrivacyMode(next);
                    localStorage.setItem('spendtrack_privacy_mode', String(next));
                  }}
                  aria-label="Toggle Privacy Blur"
                  title={isPrivacyMode ? 'Show Amounts' : 'Blur Amounts'}
                  className={`p-2 rounded-xl transition-all active:scale-95 duration-100 cursor-pointer border ${
                    isPrivacyMode
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400'
                      : 'bg-surface-container-high/60 border-outline-variant/30 text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {isPrivacyMode ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>

                {/* Mobile App Download Button — hide when inside native app */}
                {!Capacitor?.isNativePlatform?.() && (
                <button
                  id="mobile-download-button"
                  onClick={() => setIsDownloadModalOpen(true)}
                  aria-label="Download Mobile App"
                  title="Download Mobile App (APK)"
                  className="p-2 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 text-on-surface-variant hover:text-primary transition-all active:scale-95 duration-100 cursor-pointer flex items-center justify-center"
                >
                  <Smartphone className="w-4.5 h-4.5" />
                </button>
                )}



                {/* Profile Avatar (Mobile) */}
                <div
                  id="avatar-trigger"
                  className="md:hidden w-8 h-8 rounded-full bg-primary-container overflow-hidden border border-primary/40 shadow-xs"
                >
                  <img
                    src={profile.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.name || 'User')}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.name || 'User')}`;
                    }}
                  />
                </div>
              </div>
            </header>

            {/* Core Content Layout Area — only this area scrolls, like a native app */}
            <main
              ref={mainScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 pt-20 pb-36 md:pb-12"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } as React.CSSProperties}
            >

              {/* "Get the App" Smart Banner — shows on Android mobile browsers only, once per 7 days */}
              {isAndroidBrowserTab && !appBannerDismissed && (
                <div
                  id="get-app-banner"
                  className="mb-3 flex items-center gap-3 p-3 pr-2 bg-gradient-to-r from-primary/90 to-primary/70 text-on-primary rounded-2xl shadow-lg border border-primary/20 animate-fade-in md:hidden"
                >
                  {/* App icon */}
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-on-primary/15 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-on-primary" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black leading-tight">Get the SpendTrack App</p>
                    <p className="text-[10px] font-medium opacity-85 leading-tight mt-0.5">
                      Download the Android APK for a native experience
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      id="get-app-banner-download-btn"
                      onClick={() => {
                        handleDismissAppBanner();
                        setIsDownloadModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-on-primary text-primary rounded-xl text-[10px] font-black hover:bg-on-primary/90 active:scale-95 transition-all cursor-pointer shadow-sm"
                    >
                      Install
                    </button>
                    <button
                      id="get-app-banner-dismiss-btn"
                      onClick={handleDismissAppBanner}
                      aria-label="Dismiss app banner"
                      className="p-1.5 rounded-xl hover:bg-on-primary/10 active:scale-95 transition-all cursor-pointer opacity-80 hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5 text-on-primary" />
                    </button>
                  </div>
                </div>
              )}

              {/* Daily Reminder In-App Banner */}
              {dailyReminderEnabled && !hasTransactionsToday && !inAppBannerDismissed && activeTab !== 'settings' && (
                <div id="daily-reminder-banner" className="mt-1 mb-4 p-2 px-3 bg-primary-container/90 text-on-primary-container rounded-xl border border-outline-variant/30 flex items-center justify-between gap-3 shadow-sm animate-fade-in relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-primary/15 rounded-md text-primary shrink-0">
                      <Bell className="w-3.5 h-3.5 animate-bounce text-primary" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2">
                      <span className="font-bold text-[11px] leading-none">Track Today's Spending</span>
                      <span className="text-[10px] opacity-85 leading-none hidden xs:inline">• Log expenses to stay on track</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      id="reminder-dismiss-btn"
                      onClick={() => {
                        setInAppBannerDismissed(true);
                        localStorage.setItem('spendtrack_banner_dismissed_date', new Date().toDateString());
                      }}
                      className="px-2 py-0.5 hover:bg-on-primary-container/10 text-on-primary-container font-semibold text-[10px] rounded-md transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      id="reminder-add-btn"
                      onClick={() => setIsAddFormVisible(true)}
                      className="px-2.5 py-0.5 bg-primary text-on-primary font-bold text-[10px] rounded-md shadow-xs hover:bg-primary/95 transition-colors flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add Log
                    </button>
                  </div>
                </div>
              )}

              {/* Tab content — plain div, zero Framer interference with native scroll */}
              <div
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  touchStartRef.current = { x: t.clientX, y: t.clientY };
                }}
                onTouchEnd={(e) => {
                  if (!touchStartRef.current) return;
                  const t = e.changedTouches[0];
                  const dx = t.clientX - touchStartRef.current.x;
                  const dy = t.clientY - touchStartRef.current.y;
                  touchStartRef.current = null;
                  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 2) return;
                  if (dx < 0) {
                    const nextIdx = currentIndex + 1;
                    if (nextIdx < TAB_ORDER.length) setActiveTab(TAB_ORDER[nextIdx]);
                  } else {
                    const prevIdx = currentIndex - 1;
                    if (prevIdx >= 0) setActiveTab(TAB_ORDER[prevIdx]);
                  }
                }}
                className="w-full flex-1 flex flex-col"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: direction * 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -direction * 15 }}
                    transition={{ duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="w-full flex-1 flex flex-col"
                  >
                    {activeTab === 'dashboard' && (
                      <DashboardTab 
                        transactions={transactions} 
                        profile={profile} 
                        budget={budget} 
                        subscriptions={subscriptions}
                        savingsGoals={savingsGoals}
                        onUpdateSavingsGoals={handleUpdateSavingsGoals}
                        onAddSubscription={handleSaveSubscription}
                        onUpdateSubscription={handleUpdateSubscription}
                        onDeleteSubscription={handleDeleteSubscription}
                        onNavigateToHistory={() => setActiveTab('history')}
                        onNavigateToInsights={() => setActiveTab('insights')}
                        onAddTransactionClick={() => setIsAddFormVisible(true)}
                        onDeleteTransaction={handleDeleteTransaction}
                        onAddTransaction={handleSaveTransaction}
                        onOpenVoice={() => setIsVoiceModalOpen(true)}
                        onOpenCalendar={() => setIsCalendarOpen(true)}
                        onOpenExportAudit={() => setIsPdfExportOpen(true)}
                        onNavigateToSettings={() => setActiveTab('settings')}
                        onUpdateBudget={handleUpdateBudget}
                        themePresetId={themePresetId}
                        isDark={darkMode}
                        onOpenBadges={() => setIsBadgesModalOpen(true)}
                        unlockedBadgesCount={achievementBadges.filter(b => b.unlocked).length}
                      />
                    )}
                    {activeTab === 'history' && (
                      <HistoryTab 
                        transactions={transactions} 
                        budget={budget} 
                        profile={profile}
                        subscriptions={subscriptions}
                        onAddTransactionClick={() => setIsAddFormVisible(true)}
                        onDeleteTransaction={handleDeleteTransaction}
                        onUpdateTransaction={handleUpdateTransaction}
                        onNavigateToInsights={() => setActiveTab('insights')}
                      />
                    )}
                    {activeTab === 'insights' && (
                      <InsightsTab 
                        transactions={transactions} 
                        budget={budget}
                        subscriptions={subscriptions}
                        savingsGoals={savingsGoals}
                        themePresetId={themePresetId}
                        isDark={darkMode}
                      />
                    )}
                    {activeTab === 'settings' && (
                      <SettingsTab 
                        profile={profile}
                        budget={budget}
                        transactions={transactions}
                        onUpdateProfile={handleUpdateProfile}
                        onUpdateBudget={handleUpdateBudget}
                        onClearData={handleClearData}
                        darkMode={darkMode}
                        onToggleDarkMode={setDarkMode}
                        dailyReminderEnabled={dailyReminderEnabled}
                        onToggleDailyReminder={handleToggleDailyReminder}
                        reminderTime={reminderTime}
                        onUpdateReminderTime={handleUpdateReminderTime}
                        onTestNotification={handleTestNotification}
                        onLogout={handleLogoutRequest}
                        themePresetId={themePresetId}
                        onSelectThemePreset={setThemePresetId}
                        onOpenCsvImport={() => setIsCsvImportOpen(true)}
                        onOpenBadges={() => setIsBadgesModalOpen(true)}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>


            </main>

            {/* Bottom Navigation Bar — M3 with animated spring indicator */}
            <nav className="fixed bottom-0 left-0 right-0 h-20 bg-surface/85 dark:bg-surface-container-low/85 backdrop-blur-xl border-t border-outline-variant/20 flex items-center justify-around px-2 z-40 pb-safe pb-[env(safe-area-inset-bottom)] md:hidden">
              
              {([
                { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
                { id: 'history',   label: 'History',   Icon: HistoryIcon },
                { id: 'insights',  label: 'Insights',  Icon: TrendingUp },
                { id: 'settings',  label: 'Settings',  Icon: SettingsIcon },
              ] as const).map(({ id, label, Icon }) => {
                const isActive = activeTab === id;
                return (
                  <motion.button
                    key={id}
                    id={`nav-tab-${id}`}
                    onClick={() => setActiveTab(id as TabType)}
                    className="relative flex flex-col items-center justify-center flex-1 gap-0.5 py-2 cursor-pointer select-none"
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    {/* Animated pill — full button area, icon + label */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-x-1 inset-y-1 bg-primary-container rounded-2xl"
                        transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
                      />
                    )}
                    <Icon className={`relative z-10 w-5 h-5 transition-colors duration-150 ${
                      isActive ? 'text-on-primary-container' : 'text-on-surface-variant/60'
                    }`} />
                    <span className={`relative z-10 text-[9px] font-bold select-none transition-colors duration-150 ${
                      isActive ? 'text-on-primary-container font-black' : 'text-on-surface-variant/60'
                    }`}>
                      {label}
                    </span>
                  </motion.button>
                );
              })}

            </nav>

          </div>
        </>
      )}

      {/* Left Sidebar Drawer Menu (Slide out on Hamburger menu click) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex animate-fade-in">
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 cursor-pointer"
          ></div>
          
          <div className="relative w-85 max-w-[90vw] bg-surface-container-lowest h-full shadow-2xl p-5 flex flex-col justify-between z-10 animate-slide-right border-r border-outline-variant/30 overflow-y-auto">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-xs">
                    <PiggyBank className="w-5 h-5 text-on-primary" />
                  </div>
                  <div>
                    <span className="font-outfit font-black text-base text-on-surface leading-tight block">SpendTrack Cockpit</span>
                    <span className="text-[8px] text-on-surface-variant font-mono font-bold uppercase tracking-wider">Mobile Assistant</span>
                  </div>
                </div>
                <button 
                  id="close-drawer"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant cursor-pointer"
                  title="Close Cockpit"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Card Summary */}
              <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/20 relative group">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-primary shrink-0">
                  <img 
                    src={profile.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.name || 'User')}`} 
                    alt="User Avatar" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.name || 'User')}`;
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-on-surface truncate">{profile.name}</p>
                  <p className="text-[10px] text-on-surface-variant truncate font-mono">{profile.email}</p>
                </div>
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>

              {/* Tab Navigation Links */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block px-1">Navigation</span>
                
                {[
                  { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { tab: 'history', label: 'Transaction Ledger', icon: HistoryIcon },
                  { tab: 'insights', label: 'Insights', icon: TrendingUp },
                  { tab: 'settings', label: 'Control Settings', icon: SettingsIcon },
                ].map((item) => {
                  const isActive = activeTab === item.tab;
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => {
                        setActiveTab(item.tab as TabType);
                        setIsDrawerOpen(false);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer w-full text-left group ${
                        isActive
                          ? 'bg-primary-container text-on-primary-container font-bold shadow-xs'
                          : 'text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface'
                      }`}
                    >
                      <IconComp className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-primary' : 'text-on-surface-variant/80'
                      }`} />
                      <span className="text-xs font-semibold tracking-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Safe to Spend Miniature Progress Gauge */}
              {budget && Number(budget.monthlyLimit) > 0 && (
                <div className="p-3.5 bg-surface-container-low border border-outline-variant/20 rounded-2xl space-y-2">
                  {(() => {
                    const limit = Number(budget.monthlyLimit);
                    const monthSpent = currentMonthExpenses;
                    const remaining = limit - monthSpent;
                    const spentPct = Math.round((monthSpent / limit) * 100);
                    const isOver = remaining < 0;

                    return (
                      <>
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-on-surface-variant uppercase tracking-wider">Monthly Budget Span</span>
                          <span className={`font-mono ${isOver ? 'text-error' : 'text-primary'}`}>
                            {spentPct}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${isOver ? 'bg-error animate-pulse' : 'bg-primary'}`} 
                            style={{ width: `${Math.min(100, spentPct)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono font-semibold">
                          <div className="text-on-surface-variant/80">
                            Spent: <span className="font-bold text-on-surface">{formatCurrency(monthSpent, budget?.currency || 'INR')}</span>
                          </div>
                          <div className="text-right">
                            Remaining: <span className={`font-bold ${isOver ? 'text-error' : 'text-emerald-600'}`}>{formatCurrency(remaining, budget?.currency || 'INR')}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Interactive Preference Widgets */}
              <div className="p-3.5 bg-surface-container-low border border-outline-variant/20 rounded-2xl space-y-3">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Quick Adjustments</span>
                
                {/* 1. Palette Dot Grid */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold text-on-surface-variant flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5" />
                    Color Palette Presets
                  </div>
                  <div className="flex items-center gap-2.5">
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected = preset.id === themePresetId;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => setThemePresetId(preset.id)}
                          className={`w-5.5 h-5.5 rounded-full border border-black/10 transition-all cursor-pointer relative hover:scale-110 flex items-center justify-center shrink-0 ${
                            isSelected ? 'ring-2 ring-primary ring-offset-1 scale-105' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: preset.colorHex }}
                          title={`Switch to ${preset.name}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* 2. Target Monthly Cap Config */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold text-on-surface-variant flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      Adjust Monthly Cap (INR)
                    </span>
                    <span className="font-mono font-bold text-primary">{sliderLimit}</span>
                  </div>
                  <input 
                    type="range"
                    min="1000"
                    max="150000"
                    step="1000"
                    value={sliderLimit || 3000}
                    onChange={(e) => {
                      setSliderLimit(parseFloat(e.target.value) || 0);
                    }}
                    onMouseUp={() => {
                      handleUpdateBudget({ ...budget, monthlyLimit: sliderLimit });
                    }}
                    onTouchEnd={() => {
                      handleUpdateBudget({ ...budget, monthlyLimit: sliderLimit });
                    }}
                    onKeyUp={(e) => {
                      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                        handleUpdateBudget({ ...budget, monthlyLimit: sliderLimit });
                      }
                    }}
                    className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                  />
                </div>

                {/* 3. Dark Mode Toggle & Seeder Controls */}
                <div className="flex gap-2.5 items-center">
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-variant/20 text-[10px] font-bold text-on-surface-variant cursor-pointer transition-colors"
                  >
                    {darkMode ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>

                  {drawerResetConfirm ? (
                    <div className="flex-1 flex items-center gap-1 animate-fade-in">
                      <button
                        onClick={() => {
                          handleResetData();
                          setDrawerResetConfirm(false);
                          setIsDrawerOpen(false);
                        }}
                        className="flex-1 flex items-center justify-center py-2 rounded-xl bg-error text-on-error hover:bg-error/90 text-[10px] font-black cursor-pointer transition-colors active:scale-95"
                      >
                        Confirm?
                      </button>
                      <button
                        onClick={() => setDrawerResetConfirm(false)}
                        className="px-2.5 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:bg-surface-container-high text-on-surface-variant text-[9px] font-bold cursor-pointer transition-colors"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDrawerResetConfirm(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:bg-error/10 hover:border-error/25 hover:text-error text-[10px] font-bold text-on-surface-variant transition-all cursor-pointer"
                      title="Reseed budget data"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset Data</span>
                    </button>
                  )}
                </div>
              </div>




            </div>

            {/* Drawer Footer Tip & Shortcuts */}
            <div className="mt-6 pt-4 border-t border-outline-variant/15 space-y-3">
              {/* Quick Add Log action */}
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsAddFormVisible(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-xs hover:bg-primary/95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Quick Add Log</span>
              </button>

              {/* Dynamic Tip Card */}
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1 select-none">
                  <Sparkles className="w-3 h-3" />
                  Financial tip
                </span>
                <p className="text-[9px] text-on-surface-variant leading-tight">
                  Pre-logging recurring bills cuts unexpected late penalty fee risk by up to 92%.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}




      {/* Global Fixed FAB (Floating Action Button) - Constantly Available */}
      {!isAddFormVisible && (
        <button 
          id="global-add-transaction-fab"
          onClick={() => setIsAddFormVisible(true)}
          aria-label="Add Transaction"
          className="fixed bottom-24 md:bottom-8 right-6 md:right-8 w-14 h-14 bg-primary text-white hover:bg-primary/90 hover:shadow-lg rounded-2xl flex items-center justify-center active:scale-95 transition-all z-40 cursor-pointer shadow-md"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Subtle Confetti Success Animation Overlay */}
      {successAnimation && (
        <SuccessConfetti
          isVisible={successAnimation.isVisible}
          onClose={() => setSuccessAnimation(null)}
          title={successAnimation.title}
          message={successAnimation.message}
          amount={successAnimation.amount}
        />
      )}

      {/* Custom Toast Notifications Stack */}
      <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 z-[120] max-w-sm w-auto pointer-events-none flex flex-col gap-2.5">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-3.5 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md pointer-events-auto ${
                t.type === 'success'
                  ? 'bg-success/15 border-success/30 text-success'
                  : t.type === 'warning'
                  ? 'bg-error/15 border-error/30 text-error'
                  : 'bg-primary/15 border-primary/30 text-primary'
              }`}
            >
              {t.type === 'success' && <div className="w-2.5 h-2.5 rounded-full bg-success shrink-0 animate-pulse" />}
              {t.type === 'warning' && <div className="w-2.5 h-2.5 rounded-full bg-error shrink-0 animate-pulse" />}
              {t.type === 'info' && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 animate-pulse" />}
              <span className="text-xs font-bold text-on-surface flex-1">{t.message}</span>
              <button
                onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-md transition-colors cursor-pointer text-[10px] font-black"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>



      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-fade-in">
          <div
            className="absolute inset-0"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative w-full max-w-xs bg-surface-container-lowest border border-outline-variant/30 rounded-3xl shadow-2xl p-6 space-y-5 animate-fade-in">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center">
                <LogOut className="w-7 h-7 text-error" />
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-1.5">
              <h3 className="font-black text-base text-on-surface">Log out?</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                You'll be signed out of SpendTrack. Your data is safely stored and will be waiting when you log back in.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                id="logout-cancel-btn"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-2xl border border-outline-variant text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="logout-confirm-btn"
                onClick={handleLogoutConfirm}
                className="flex-1 py-2.5 rounded-2xl bg-error text-on-error text-sm font-black hover:bg-error/90 transition-colors cursor-pointer shadow-sm"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile App Download Dialog */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-fade-in">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setIsDownloadModalOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-surface-container-lowest border border-outline-variant/30 rounded-3xl shadow-2xl p-6 space-y-5 animate-fade-in z-10">
            
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="w-7 h-7 text-primary" />
                  </div>
                </div>

                {/* Text */}
                <div className="text-center space-y-1.5">
                  <h3 className="font-black text-base text-on-surface font-outfit">Download SpendTrack</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Take your personal budget manager with you on the go! Choose your platform below:
                  </p>
                </div>

                {/* Platform Options */}
                <div className="space-y-3">
                  {/* Android option */}
                  <button
                    onClick={handleStartApkDownload}
                    className="w-full flex items-center justify-between p-3.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 rounded-2xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🤖</span>
                      <div className="text-left">
                        <span className="block font-bold text-xs text-on-surface">Android Installer (APK)</span>
                        <span className="block text-[10px] text-on-surface-variant">Direct installer file (.apk)</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* iOS option */}
                  <div className="p-3.5 bg-surface-container border border-outline-variant/40 rounded-2xl text-left">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-xl"></span>
                      <span className="font-bold text-xs text-on-surface">iPhone / iOS Installation</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant leading-normal">
                      Open this website in <strong className="text-on-surface">Safari</strong> on your iPhone, tap the <strong className="text-on-surface">Share</strong> button, and select <strong className="text-on-surface">"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>

                {/* Close action */}
                <div className="pt-2">
                  <button
                    onClick={() => setIsDownloadModalOpen(false)}
                    className="w-full py-2.5 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest text-sm font-bold text-on-surface transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
          </div>
        </div>
      )}


      {/* Commercial Feature Modals & AI Coach Widget */}
        <CalendarViewModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          transactions={transactions}
          subscriptions={subscriptions}
          currency={budget?.currency || 'INR'}
        />

        <AlertRulesModal
          isOpen={isAlertRulesOpen}
          onClose={() => setIsAlertRulesOpen(false)}
          currency={budget?.currency || 'INR'}
        />

        <PdfExportModal
          isOpen={isPdfExportOpen}
          onClose={() => setIsPdfExportOpen(false)}
          transactions={transactions}
          budget={budget}
          profile={profile}
          subscriptions={subscriptions}
          savingsGoals={savingsGoals}
        />

        <CsvImportModal
          isOpen={isCsvImportOpen}
          onClose={() => setIsCsvImportOpen(false)}
          onImport={(importedTxs) => {
            importedTxs.forEach(tx => handleSaveTransaction(tx));
            showToast(`Successfully imported ${importedTxs.length} transactions!`, 'success');
          }}
          existingTransactions={transactions}
          currency={budget?.currency || 'INR'}
        />

        <AchievementBadgesModal
          isOpen={isBadgesModalOpen}
          onClose={() => setIsBadgesModalOpen(false)}
          badges={achievementBadges}
        />

      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onAddTransaction={(newTx) => {
          handleSaveTransaction(newTx);
          showToast(`Logged voice transaction: ${newTx.title}`, 'success');
        }}
        currency={budget?.currency || 'INR'}
      />

      <PinLockModal
        isOpen={pinConfig.isEnabled && !isPinUnlocked}
        correctPin={pinConfig.pin}
        onUnlock={() => setIsPinUnlocked(true)}
        onResetPin={() => {
          setPinConfig({ isEnabled: false, pin: '' });
          localStorage.removeItem('spendtrack_pin_config');
          setIsPinUnlocked(true);
          showToast('PIN lock disabled. Re-authenticated with your account.', 'info');
        }}
      />

      {!isAddFormVisible && (
        <AiCoachWidget
          transactions={transactions}
          budgetConfig={budget}
          subscriptions={subscriptions}
          savingsGoals={savingsGoals}
          currency={budget?.currency || 'INR'}
          themePresetId={themePresetId}
          isDark={darkMode}
        />
      )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
