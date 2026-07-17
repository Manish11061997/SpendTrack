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
  AlertCircle
} from 'lucide-react';
import { Transaction, UserProfile, BudgetConfig, Subscription } from './types';
import { COLOR_PRESETS } from './theme';
import { 
  INITIAL_TRANSACTIONS, 
  DEFAULT_PROFILE, 
  DEFAULT_BUDGET 
} from './initialData';

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

// Firebase Imports
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, collection, setDoc, getDoc, deleteDoc, updateDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';

// Capacitor & Native Plugins
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapApp } from '@capacitor/app';

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
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState<boolean>(true);

  // ── User Data (all loaded from Firestore, never from localStorage) ────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile]           = useState<UserProfile>(DEFAULT_PROFILE);
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
      // Tear down any previous listeners before setting up new ones
      unsubTxs?.(); unsubSubs?.(); unsubGoals?.(); unsubProfile?.(); unsubBudget?.();

      if (firebaseUser) {
        const uid = firebaseUser.uid;
        setCurrentUser(uid);
        setEmailVerified(firebaseUser.emailVerified);

        // --- Ensure user profile document exists and is populated ---
        const profileRef = doc(db, 'users', uid);
        const profileSnap = await getDoc(profileRef);
        const existingData = profileSnap.exists() ? (profileSnap.data() as UserProfile) : null;
        const isSarahJenkins = existingData && (existingData.name === 'Sarah Jenkins' || existingData.email === 'sarah.j@example.com');

        if (!existingData || !existingData.name || !existingData.email || isSarahJenkins) {
          const newProfile: UserProfile = {
            name: (isSarahJenkins ? '' : existingData?.name) || firebaseUser.displayName || 'User',
            email: (isSarahJenkins ? '' : existingData?.email) || firebaseUser.email || '',
            avatarUrl: (isSarahJenkins ? '' : existingData?.avatarUrl) || firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(firebaseUser.email || 'user')}`
          };
          await setDoc(profileRef, newProfile, { merge: true });
        } else if (firebaseUser.photoURL && (!existingData?.avatarUrl || existingData.avatarUrl.includes('dicebear'))) {
          // Always sync Google photo when available and local avatar is missing/placeholder
          await setDoc(profileRef, { avatarUrl: firebaseUser.photoURL }, { merge: true });
        }

        // --- Ensure budget config document exists ---
        const budgetRef = doc(db, 'users', uid, 'config', 'budget');
        const budgetSnap = await getDoc(budgetRef);
        if (!budgetSnap.exists()) {
          await setDoc(budgetRef, DEFAULT_BUDGET);
        }

        // --- Real-time listener: Profile ---
        unsubProfile = onSnapshot(doc(db, 'users', uid), (snap) => {
          if (snap.exists()) setProfile(snap.data() as UserProfile);
        }, (err) => console.error('Profile listener error:', err));

        // --- Real-time listener: Budget ---
        unsubBudget = onSnapshot(doc(db, 'users', uid, 'config', 'budget'), (snap) => {
          if (snap.exists()) setBudget(snap.data() as BudgetConfig);
        }, (err) => console.error('Budget listener error:', err));

        // --- Real-time listener: Transactions ---
        unsubTxs = onSnapshot(collection(db, 'users', uid, 'transactions'), (snap) => {
          const list: Transaction[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as Transaction));
          list.sort((a, b) => b.date.localeCompare(a.date));
          setTransactions(list);
        }, (err) => console.error('Transactions listener error:', err));

        // --- Real-time listener: Subscriptions ---
        unsubSubs = onSnapshot(collection(db, 'users', uid, 'subscriptions'), (snap) => {
          const list: Subscription[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as Subscription));
          setSubscriptions(list);
        }, (err) => console.error('Subscriptions listener error:', err));

        // --- Real-time listener: Savings Goals ---
        unsubGoals = onSnapshot(collection(db, 'users', uid, 'savingsGoals'), (snap) => {
          const list: any[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setSavingsGoals(list);
        }, (err) => console.error('Goals listener error:', err));

      } else {
        // Logged out — clear all state
        setCurrentUser(null);
        setEmailVerified(true);
        setTransactions([]);
        setProfile(DEFAULT_PROFILE);
        setBudget(DEFAULT_BUDGET);
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

  const [lastRemindedDate, setLastRemindedDate] = useState<string>(() => {
    return localStorage.getItem('spendtrack_last_reminded_date') || '';
  });

  interface InAppNotification {
    id: string;
    title: string;
    body: string;
    tab: TabType;
  }
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
  const [inAppBannerDismissed, setInAppBannerDismissed] = useState<boolean>(
    localStorage.getItem('spendtrack_banner_dismissed_date') === new Date().toDateString()
  );
  const [dismissedNotifIds, setDismissedNotifIds] = useState<number[]>(() => {
    try {
      const key = `spendtrack_dismissed_notifs_${new Date().toDateString()}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const dismissAllNotifications = (ids: number[]) => {
    const key = `spendtrack_dismissed_notifs_${new Date().toDateString()}`;
    localStorage.setItem(key, JSON.stringify(ids));
    setDismissedNotifIds(ids);
    // Also mark the in-app banner dismissed for today
    setInAppBannerDismissed(true);
    localStorage.setItem('spendtrack_banner_dismissed_date', new Date().toDateString());
  };
  const [isBrandingMenuOpen, setIsBrandingMenuOpen] = useState<boolean>(false);

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

  // Helper to trigger a notification (system banner + foreground in-app snackbar)
  const triggerNotification = async (title: string, body: string, tab: TabType) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Add to in-app banners stack
    setInAppNotifications(prev => [...prev, { id, title, body, tab }]);
    
    // Auto dismiss in-app after 7 seconds
    setTimeout(() => {
      setInAppNotifications(prev => prev.filter(n => n.id !== id));
    }, 7000);

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
          new Notification(title, { body, icon: '/favicon.ico' });
        } catch (err) {
          console.error("Browser notification failed:", err);
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
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
          // Create Android channel
          await LocalNotifications.createChannel({
            id: 'spendtrack-reminders',
            name: 'SpendTrack Reminders',
            description: 'Notifications for daily transaction tracking reminders',
            importance: 4, // high
            visibility: 1, // public
            sound: 'default',
            vibration: true,
          });

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

  // Native daily reminder — scheduled ONCE on app open, independent of transactions
  useEffect(() => {
    if (!dailyReminderEnabled || !Capacitor.isNativePlatform()) return;

    LocalNotifications.cancel({ notifications: [{ id: 101 }] }).catch(() => {});
    const scheduleDate = new Date();
    scheduleDate.setHours(20, 0, 0, 0);
    if (scheduleDate.getTime() <= Date.now()) {
      scheduleDate.setDate(scheduleDate.getDate() + 1);
    }
    LocalNotifications.schedule({
      notifications: [{
        id: 101,
        title: '💰 Daily SpendTrack Reminder',
        body: "You haven't logged any expenses today. Tap to track your transactions!",
        schedule: { at: scheduleDate, repeats: true, every: 'day', allowWhileIdle: true },
        channelId: 'spendtrack-reminders',
        smallIcon: 'ic_stat_icon_config_sample',
        extra: { tab: 'dashboard' }
      }]
    }).catch(err => console.error('Failed to schedule daily reminders:', err));
  }, [dailyReminderEnabled]); // only re-schedule if toggle changes

  // In-app floating snackbar — fires once per day only
  useEffect(() => {
    if (!dailyReminderEnabled) return;

    const currentTodayStr = getTodayDateStr();
    const hasLogsToday = transactions.some(t => t.date === currentTodayStr);
    const alreadyRemindedToday = localStorage.getItem('spendtrack_last_reminded_date') === currentTodayStr;
    const bannerDismissedToday = localStorage.getItem('spendtrack_banner_dismissed_date') === new Date().toDateString();

    // Only show floating snackbar if: no logs today AND not already reminded AND banner not dismissed
    if (!hasLogsToday && !alreadyRemindedToday && !bannerDismissedToday) {
      triggerNotification(
        "Daily SpendTrack Reminder",
        "You haven't logged any expenses today. Track your transactions to stay on top of your budget!",
        "dashboard"
      );
      localStorage.setItem('spendtrack_last_reminded_date', currentTodayStr);
      setLastRemindedDate(currentTodayStr);
    }
  }, [dailyReminderEnabled, transactions]);

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
              smallIcon: 'ic_stat_icon_config_sample',
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  
  // Search state inside Left Drawer
  const [drawerSearch, setDrawerSearch] = useState<string>('');

  const [expandedDrawerTxId, setExpandedDrawerTxId] = useState<string | null>(null);
  const [drawerResetConfirm, setDrawerResetConfirm] = useState<boolean>(false);
  const [brandingResetConfirm, setBrandingResetConfirm] = useState<boolean>(false);

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

    if (budgetUpdateTimeoutRef.current) {
      clearTimeout(budgetUpdateTimeoutRef.current);
    }

    budgetUpdateTimeoutRef.current = setTimeout(async () => {
      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser, 'config', 'budget'), updatedBudget);
        } catch (err) { console.error('Firestore budget update error:', err); }
      }
      showToast('Monthly budget limit saved successfully!', 'success');
    }, 500);
  };


  // Callback to add new transaction — writes directly to Firestore; onSnapshot auto-updates UI
  const handleSaveTransaction = async (newTxData: Omit<Transaction, 'id'>) => {
    if (!currentUser) { setIsAddFormVisible(false); return; }

    const txId = Math.random().toString(36).substring(2, 11);
    // Budget animation
    const activeMonthKey = getActiveMonth();
    const isNewTxExpense = newTxData.amount < 0;
    const existingMonthExpenses = Math.abs(
      transactions.filter(t => t.date.startsWith(activeMonthKey) && t.amount < 0).reduce((s, t) => s + t.amount, 0)
    );
    const activeSubsTotal = subscriptions.filter(s => s.isActive).reduce((s, sub) => s + sub.amount, 0);
    const totalMonthExpensesWithNew = existingMonthExpenses + (isNewTxExpense ? Math.abs(newTxData.amount) : 0) + activeSubsTotal;
    if (totalMonthExpensesWithNew <= budget.monthlyLimit) {
      setSuccessAnimation({
        isVisible: true,
        title: isNewTxExpense ? 'Budget Safe! 🎉' : 'Income Boost! 💰',
        message: isNewTxExpense
          ? `"${newTxData.title}" logged. Spending stays within budget!`
          : `"${newTxData.title}" recorded. Extra financial breathing room!`,
        amount: newTxData.amount
      });
    }
    try {
      await setDoc(doc(db, 'users', currentUser, 'transactions', txId), newTxData);
      showToast(`Transaction "${newTxData.title}" logged!`, 'success');
    } catch (err: any) {
      console.error('Firestore transaction save error:', err);
      showToast(`Cloud sync failed: ${err?.code || err?.message || 'unknown'}`, 'warning');
    }
    setIsAddFormVisible(false);
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

  // Keep track of the latest states inside a ref to prevent stale closures in the Capacitor backButton event handler
  const backStateRef = useRef({
    isAddFormVisible,
    isDrawerOpen,
    isNotificationsOpen,
    showLogoutConfirm,
    activeTab
  });

  useEffect(() => {
    backStateRef.current = {
      isAddFormVisible,
      isDrawerOpen,
      isNotificationsOpen,
      showLogoutConfirm,
      activeTab
    };
  }, [isAddFormVisible, isDrawerOpen, isNotificationsOpen, showLogoutConfirm, activeTab]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let sub: { remove: () => void } | null = null;

    CapApp.addListener('backButton', () => {
      const state = backStateRef.current;
      if (state.isAddFormVisible) {
        setIsAddFormVisible(false);
      } else if (state.isDrawerOpen) {
        setIsDrawerOpen(false);
      } else if (state.isNotificationsOpen) {
        setIsNotificationsOpen(false);
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
    .filter(s => s.isActive)
    .reduce((sum, s) => {
      const isAlreadyLogged = transactions.some(t => 
        t.date.startsWith(activeMonthKey) &&
        t.amount < 0 &&
        (t.label === 'Subscription' || t.title.toLowerCase().includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(t.title.toLowerCase()))
      );
      return sum + (isAlreadyLogged ? 0 : s.amount);
    }, 0);

  const currentMonthExpenses = Math.abs(
    transactions
      .filter(t => t.date.startsWith(activeMonthKey) && t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  ) + activeSubsTotal;
  const budgetAlert = budget.monthlyLimit > 0 && currentMonthExpenses > budget.monthlyLimit * 0.8;

  // Only real alerts — no static always-on notifications
  const allActiveNotifications: { id: number; title: string; message: string; isUrgent: boolean; time: string }[] = [];

  if (dailyReminderEnabled && !hasTransactionsToday && !inAppBannerDismissed) {
    allActiveNotifications.push({
      id: 99,
      title: 'Daily Tracker Alert',
      message: "You haven't logged any transactions yet today. Track your daily expenses now!",
      isUrgent: true,
      time: 'Today'
    });
  }

  if (budgetAlert) {
    allActiveNotifications.push({
      id: 1,
      title: 'Budget Warning',
      message: `${activeMonthName} spending has reached ${Math.round((currentMonthExpenses / budget.monthlyLimit) * 100)}% of your monthly limit.`,
      isUrgent: true,
      time: 'Just Now'
    });
  }

  // Filter out dismissed ones (persisted in sessionStorage)
  const activeNotifications = allActiveNotifications.filter(n => !dismissedNotifIds.includes(n.id));

  // Drawer Search transactions
  const filteredDrawerTxs = drawerSearch.trim() === ''
    ? []
    : transactions.filter(t => 
        t.title.toLowerCase().includes(drawerSearch.toLowerCase()) ||
        t.category.toLowerCase().includes(drawerSearch.toLowerCase()) ||
        t.label.toLowerCase().includes(drawerSearch.toLowerCase())
      ).slice(0, 4);

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
          <div className="h-screen overflow-hidden bg-background text-on-background flex flex-col md:flex-row font-sans relative antialiased selection:bg-primary-container selection:text-on-primary-container">
      
      {/* If Add Form is active, render it exclusively in full viewport view */}
      {isAddFormVisible ? (
        <AddTransactionForm 
          onSave={handleSaveTransaction} 
          onCancel={() => setIsAddFormVisible(false)} 
        />
      ) : (
        <>
          {/* Side Navigation Sidebar for wider screens */}
          <nav className="hidden md:flex w-64 bg-surface-container border-r border-outline-variant/30 flex-col py-6 px-4 shrink-0 h-screen sticky top-0 justify-between z-40 overflow-y-auto">
            <div className="flex flex-col gap-5 w-full">
              {/* App branding with interactive dropdown triggers */}
              <div className="relative">
                <button
                  onClick={() => setIsBrandingMenuOpen(!isBrandingMenuOpen)}
                  className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-surface-variant/20 transition-all text-left focus:outline-hidden group cursor-pointer"
                  title="Open SpendTrack Quick Menu"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <PiggyBank className="w-5.5 h-5.5 text-on-primary" />
                    </div>
                    <div>
                      <h1 className="font-outfit text-base font-black text-on-surface leading-none tracking-tight flex items-center gap-1.5">
                        SpendTrack
                        <ChevronDown className={`w-3.5 h-3.5 text-on-surface-variant transition-transform ${isBrandingMenuOpen ? 'rotate-180 text-primary' : 'group-hover:translate-y-0.5'}`} />
                      </h1>
                      <span className="text-[9px] text-on-surface-variant font-mono font-medium tracking-wider uppercase">Secure Ledger</span>
                    </div>
                  </div>
                </button>

                {/* Dropdown Menu Card */}
                {isBrandingMenuOpen && (
                  <div className="absolute top-14 left-0 right-0 z-50 bg-surface-container-high border border-outline-variant/40 rounded-2xl p-3.5 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">SpendTrack Quick Menu</span>
                      <button 
                        onClick={() => setIsBrandingMenuOpen(false)} 
                        className="text-on-surface-variant hover:text-on-surface p-1 hover:bg-surface-variant/40 rounded-lg cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Set Budget */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-primary" />
                        Quick Monthly Cap
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          value={budget.monthlyLimit || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateBudget({ ...budget, monthlyLimit: val });
                          }}
                          className="flex-1 bg-surface-container-low border border-outline-variant/50 rounded-lg px-2 py-1 text-xs font-mono font-bold text-on-surface focus:outline-hidden focus:border-primary"
                          placeholder="e.g. 50000"
                        />
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-mono font-bold flex items-center">
                          INR
                        </span>
                      </div>
                    </div>

                    {/* Theme Preset Colors */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                        <Palette className="w-3 h-3 text-secondary" />
                        Palette Preset
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => setThemePresetId(preset.id)}
                            className={`flex items-center justify-center p-1.5 rounded-lg border text-[10px] font-bold transition-all truncate cursor-pointer ${
                              themePresetId === preset.id 
                                ? 'bg-primary-container text-on-primary-container border-primary shadow-xs' 
                                : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-variant/30'
                            }`}
                            title={preset.name}
                          >
                            <span 
                              className="w-2.5 h-2.5 rounded-full mr-1.5 shrink-0" 
                              style={{ backgroundColor: preset.colorHex }}
                            />
                            <span className="truncate">{preset.id}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mode switcher & simulation buttons */}
                    <div className="pt-2.5 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                      {/* Dark/Light Toggle */}
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:bg-surface-variant/30 text-[10px] font-bold text-on-surface-variant cursor-pointer transition-colors"
                      >
                        {darkMode ? (
                          <>
                            <Sun className="w-3 h-3 text-amber-500" />
                            <span>Light Mode</span>
                          </>
                        ) : (
                          <>
                            <Moon className="w-3 h-3 text-indigo-500" />
                            <span>Dark Mode</span>
                          </>
                        )}
                      </button>

                      {/* Reset Seeder Button */}
                      {brandingResetConfirm ? (
                        <div className="flex items-center gap-1 animate-fade-in shrink-0">
                          <button
                            onClick={() => {
                              handleResetData();
                              setBrandingResetConfirm(false);
                              setIsBrandingMenuOpen(false);
                            }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-error text-on-error hover:bg-error/90 text-[10px] font-black cursor-pointer transition-all active:scale-95"
                            title="Confirm reseed values"
                          >
                            <span>Confirm?</span>
                          </button>
                          <button
                            onClick={() => setBrandingResetConfirm(false)}
                            className="px-2 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-highest text-on-surface-variant text-[9px] font-bold cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setBrandingResetConfirm(true)}
                          className="flex items-center justify-center gap-1 p-1.5 rounded-lg hover:bg-error/10 text-error hover:text-error transition-colors cursor-pointer text-[10px] font-bold shrink-0"
                          title="Reseed default budget data"
                        >
                          <RefreshCw className="w-3 h-3 animate-spin-slow" />
                          <span>Reseed</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Logged-in User Profile Widget */}
              <div className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl flex items-center gap-2.5">
                <img src={profile.avatarUrl} alt="Profile" className="w-8 h-8 rounded-full border border-primary/40 object-cover" />
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
                    Insights & Sandbox
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
                
                {/* 1. Remaining Safe-to-Spend Widget */}
                {(() => {
                  const today = new Date();
                  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                  const activeMonthTxs = transactions.filter(t => t.date.startsWith(currentMonthKey));
                  const subsTotal = subscriptions.filter(s => s.isActive).reduce((sum, s) => sum + s.amount, 0);
                  const monthSpent = Math.abs(activeMonthTxs.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)) + subsTotal;
                  const limit = budget.monthlyLimit || 3000;
                  const remaining = limit - monthSpent;
                  const usagePct = Math.round((monthSpent / limit) * 100);

                  return (
                    <div className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant">
                        <span>Safe Left:</span>
                        <span className={remaining < 0 ? "text-error" : "text-primary font-mono"}>
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(remaining)}
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
                        <span>Cap: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(limit)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Key Metrics Badges */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-surface-container-low border border-outline-variant/20 rounded-xl text-center">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-on-surface-variant">Active Bills</span>
                    <p className="text-xs font-black font-mono text-primary mt-0.5">{subscriptions.filter(s => s.isActive).length}</p>
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
                        <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(firstGoal.currentAmount)}</span>
                        <span>Goal: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(firstGoal.targetAmount)}</span>
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
            {/* Main Layout Header App Bar */}
            <header className="fixed top-0 md:left-24 left-0 right-0 h-16 bg-surface/80 dark:bg-surface-container-low/80 backdrop-blur-md border-b border-outline-variant/20 flex items-center justify-between px-4 z-30 transition-all duration-200">
              <div className="flex items-center gap-3">
                <button 
                  id="hamburger-menu-button"
                  onClick={() => setIsDrawerOpen(true)}
                  aria-label="Open sidebar"
                  className="p-2 rounded-full hover:bg-primary-container hover:text-on-primary-container dark:hover:bg-inverse-surface/10 transition-colors active:scale-95 duration-100 text-primary cursor-pointer"
                >
                  <Menu className="w-5.5 h-5.5" />
                </button>
                <h1 className="text-xl font-black tracking-tight text-primary font-outfit select-none flex items-center gap-1.5">
                  SpendTrack
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {/* Dynamic Quick Color Dots */}
                <div className="hidden sm:flex items-center gap-2 mr-1 border-r border-outline-variant/30 pr-3">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = preset.id === themePresetId;
                    return (
                      <button
                        key={preset.id}
                        id={`header-preset-${preset.id}`}
                        onClick={() => setThemePresetId(preset.id)}
                        className={`w-4.5 h-4.5 rounded-full border border-black/10 transition-all cursor-pointer relative hover:scale-115 flex items-center justify-center ${
                          isSelected ? 'ring-1.5 ring-primary ring-offset-1 scale-110' : 'opacity-65 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: preset.colorHex }}
                        title={`Switch to ${preset.name}`}
                      />
                    );
                  })}
                </div>

                {/* Notification Bell with Badge */}
                <button 
                  id="notification-bell-button"
                  onClick={() => setIsNotificationsOpen(true)}
                  aria-label="View notifications"
                  className="p-2.5 rounded-full hover:bg-surface-container-highest dark:hover:bg-inverse-surface transition-colors active:scale-95 duration-100 text-primary relative cursor-pointer"
                >
                  <Bell className="w-5 h-5" />
                  {activeNotifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full ring-2 ring-surface-container animate-pulse"></span>
                  )}
                </button>

                {/* Profile Avatar (Mobile header fallback) */}
                <div 
                  id="avatar-trigger"
                  onClick={() => setActiveTab('settings')}
                  className="w-8 h-8 rounded-full bg-primary-container overflow-hidden border border-outline-variant cursor-pointer active:scale-95 transition-transform md:hidden"
                  title="Go to Settings"
                >
                  <img 
                    src={profile.avatarUrl} 
                    alt="User Profile Studio Headshot" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </header>

            {/* Core Content Layout Area — only this area scrolls, like a native app */}
            <main
              ref={mainScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-20 pb-28 md:pb-12"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } as React.CSSProperties}
            >
              
              {/* Daily Reminder In-App Banner */}
              {dailyReminderEnabled && !hasTransactionsToday && !inAppBannerDismissed && activeTab !== 'settings' && (
                <div id="daily-reminder-banner" className="mb-3 p-1.5 px-3 bg-primary-container/85 text-on-primary-container rounded-xl border border-outline-variant/30 flex items-center justify-between gap-3 shadow-xs animate-fade-in">
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
                        themePresetId={themePresetId}
                        isDark={darkMode}
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
                        onUpdateProfile={handleUpdateProfile}
                        onUpdateBudget={handleUpdateBudget}
                        onClearData={handleClearData}
                        darkMode={darkMode}
                        onToggleDarkMode={setDarkMode}
                        dailyReminderEnabled={dailyReminderEnabled}
                        onToggleDailyReminder={handleToggleDailyReminder}
                        onTestNotification={handleTestNotification}
                        onLogout={handleLogoutRequest}
                        themePresetId={themePresetId}
                        onSelectThemePreset={setThemePresetId}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>


            </main>

            {/* Bottom Navigation Bar — M3 with animated spring indicator */}
            <nav className="fixed bottom-0 left-0 right-0 h-20 bg-surface/85 dark:bg-surface-container-low/85 backdrop-blur-xl border-t border-outline-variant/20 flex items-center justify-around px-2 z-40 pb-safe md:hidden">
              
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
                  <img src={profile.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
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
                  { tab: 'insights', label: 'Insights & Sandbox', icon: TrendingUp },
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
              <div className="p-3.5 bg-surface-container-low border border-outline-variant/20 rounded-2xl space-y-2">
                {(() => {
                  const limit = budget.monthlyLimit || 3000;
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
                          Spent: <span className="font-bold text-on-surface">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(monthSpent)}</span>
                        </div>
                        <div className="text-right">
                          Remaining: <span className={`font-bold ${isOver ? 'text-error' : 'text-emerald-600'}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(remaining)}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

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

              {/* Interactive Universal Search Tool */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant px-0.5 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  Universal Quick-Ledger Search
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search titles, categories..."
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    className="w-full text-xs bg-surface-container-low border border-outline-variant rounded-xl pl-8 pr-3 py-2 outline-none focus:border-primary placeholder:text-on-surface-variant/40"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-on-surface-variant/40" />
                </div>

                {/* Searched Results Panel with Interactive Expandable Detail and Direct Delete */}
                {drawerSearch.trim() !== '' && (
                  <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/25 space-y-1.5 max-h-48 overflow-y-auto">
                    <p className="text-[9px] uppercase font-bold text-outline px-1 flex justify-between">
                      <span>Matches ({filteredDrawerTxs.length})</span>
                      <button onClick={() => setDrawerSearch('')} className="text-primary hover:underline lowercase font-normal cursor-pointer">clear</button>
                    </p>
                    {filteredDrawerTxs.length === 0 ? (
                      <p className="text-[10px] text-on-surface-variant p-1">No matching logs.</p>
                    ) : (
                      filteredDrawerTxs.map((t) => {
                        const isExpanded = expandedDrawerTxId === t.id;
                        return (
                          <div 
                            key={t.id}
                            className="p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/20 hover:border-outline-variant/50 transition-all text-[11px] space-y-1.5"
                          >
                            <div 
                              onClick={() => setExpandedDrawerTxId(isExpanded ? null : t.id)}
                              className="flex justify-between items-center cursor-pointer font-medium text-on-surface"
                            >
                              <span className="font-semibold truncate max-w-[150px]">{t.title}</span>
                              <span className={`font-mono font-bold ${t.amount < 0 ? 'text-error' : 'text-emerald-600'}`}>
                                {t.amount < 0 ? '' : '+'}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(t.amount))}
                              </span>
                            </div>
                            
                            {isExpanded && (
                              <div className="pt-1.5 border-t border-outline-variant/10 text-[10px] text-on-surface-variant space-y-1 bg-surface-container-low/40 p-1.5 rounded-md animate-fade-in">
                                <div className="flex justify-between">
                                  <span>Date:</span>
                                  <span className="font-mono text-on-surface font-semibold">{t.date}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Category:</span>
                                  <span className="capitalize text-on-surface font-semibold">{t.category}</span>
                                </div>
                                {t.label && (
                                  <div className="flex justify-between">
                                    <span>Notes:</span>
                                    <span className="italic text-on-surface font-semibold">{t.label}</span>
                                  </div>
                                )}
                                <div className="flex gap-2 pt-1.5 justify-end">
                                  <button
                                    onClick={() => {
                                      handleDeleteTransaction(t.id);
                                      setExpandedDrawerTxId(null);
                                    }}
                                    className="px-2 py-1 bg-error/10 text-error rounded hover:bg-error/20 transition-colors cursor-pointer text-[9px] font-bold"
                                  >
                                    Delete Log
                                  </button>
                                  <button
                                    onClick={() => {
                                      setIsDrawerOpen(false);
                                      setActiveTab('history');
                                    }}
                                    className="px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors cursor-pointer text-[9px] font-bold"
                                  >
                                    Full Ledger
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
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

      {/* Notifications Modal Box (Screenshot click notifications) */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div 
            onClick={() => setIsNotificationsOpen(false)}
            className="absolute inset-0 cursor-pointer"
          ></div>
          <div className="relative w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl p-5 space-y-4 z-10 animate-fade-in">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h4 className="font-bold text-sm text-primary flex items-center gap-1.5">
                <Bell className="w-4.5 h-4.5 text-primary" />
                SpendTrack System Alerts
              </h4>
              <button 
                id="close-notifications"
                onClick={() => setIsNotificationsOpen(false)}
                className="p-1 rounded-full hover:bg-surface-container-high transition-colors"
              >
                <X className="w-4 h-4 text-outline" />
              </button>
            </div>

            <div className="space-y-3 min-h-[60px]">
              {activeNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                    <Bell className="w-5 h-5 text-on-surface-variant/40" />
                  </div>
                  <p className="text-xs text-on-surface-variant/60 font-medium">All clear! No alerts right now.</p>
                </div>
              ) : (
                activeNotifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-3 rounded-xl border flex gap-2.5 ${
                      notif.isUrgent 
                        ? 'bg-error/5 border-error/20' 
                        : 'bg-surface-container-low border-outline-variant/15'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${notif.isUrgent ? 'bg-error' : 'bg-secondary'}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-1">
                        <span className="font-bold text-xs text-on-surface">{notif.title}</span>
                        <span className="text-[9px] text-on-surface-variant font-mono">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-normal mt-0.5">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end border-t border-outline-variant/10 pt-2">
              {activeNotifications.length > 0 ? (
                <button 
                  id="clear-notifications"
                  onClick={() => {
                    dismissAllNotifications(allActiveNotifications.map(n => n.id));
                    setIsNotificationsOpen(false);
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-error hover:bg-error/5 rounded-full transition-colors cursor-pointer"
                >
                  Dismiss All
                </button>
              ) : (
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-full transition-colors cursor-pointer"
                >
                  Close
                </button>
              )}
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
      <div className="fixed top-6 right-6 z-[120] max-w-sm w-full pointer-events-none flex flex-col gap-2.5">
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

      {/* Floating In-App Notifications Stack */}
      <div className="fixed top-6 right-6 z-[120] max-w-sm w-full pointer-events-none flex flex-col gap-2.5 mt-16">
        <AnimatePresence>
          {inAppNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              onClick={() => {
                setActiveTab(notif.tab);
                setInAppNotifications(prev => prev.filter(n => n.id !== notif.id));
              }}
              className="bg-surface-container-high border border-outline-variant/45 rounded-2xl p-4 shadow-xl flex items-start gap-3 pointer-events-auto cursor-pointer hover:bg-surface-container-highest active:scale-98 transition-all"
            >
              <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs text-on-surface truncate">{notif.title}</h4>
                <p className="text-[11px] text-on-surface-variant leading-normal mt-0.5">{notif.body}</p>
                <span className="text-[9px] text-primary font-semibold uppercase tracking-wider block mt-1.5">Tap to view</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInAppNotifications(prev => prev.filter(n => n.id !== notif.id));
                }}
                className="p-1 rounded-lg text-on-surface-variant/70 hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
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

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
