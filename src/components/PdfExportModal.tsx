import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Download, Sparkles, CheckCircle2, ShieldCheck, Printer, Table, FileSpreadsheet, Calendar, Filter } from 'lucide-react';
import { Transaction, BudgetConfig, UserProfile, Subscription, SavingsGoal } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  budget: BudgetConfig;
  profile: UserProfile;
  subscriptions?: Subscription[];
  savingsGoals?: SavingsGoal[];
}

type TimeframeType = 'current_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'ytd' | 'all_time' | 'custom';

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  transactions = [],
  budget,
  profile,
  subscriptions = [],
  savingsGoals = []
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  const [timeframe, setTimeframe] = useState<TimeframeType>('current_month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(todayStr);

  const currency = budget?.currency || 'INR';

  // Compute Filtered Transactions based on selected Timeframe - UNCONDITIONAL HOOK
  const filteredTxs = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter(t => {
      if (!t || !t.date) return false;
      const txDate = new Date(t.date);

      if (timeframe === 'current_month') {
        return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
      }
      if (timeframe === 'last_month') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return txDate.getFullYear() === lastMonthDate.getFullYear() && txDate.getMonth() === lastMonthDate.getMonth();
      }
      if (timeframe === 'last_3_months') {
        const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);
        return txDate >= threeMonthsAgo && txDate <= now;
      }
      if (timeframe === 'last_6_months') {
        const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);
        return txDate >= sixMonthsAgo && txDate <= now;
      }
      if (timeframe === 'ytd') {
        const startOfYear = new Date(currentYear, 0, 1);
        return txDate >= startOfYear && txDate <= now;
      }
      if (timeframe === 'all_time') {
        return true;
      }
      if (timeframe === 'custom') {
        if (!startDate || !endDate) return true;
        return t.date >= startDate && t.date <= endDate;
      }
      return true;
    });
  }, [transactions, timeframe, startDate, endDate]);

  const totalExpenses = useMemo(() => {
    return Math.abs(filteredTxs.filter(t => Number(t.amount) < 0).reduce((sum, t) => sum + (Number(t.amount) || 0), 0));
  }, [filteredTxs]);

  const totalIncome = useMemo(() => {
    return filteredTxs.filter(t => Number(t.amount) > 0).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [filteredTxs]);

  const netSavings = totalIncome - totalExpenses;

  // Label for active timeframe - UNCONDITIONAL HOOK
  const timeframeLabel = useMemo(() => {
    if (timeframe === 'current_month') return today.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    if (timeframe === 'last_month') {
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return lm.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    }
    if (timeframe === 'last_3_months') return 'Last 3 Months';
    if (timeframe === 'last_6_months') return 'Last 6 Months';
    if (timeframe === 'ytd') return `Year-to-Date ${today.getFullYear()}`;
    if (timeframe === 'all_time') return 'All Time History';
    if (timeframe === 'custom') return `${startDate} to ${endDate}`;
    return 'Selected Range';
  }, [timeframe, startDate, endDate, today]);

  // Early return ONLY AFTER all hooks have executed unconditionally
  if (!isOpen) return null;

  // Export CSV Statement
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['Date', 'Time', 'Title', 'Category', 'Amount', 'Currency', 'Notes'];
      const rows = filteredTxs.map(t => [
        t.date,
        t.time || '',
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.category,
        t.amount,
        currency,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SpendTrack_Statement_${timeframe}_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccess(`CSV Statement (${filteredTxs.length} records) downloaded successfully!`);
      setTimeout(() => setExportSuccess(null), 3500);
    } catch (err) {
      console.error('CSV Export Error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Generate & Download HTML/PDF Audit Report (mobile-compatible)
  const handleGeneratePdfAudit = () => {
    setIsExporting(true);
    try {
      const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>SpendTrack Financial Audit Report - ${profile?.name || 'User'}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 800; color: #6366f1; }
            .title { font-size: 14px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
            .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 8px; }
            .card-val { font-size: 22px; font-weight: 800; color: #0f172a; }
            .card-val.income { color: #10b981; }
            .card-val.expense { color: #ef4444; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f1f5f9; text-align: left; padding: 12px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
            td { padding: 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .amount.negative { color: #ef4444; font-weight: 700; }
            .amount.positive { color: #10b981; font-weight: 700; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">SpendTrack Financial Audit</div>
              <div class="title">Statement Period: ${timeframeLabel}</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              <div>Prepared for: <strong>${profile?.name || 'Valued User'}</strong></div>
              <div>Generated on: ${today.toLocaleDateString('en-IN')}</div>
              <div>Total Records: ${filteredTxs.length}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Total Outflows</div>
              <div class="card-val expense">${formatCurrency(totalExpenses, currency)}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Inflows</div>
              <div class="card-val income">${formatCurrency(totalIncome, currency)}</div>
            </div>
            <div class="card">
              <div class="card-title">Net Surplus</div>
              <div class="card-val">${formatCurrency(netSavings, currency)}</div>
            </div>
          </div>

          <h3>Ledger Activity (${filteredTxs.length} Transactions)</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th style="text-align: right;">Amount (${currency})</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTxs.map(t => `
                <tr>
                  <td>${t.date}</td>
                  <td><strong>${t.title}</strong></td>
                  <td>${t.category}</td>
                  <td style="text-align: right;" class="amount ${t.amount < 0 ? 'negative' : 'positive'}">
                    ${t.amount < 0 ? '-' : '+'}${formatCurrency(Math.abs(t.amount), currency)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Generated automatically by SpendTrack Audit Engine • Confidential Financial Summary
          </div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
        </html>
      `;

      // Mobile-compatible download: Blob → object URL → anchor click
      const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const fileName = `SpendTrack_Audit_${profile?.name?.replace(/\s+/g, '_') || 'Report'}_${today.toISOString().slice(0, 10)}.html`;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 1000);

      setExportSuccess(`Audit Report (${filteredTxs.length} transactions) downloaded!`);
      setTimeout(() => setExportSuccess(null), 3500);
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div 
        onClick={onClose}
        className="absolute inset-0 cursor-pointer"
      ></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-3xl shadow-2xl p-6 space-y-5 z-10 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-on-surface">Export Financial Audit Report</h3>
              <p className="text-[11px] text-on-surface-variant">Select custom time frame for PDF or CSV export</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeframe Selector Section */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 px-0.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            Select Statement Time Frame
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'current_month', label: 'Current Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'last_3_months', label: 'Last 3 Months' },
              { id: 'last_6_months', label: 'Last 6 Months' },
              { id: 'ytd', label: 'Year to Date' },
              { id: 'all_time', label: 'All Time' },
            ].map(tf => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id as TimeframeType)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  timeframe === tf.id 
                    ? 'bg-primary text-white border-primary shadow-xs' 
                    : 'bg-surface-container-high border-outline-variant/30 text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setTimeframe('custom')}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
              timeframe === 'custom'
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-surface-container-high border-outline-variant/30 text-on-surface hover:bg-surface-container-highest'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Custom Date Range</span>
          </button>

          {/* Custom Date Pickers */}
          {timeframe === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-2 p-3 bg-surface-container/50 border border-outline-variant/30 rounded-2xl animate-fade-in">
              <div>
                <label className="text-[9px] font-bold text-on-surface-variant block mb-1">Start Date</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-primary font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-on-surface-variant block mb-1">End Date</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-primary font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Filter Summary Preview Box */}
        <div className="p-4 bg-surface-container border border-outline-variant/30 rounded-2xl space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant font-medium">Selected Period</span>
            <span className="font-mono font-bold text-primary">{timeframeLabel}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/15 text-xs text-center">
            <div>
              <span className="text-[9px] text-on-surface-variant block">Outflows</span>
              <span className="font-mono font-bold text-error text-xs">{formatCurrency(totalExpenses, currency)}</span>
            </div>
            <div>
              <span className="text-[9px] text-on-surface-variant block">Inflows</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">{formatCurrency(totalIncome, currency)}</span>
            </div>
            <div>
              <span className="text-[9px] text-on-surface-variant block">Records</span>
              <span className="font-mono font-bold text-on-surface text-xs">{filteredTxs.length} items</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleGeneratePdfAudit}
            disabled={isExporting || filteredTxs.length === 0}
            className="w-full p-3.5 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>Generate PDF Audit Report ({filteredTxs.length} items)</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={isExporting || filteredTxs.length === 0}
            className="w-full p-3.5 bg-surface-container-high border border-outline-variant/40 hover:bg-surface-container-highest disabled:opacity-50 text-on-surface rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Download CSV Statement ({filteredTxs.length} items)</span>
          </button>
        </div>

        {exportSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};
