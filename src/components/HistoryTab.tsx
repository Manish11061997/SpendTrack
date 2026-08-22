import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, BudgetConfig, UserProfile, Subscription } from '../types';
import { formatCurrency as formatCustomCurrency, parseRawAmount } from '../utils/currency';
import { 
  ArrowLeft,
  Calendar, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Utensils, 
  Car, 
  Home as HomeIcon, 
  ShoppingBag, 
  MoreHorizontal, 
  Plus, 
  Trash2,
  Bell,
  Clock,
  Pencil,
  Tag,
  FileText,
  X,
  PlusCircle,
  Coins,
  Search,
  Download
} from 'lucide-react';
import { 
  OCTOBER_2023_TRANSACTIONS, 
  MonthlyHistorySummary, 
  INITIAL_HISTORY_SUMMARIES 
} from '../initialData';
import ExportPDFButton from './ExportPDFButton';
import { exportTransactionsToCSV } from '../utils/exportCsv';

interface HistoryTabProps {
  transactions: Transaction[];
  budget: BudgetConfig;
  profile: UserProfile;
  subscriptions: Subscription[];
  onAddTransactionClick: () => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction: (id: string, updatedTx: Partial<Transaction>) => void;
  onNavigateToInsights?: () => void;
}

export default function HistoryTab({ 
  transactions, 
  budget, 
  profile,
  subscriptions,
  onAddTransactionClick,
  onDeleteTransaction,
  onUpdateTransaction,
  onNavigateToInsights = () => {}
}: HistoryTabProps) {
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  // Search and Category Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Inline Editing State
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');
  const [editError, setEditError] = useState<string | null>(null);

  // Swipe-to-Delete State
  const [swipedTxId, setSwipedTxId] = useState<string | null>(null);

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return formatCustomCurrency(val, budget?.currency || 'INR');
  };

  // Dynamically group all transactions by month with memoization
  const groupedByMonth = useMemo(() => {
    return transactions.reduce((acc, t) => {
      const monthKey = t.date.substring(0, 7); // yyyy-mm
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [transactions]);

  // Convert to MonthlyHistorySummary objects with memoization
  const recordsList: MonthlyHistorySummary[] = useMemo(() => {
    return Object.entries(groupedByMonth).map(([monthKey, txs]) => {
      const [year, month] = monthKey.split('-').map(Number);
      const dateObj = new Date(year, month - 1, 1);
      const label = dateObj.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      const shortLabel = dateObj.toLocaleString('en-IN', { month: 'short' }).toUpperCase();
      const totalOutflow = Math.abs(
        txs
          .filter(t => t.amount < 0)
          .reduce((sum, t) => sum + t.amount, 0)
      );
      return {
        monthKey,
        label,
        shortLabel,
        totalOutflow,
        transactionCount: txs.length
      };
    }).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [groupedByMonth]);

  // Group transactions for a specific month
  const getSelectedMonthTransactions = (key: string): Transaction[] => {
    return transactions.filter(t => t.date.startsWith(key));
  };

  // Helper to category config
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Food':
        return { icon: Utensils, bg: 'bg-primary-container text-on-primary-container border border-primary/10' };
      case 'Transport':
        return { icon: Car, bg: 'bg-secondary/10 text-secondary dark:bg-secondary/20 border border-secondary/10' };
      case 'Rent':
        return { icon: HomeIcon, bg: 'bg-secondary-container text-on-secondary-container border border-secondary/10' };
      case 'Shopping':
        return { icon: ShoppingBag, bg: 'bg-primary/10 text-primary dark:bg-primary/20 border border-primary/10' };
      default:
        return { icon: MoreHorizontal, bg: 'bg-surface-variant text-on-surface-variant border border-outline-variant/20' };
    }
  };

  // Format month name label
  const formatFullDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Render Archive (List View)
  if (!selectedMonthKey) {
    // Total Year Outflow is computed from user's actual transaction history
    const totalYearOutflow = Math.abs(
      transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0)
    );

    // Get date range label dynamically
    const getTransactionDateRangeLabel = () => {
      if (transactions.length === 0) return 'No active records';
      const dates = transactions.map(t => t.date).sort();
      const minDateStr = dates[0];
      const maxDateStr = dates[dates.length - 1];
      
      const parseMonthYear = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length < 2) return dateStr;
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
        return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
      };
      
      return `${parseMonthYear(minDateStr)} — ${parseMonthYear(maxDateStr)}`;
    };

    const latestMonthKey = recordsList[0]?.monthKey;

    return (
      <div className="space-y-6 pb-24 animate-fade-in">
        
        {/* Header Section */}
        <section className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-outfit text-2xl lg:text-3xl font-black text-on-surface tracking-tight">Archive</h2>
            <p className="font-body-md text-sm text-on-surface-variant">Review your historical spending by month</p>
          </div>
          <button
            type="button"
            onClick={() => exportTransactionsToCSV(transactions)}
            className="px-3.5 py-2 bg-surface-container-high hover:bg-primary/20 border border-outline-variant/40 text-primary rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
            title="Export all transactions as CSV / Excel spreadsheet"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </section>

        {/* Summary Card */}
        <section>
          <div className="bg-primary text-on-primary p-5 rounded-2xl shadow-md relative overflow-hidden">
            {/* Abstract Decorative Ornaments */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-primary-container/20 rounded-full blur-xl"></div>
            
            <div className="relative z-10 space-y-4">
              <div>
                <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Total Year Outflow</p>
                <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                  <span className="text-3xl font-extrabold">{formatCurrency(totalYearOutflow)}</span>
                  <span className="text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Dynamic YTD
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs opacity-90 border-t border-white/15 pt-3">
                <Calendar className="w-3.5 h-3.5" />
                <span>{getTransactionDateRangeLabel()}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Monthly List */}
        <section className="space-y-3">
          <h3 className="font-outfit text-sm font-bold text-on-surface-variant px-1 tracking-tight">Monthly Records</h3>
          
          <div className="grid grid-cols-1 gap-3">
            {recordsList.length === 0 ? (
              <div className="text-center py-10 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/60 text-on-surface-variant">
                <Calendar className="w-8 h-8 text-outline mx-auto mb-2" />
                <p className="text-sm font-semibold">No transactions archived yet.</p>
                <p className="text-xs text-on-surface-variant/80 mt-1">Add transactions in the dashboard to populate your archive.</p>
              </div>
            ) : (
              recordsList.map((rec) => {
                const isLatestMonth = rec.monthKey === latestMonthKey;
                return (
                  <div 
                    id={`archive-month-card-${rec.monthKey}`}
                    key={rec.monthKey}
                    onClick={() => setSelectedMonthKey(rec.monthKey)}
                    className="bg-surface-container-low hover:bg-surface-container-high transition-all p-4 rounded-2xl flex items-center justify-between group cursor-pointer border border-outline-variant/30 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isLatestMonth 
                          ? 'bg-secondary-container text-on-secondary-container' 
                          : 'bg-surface-variant text-on-surface-variant'
                      }`}>
                        {rec.shortLabel}
                      </div>
                      <div>
                        <p className="font-title-md text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                          {rec.label}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {rec.transactionCount} Transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p className="font-title-lg text-sm md:text-base font-bold text-primary">
                        {formatCurrency(rec.totalOutflow)}
                      </p>
                      <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Historical Insight Chart (Screenshot 2) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-outfit text-sm font-bold text-on-surface px-1 tracking-tight">Historical Insight</h3>
            <span 
              onClick={onNavigateToInsights} 
              className="text-xs text-primary cursor-pointer hover:underline"
            >
              Full Report
            </span>
          </div>

          <div className="bg-surface-container-high/60 p-5 rounded-2xl border border-outline-variant/20 space-y-4">
            {(() => {
              const getLast6MonthsInsight = () => {
                const today = new Date();
                const currentRealMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                const endMonth = latestMonthKey || currentRealMonth;
                
                const [year, month] = endMonth.split('-').map(Number);
                const list = [];
                
                for (let i = 5; i >= 0; i--) {
                  const d = new Date(year, month - 1 - i, 1);
                  const mLabel = d.toLocaleString('en-IN', { month: 'short' });
                  const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  
                  const monthTxs = transactions.filter(t => t.date.startsWith(mKey));
                  const monthExpenses = Math.abs(
                    monthTxs
                      .filter(t => t.amount < 0)
                      .reduce((sum, t) => sum + t.amount, 0)
                  );
                  
                  list.push({
                    label: mLabel,
                    monthKey: mKey,
                    spend: monthExpenses
                  });
                }
                
                const maxSpend = Math.max(...list.map(l => l.spend), 1);
                
                return list.map(l => {
                  const pct = maxSpend > 0 ? Math.max(10, Math.round((l.spend / maxSpend) * 100)) : 10;
                  return {
                    label: l.label,
                    pct,
                    active: l.monthKey === endMonth,
                    spend: l.spend
                  };
                });
              };

              const insightList = getLast6MonthsInsight();
              const peakMonthObj = [...insightList].sort((a, b) => b.spend - a.spend)[0];
              const peakMonthLabel = peakMonthObj && peakMonthObj.spend > 0 ? peakMonthObj.label : 'N/A';
              
              const currentMonthInsightObj = insightList[insightList.length - 1];
              const previousMonthInsightObj = insightList[insightList.length - 2];
              
              let spendingQuote = "No transaction data available yet. Start tracking your daily expenses!";
              if (peakMonthObj && peakMonthObj.spend > 0) {
                if (currentMonthInsightObj && previousMonthInsightObj && previousMonthInsightObj.spend > 0) {
                  const changePct = ((currentMonthInsightObj.spend - previousMonthInsightObj.spend) / previousMonthInsightObj.spend) * 100;
                  if (changePct < 0) {
                    spendingQuote = `Your spending peaked in ${peakMonthLabel}. Since last month, your monthly outflow has decreased by ${Math.abs(Math.round(changePct))}%. Great job on saving!`;
                  } else if (changePct > 0) {
                    spendingQuote = `Your spending peaked in ${peakMonthLabel}. Since last month, your monthly outflow has increased by ${Math.round(changePct)}%. Keep an eye on your budget!`;
                  } else {
                    spendingQuote = `Your spending peaked in ${peakMonthLabel}. Your monthly outflow is stable compared to last month. Keep tracking your expenses!`;
                  }
                } else {
                  spendingQuote = `Your spending peaked in ${peakMonthLabel} with ${formatCurrency(peakMonthObj.spend)} recorded. Keep tracking to see your monthly trends!`;
                }
              }

              return (
                <>
                  <p className="text-xs text-on-surface-variant italic leading-relaxed bg-white/60 p-3 rounded-xl border border-outline-variant/10">
                    "{spendingQuote}"
                  </p>

                  {/* Simple CSS bar chart from screenshot 2 */}
                  <div className="flex items-end justify-between h-36 px-2 gap-3 pt-2">
                    {insightList.map((b, i) => (
                      <div key={i} className="flex flex-col items-center flex-1 gap-1.5">
                        <div className="w-full bg-slate-100 rounded-t-lg h-24 flex items-end">
                          <div 
                            style={{ height: `${b.pct}%` }}
                            className={`w-full rounded-t-lg transition-all duration-700 ${
                              b.active ? 'bg-primary' : 'bg-primary/40'
                            }`}
                          ></div>
                        </div>
                        <span className="text-[10px] font-medium text-on-surface-variant">{b.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </section>

      </div>
    );
  }

  // Group Detail View (Daily Transactions list - Screenshot 3)
  const monthLabel = recordsList.find(r => r.monthKey === selectedMonthKey)?.label || selectedMonthKey;
  const monthTransactions = getSelectedMonthTransactions(selectedMonthKey);
  const activeMonthExpenses = monthTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
  const monthTotalSpent = Math.abs(activeMonthExpenses);

  // Calculate dynamic budget details
  const activeBudgetLimit = Number(budget?.monthlyLimit) || 0;
  const usedPercent = activeBudgetLimit > 0 ? Math.min((monthTotalSpent / activeBudgetLimit) * 100, 100) : 0;
  const budgetLeft = activeBudgetLimit > 0 ? activeBudgetLimit - monthTotalSpent : 0;

  // Apply real-time search and category filter
  const filteredMonthTransactions = monthTransactions.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategoryFilter || t.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group transactions by date
  const groupedTransactions: { [date: string]: Transaction[] } = {};
  filteredMonthTransactions
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(tx => {
      if (!groupedTransactions[tx.date]) {
        groupedTransactions[tx.date] = [];
      }
      groupedTransactions[tx.date].push(tx);
    });

  // Helper to format heading date
  const formatGroupHeaderDate = (dateStr: string) => {
    // format: YYYY-MM-DD to "October 15, 2023"
    const [y, m, d] = dateStr.split('-');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[parseInt(m) - 1]} ${d}, ${y}`;
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      
      {/* Top App Bar Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button 
            id="back-to-archive-list"
            onClick={() => {
              setSelectedMonthKey(null);
              setSearchQuery('');
              setSelectedCategoryFilter(null);
            }}
            className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-primary active:scale-95 duration-100"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-outfit text-lg font-black text-primary tracking-tight">Archive Details</h2>
        </div>

        {/* Export PDF for this selected month */}
        <ExportPDFButton 
          transactions={monthTransactions}
          profile={profile}
          budget={{ ...budget, monthlyLimit: activeBudgetLimit }}
          subscriptions={subscriptions}
        />
      </div>

      {/* Summary Header */}
      <section className="space-y-1">
        <p className="text-on-surface-variant font-outfit text-xs font-bold uppercase tracking-wider">{monthLabel}</p>
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl font-black text-on-surface font-outfit tracking-tight">{formatCurrency(monthTotalSpent)}</h2>
          <span className="text-on-surface-variant text-xs">Total Spent</span>
        </div>
      </section>

      {/* Budget Status Card (Screenshot 3) */}
      {activeBudgetLimit > 0 && (
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-secondary" />
              <span className="font-outfit text-sm font-bold text-on-surface tracking-tight">Monthly Budget</span>
            </div>
            <span className="font-label-lg text-sm font-bold text-secondary">{formatCurrency(activeBudgetLimit)}</span>
          </div>
          
          <div className="space-y-2">
            <div className="w-full bg-surface-variant rounded-full h-2.5 overflow-hidden">
              <div 
                style={{ width: `${usedPercent}%` }}
                className="bg-primary h-full rounded-full transition-all duration-1000"
              ></div>
            </div>
            <div className="flex justify-between text-on-surface-variant font-label-md text-xs font-semibold">
              <span>{Math.round(usedPercent)}% used</span>
              <span>{budgetLeft >= 0 ? `${formatCurrency(budgetLeft)} left` : `${formatCurrency(Math.abs(budgetLeft))} over`}</span>
            </div>
          </div>
        </div>
      )}

      {/* Polished real-time Search and Category Filter section */}
      <div className="space-y-3.5 bg-surface-container-low p-4 rounded-3xl border border-outline-variant/20 shadow-2xs">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-on-surface-variant/75" />
          <input
            id="transaction-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions (e.g. Starbucks, Swiggy)..."
            className="w-full text-xs bg-surface border border-outline/30 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-full py-2.5 pl-10 pr-9 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-hidden transition-all duration-150"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 p-0.5 rounded-full hover:bg-surface-container-high text-on-surface-variant/70 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories horizontal scrollable chips bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
          <button
            onClick={() => setSelectedCategoryFilter(null)}
            className={`px-3.5 py-1.5 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer whitespace-nowrap active:scale-95 duration-100 ${
              !selectedCategoryFilter
                ? 'bg-primary-container text-on-primary-container border-primary-container/20 shadow-2xs'
                : 'bg-surface hover:bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All Logs
          </button>
          {[
            { id: 'Food', label: 'Food', emoji: '🍔' },
            { id: 'Transport', label: 'Transport', emoji: '🚗' },
            { id: 'Rent', label: 'Rent', emoji: '🏠' },
            { id: 'Shopping', label: 'Shopping', emoji: '🛍️' },
            { id: 'Other', label: 'Other', emoji: '📦' },
          ].map((cat) => {
            const isSelected = selectedCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95 duration-100 ${
                  isSelected
                    ? 'bg-primary-container text-on-primary-container border-primary-container/20 shadow-2xs'
                    : 'bg-surface hover:bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transactions Section */}
      <div className="space-y-6">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-12 bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/55 text-on-surface-variant">
            <Calendar className="w-8 h-8 text-outline mx-auto mb-2" />
            {monthTransactions.length > 0 ? (
              <>
                <p className="text-sm font-semibold">No transactions found matching your filter criteria.</p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategoryFilter(null);
                  }}
                  className="mt-3 text-xs bg-primary text-white font-semibold py-1.5 px-4 rounded-full shadow-sm cursor-pointer hover:bg-primary/90 transition-all active:scale-95"
                >
                  Clear Search & Filters
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">No transactions recorded for this month.</p>
                <button 
                  onClick={onAddTransactionClick}
                  className="mt-3 text-xs bg-primary text-white font-semibold py-1.5 px-4 rounded-full shadow-sm cursor-pointer hover:bg-primary/95 transition-all active:scale-95"
                >
                  Add First Transaction
                </button>
              </>
            )}
          </div>
        ) : (
          Object.keys(groupedTransactions).map((dateKey) => (
            <div key={dateKey} className="space-y-2.5">
              <h3 className="font-title-md text-xs font-bold text-on-surface-variant px-1">
                {formatGroupHeaderDate(dateKey)}
              </h3>
              
              <div className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/35 divide-y divide-outline-variant/20 shadow-xs">
                <AnimatePresence initial={false}>
                  {groupedTransactions[dateKey].map((tx) => {
                    const cfg = getCategoryIcon(tx.category);
                    const IconComp = cfg.icon;
                    const isExpense = tx.amount < 0;
                    const isEditing = editingTxId === tx.id;
                    const isSwiped = swipedTxId === tx.id;
                    const canSwipe = selectedMonthKey !== '2023-10' && !isEditing;

                    return (
                      <motion.div
                        key={tx.id}
                        layout
                        initial={{ opacity: 1, height: "auto" }}
                        exit={{ 
                          opacity: 0, 
                          height: 0,
                          overflow: "hidden",
                          transition: {
                            height: { duration: 0.2 },
                            opacity: { duration: 0.1 }
                          }
                        }}
                        onClick={() => {
                          if (!isEditing) {
                            setSelectedTx(tx);
                          }
                        }}
                        className={`relative z-10 flex flex-col p-4 bg-surface-container-lowest hover:bg-surface-container-high transition-colors cursor-pointer group active:bg-surface-container-highest no-parent-drag ${
                          isEditing ? 'bg-surface-container/60 ring-2 ring-primary/20 rounded-xl' : ''
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex flex-col gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col sm:flex-row gap-2.5">
                              {/* Title Input */}
                              <div className="flex-1 flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Title</label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => {
                                    setEditTitle(e.target.value);
                                    setEditError(null);
                                  }}
                                  className="w-full px-3 py-1.5 bg-surface-container border border-outline-variant rounded-xl text-xs font-semibold text-on-surface focus:outline-hidden focus:border-primary transition-colors"
                                  placeholder="Transaction title"
                                  autoFocus
                                />
                              </div>
                              
                              {/* Amount Input */}
                              <div className="w-full sm:w-32 flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Amount (₹)</label>
                                <div className="relative flex items-center">
                                  <span className="absolute left-3 text-xs font-bold text-on-surface-variant">
                                    {editType === 'expense' ? '' : '+'}
                                  </span>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    value={editAmount}
                                    onChange={(e) => {
                                      setEditAmount(e.target.value);
                                      setEditError(null);
                                    }}
                                    className="w-full pl-6 pr-3 py-1.5 bg-surface-container border border-outline-variant rounded-xl text-xs font-mono font-semibold text-on-surface focus:outline-hidden focus:border-primary transition-colors"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>

                              {/* Type Toggle */}
                              <div className="w-full sm:w-36 flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Type</label>
                                <div className="grid grid-cols-2 p-0.5 bg-surface-container border border-outline-variant/60 rounded-xl">
                                  <button
                                    type="button"
                                    onClick={() => setEditType('expense')}
                                    className={`py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                      editType === 'expense'
                                        ? 'bg-error text-on-error shadow-xs'
                                        : 'text-on-surface-variant/80 hover:bg-surface-variant/30'
                                    }`}
                                  >
                                    Expense
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditType('income')}
                                    className={`py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                      editType === 'income'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-on-surface-variant/80 hover:bg-surface-variant/30'
                                    }`}
                                  >
                                    Income
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {editError && (
                              <div className="text-[10px] font-semibold text-error bg-error/10 border border-error/20 py-1 px-2.5 rounded-lg animate-fade-in text-left">
                                ⚠️ {editError}
                              </div>
                            )}

                            {/* Save & Cancel buttons */}
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTxId(null);
                                  setEditError(null);
                                }}
                                className="px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const amt = parseFloat(parseRawAmount(editAmount));
                                  if (!editTitle.trim()) {
                                    setEditError('Title cannot be empty.');
                                    return;
                                  }
                                  if (isNaN(amt) || amt <= 0) {
                                    setEditError('Please enter a valid positive number.');
                                    return;
                                  }
                                  onUpdateTransaction(tx.id, {
                                    title: editTitle.trim(),
                                    amount: editType === 'expense' ? -amt : amt
                                  });
                                  setEditingTxId(null);
                                  setEditError(null);
                                }}
                                className="px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-on-primary text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${cfg.bg} shadow-sm`}>
                                <IconComp className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-title-md text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                                  {tx.title}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span className="text-xs text-on-surface-variant">
                                    {tx.category} • {tx.time}
                                  </span>
                                  {tx.tags && tx.tags.map((t) => (
                                    <span key={t} className="text-[9px] px-1.5 py-0.5 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-md font-medium">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="font-title-md text-sm font-semibold text-on-surface">
                                  {isExpense ? '' : '+'}{formatCurrency(Math.abs(tx.amount))}
                                </p>
                                {tx.originalCurrency && tx.originalAmount && (
                                  <p className="text-[9px] text-purple-400 font-medium">
                                    ({tx.originalCurrency} {tx.originalAmount})
                                  </p>
                                )}
                                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                                  {tx.label}
                                </p>
                              </div>
                              
                              {/* Inline Actions Group */}
                              {selectedMonthKey !== '2023-10' && (
                                <div className="flex items-center gap-1 pl-1.5 border-l border-outline-variant/30 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingTxId(tx.id);
                                      setEditTitle(tx.title);
                                      setEditAmount(String(Math.abs(tx.amount)));
                                      setEditType(tx.amount < 0 ? 'expense' : 'income');
                                    }}
                                    title="Edit inline"
                                    className="p-1.5 rounded-lg text-primary hover:bg-primary-container dark:hover:bg-inverse-surface/10 transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTxToDelete(tx);
                                    }}
                                    title="Delete Transaction"
                                    className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
      </div>



      {/* Transaction Detail Bottom Sheet Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div 
            onClick={() => setSelectedTx(null)}
            className="absolute inset-0"
          ></div>
          <div className="relative w-full sm:max-w-md bg-surface-container-lowest rounded-t-3xl sm:rounded-2xl border border-outline-variant/50 shadow-2xl p-6 space-y-6 z-10 animate-slide-up sm:animate-scale-up">
            
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Transaction Detail
              </h4>
              <button 
                id="close-history-detail"
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-full hover:bg-surface-container-high transition-colors"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            {/* Payee Amount Section */}
            <div className="text-center py-4 bg-surface-container-low rounded-2xl border border-outline-variant/30">
              <p className="text-xs text-on-surface-variant uppercase font-semibold tracking-wider">
                {selectedTx.title}
              </p>
              <p className={`text-3xl font-extrabold mt-1 ${selectedTx.amount < 0 ? 'text-on-surface' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {selectedTx.amount < 0 ? '' : '+'}{formatCurrency(Math.abs(selectedTx.amount))}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-surface-variant rounded-full text-xs font-semibold text-on-surface-variant">
                <span>{selectedTx.category}</span>
                <span>•</span>
                <span>{selectedTx.label}</span>
              </div>
            </div>

            {/* Details Fields */}
            <div className="space-y-3.5 text-sm">
              <div className="flex items-center gap-3 text-on-surface-variant">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-semibold text-on-surface w-20">Date:</span>
                <span>{formatFullDate(selectedTx.date)}</span>
              </div>
              <div className="flex items-center gap-3 text-on-surface-variant">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-semibold text-on-surface w-20">Time:</span>
                <span>{selectedTx.time}</span>
              </div>
              {selectedTx.notes && (
                <div className="flex items-start gap-3 text-on-surface-variant border-t border-outline-variant/20 pt-3">
                  <FileText className="w-4 h-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold text-on-surface block mb-1">Notes:</span>
                    <p className="text-xs leading-relaxed text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/20">
                      {selectedTx.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {/* If it is standard seed transactions of 2023, do not allow delete to avoid mutation of mock module. Only permit deletion for custom state transactions */}
            <div className="flex items-center gap-2 pt-2">
              {selectedMonthKey !== '2023-10' && (
                <button 
                  id="history-delete-tx"
                  onClick={() => {
                    setTxToDelete(selectedTx);
                  }}
                  className="flex-1 py-2.5 px-4 bg-error-container text-on-error-container hover:bg-error/15 border border-error/20 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Transaction
                </button>
              )}
              <button 
                id="close-history-modal"
                onClick={() => setSelectedTx(null)}
                className="py-2.5 px-6 bg-surface-container-high hover:bg-surface-container-highest rounded-full text-xs font-semibold text-on-surface transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog for Deletion */}
      <AnimatePresence>
        {txToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-surface-container rounded-3xl p-6 max-w-sm w-full border border-outline-variant/30 shadow-2xl text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-error" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-base text-on-surface">Delete Transaction?</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Are you sure you want to delete <strong className="font-semibold text-on-surface">"{txToDelete.title}"</strong>? This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => setTxToDelete(null)}
                  className="flex-1 py-2 rounded-full bg-surface-container-highest hover:bg-surface-variant/40 text-on-surface text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteTransaction(txToDelete.id);
                    setTxToDelete(null);
                    if (selectedTx && selectedTx.id === txToDelete.id) {
                      setSelectedTx(null);
                    }
                  }}
                  className="flex-1 py-2 rounded-full bg-error text-on-error hover:bg-error/90 text-xs font-black cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
