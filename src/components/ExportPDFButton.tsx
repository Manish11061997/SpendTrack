import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { 
  FileDown, 
  Loader2, 
  Check, 
  AlertCircle,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  CreditCard,
  Hash
} from 'lucide-react';
import { Transaction, UserProfile, BudgetConfig, Subscription } from '../types';

interface ExportPDFButtonProps {
  transactions: Transaction[];
  profile: UserProfile;
  budget: BudgetConfig;
  subscriptions: Subscription[];
}

export default function ExportPDFButton({ 
  transactions, 
  profile, 
  budget, 
  subscriptions 
}: ExportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  // Date Range Picker State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const lastTxCountRef = useRef(transactions.length);

  React.useEffect(() => {
    if (transactions.length > 0) {
      if (!startDate || !endDate || lastTxCountRef.current !== transactions.length) {
        const sorted = [...transactions].map(t => t.date).sort();
        setStartDate(sorted[0]);
        setEndDate(sorted[sorted.length - 1]);
        lastTxCountRef.current = transactions.length;
      }
    }
  }, [transactions]);

  // Derived filtered transactions based on custom date range picker selection
  const filteredTransactions = transactions.filter(t => {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  const handlePreset = (preset: 'all' | 'this-month' | 'last-30' | 'last-90') => {
    const sorted = [...transactions].map(t => t.date).sort();
    if (preset === 'all') {
      setStartDate(sorted[0] || '');
      setEndDate(sorted[sorted.length - 1] || '');
    } else if (preset === 'this-month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'last-30') {
      const now = new Date();
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      setStartDate(past30);
      setEndDate(today);
    } else if (preset === 'last-90') {
      const now = new Date();
      const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      setStartDate(past90);
      setEndDate(today);
    }
  };

  const isPresetActive = (preset: 'all' | 'this-month' | 'last-30' | 'last-90') => {
    const sorted = [...transactions].map(t => t.date).sort();
    if (preset === 'all') {
      return startDate === (sorted[0] || '') && endDate === (sorted[sorted.length - 1] || '');
    }
    const now = new Date();
    if (preset === 'this-month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      return startDate === firstDay && endDate === lastDay;
    }
    if (preset === 'last-30') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      return startDate === past30 && endDate === today;
    }
    if (preset === 'last-90') {
      const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      return startDate === past90 && endDate === today;
    }
    return false;
  };

  // Helper to format currency consistently in INR
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Calculations
  const totalInflow = filteredTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = Math.abs(
    filteredTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const activeSubsCost = subscriptions
    .filter(s => s.isActive)
    .reduce((sum, s) => sum + s.amount, 0);

  // Grand total outflows include active subscription recurring commitments
  const grandTotalOutflow = totalOutflow + activeSubsCost;
  const netBalance = totalInflow - grandTotalOutflow;

  // Budget progress
  const monthlyLimit = budget.monthlyLimit || 50000;
  const budgetProgressPercent = Math.min(Math.round((grandTotalOutflow / monthlyLimit) * 100), 100);
  const budgetRemaining = Math.max(monthlyLimit - grandTotalOutflow, 0);

  // Category sharing
  const categories: ('Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other')[] = [
    'Food',
    'Transport',
    'Rent',
    'Shopping',
    'Other'
  ];

  const categoryTotals = categories.map(cat => {
    const txTotal = Math.abs(
      filteredTransactions
        .filter(t => t.amount < 0 && t.category === cat)
        .reduce((sum, t) => sum + t.amount, 0)
    );
    const subTotal = subscriptions
      .filter(s => s.isActive && s.category === cat)
      .reduce((sum, s) => sum + s.amount, 0);
    
    return {
      name: cat,
      total: txTotal + subTotal
    };
  });

  const grandExpenseCategoriesTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0) || 1;

  const categoryShares = categoryTotals.map(ct => ({
    ...ct,
    percentage: Math.round((ct.total / grandExpenseCategoriesTotal) * 100)
  })).sort((a, b) => b.total - a.total);

  // Get date range of transactions
  const getDateRangeLabel = () => {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)} — ${formatDate(endDate)}`;
    } else if (startDate) {
      return `From ${formatDate(startDate)}`;
    } else if (endDate) {
      return `Until ${formatDate(endDate)}`;
    }
    
    if (filteredTransactions.length === 0) {
      return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    const sortedDates = [...filteredTransactions].map(t => t.date).sort();
    return `${formatDate(sortedDates[0])} — ${formatDate(sortedDates[sortedDates.length - 1])}`;
  };

  // Divide transactions into pages of ledger table
  // Page 1 is the Visual Dashboard. Page 2+ contains the Ledger.
  // We can fit roughly 18 transactions per ledger page cleanly.
  const transactionsPerPage = 18;
  const transactionChunks: Transaction[][] = [];
  const sortedTransactionsForLedger = [...filteredTransactions].sort((a, b) => b.date.localeCompare(a.date));

  for (let i = 0; i < sortedTransactionsForLedger.length; i += transactionsPerPage) {
    transactionChunks.push(sortedTransactionsForLedger.slice(i, i + transactionsPerPage));
  }

  // If no transactions, add an empty chunk so we still render 1 ledger page
  if (transactionChunks.length === 0) {
    transactionChunks.push([]);
  }

  const totalPdfPages = 1 + transactionChunks.length;

  const handleExportPDF = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setIsSuccess(false);
    setError('');
    setStatusMessage('Preparing statement layout...');

    try {
      // Create jsPDF instance
      // Standard A4 portrait: 210mm x 297mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Capture Page 1: Dashboard
      setStatusMessage('Generating Executive Dashboard (Page 1 of ' + totalPdfPages + ')...');
      await new Promise((resolve) => setTimeout(resolve, 300)); // allow layout to stabilize

      const page1Element = document.getElementById('pdf-page-1');
      if (!page1Element) throw new Error('Cover page element not found.');

      const canvas1 = await html2canvas(page1Element, {
        scale: 2, // High resolution crisp text and vectors
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
      // Fit to A4 height/width
      pdf.addImage(imgData1, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      // Capture subsequent transaction chunk pages
      for (let index = 0; index < transactionChunks.length; index++) {
        const pageNum = index + 2;
        setStatusMessage(`Rendering Transaction Ledger (Page ${pageNum} of ${totalPdfPages})...`);
        
        pdf.addPage();
        
        const pageElement = document.getElementById(`pdf-page-${pageNum}`);
        if (!pageElement) continue;

        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      // Save PDF file
      setStatusMessage('Saving document...');
      const fileName = `SpendTrack_Statement_${profile.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
      
      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });
        await Share.share({
          title: 'SpendTrack Financial Statement',
          text: `Financial statement from ${startDate || 'start'} to ${endDate || 'end'}.`,
          url: result.uri,
          dialogTitle: 'Save or Share Statement'
        });
      } else {
        pdf.save(fileName);
      }

      setIsSuccess(true);
      setStatusMessage('Report exported successfully!');
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Date Range Selection Panel */}
      <div className="bg-surface-container-low border border-outline-variant/25 rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center gap-2 text-primary">
          <Calendar className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">Statement Period Range</h4>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Start Date */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          
          {/* End Date */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => handlePreset('all')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              isPresetActive('all')
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container border border-outline-variant/35 text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            All Time
          </button>
          <button
            type="button"
            onClick={() => handlePreset('this-month')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              isPresetActive('this-month')
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container border border-outline-variant/35 text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => handlePreset('last-30')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              isPresetActive('last-30')
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container border border-outline-variant/35 text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => handlePreset('last-90')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              isPresetActive('last-90')
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container border border-outline-variant/35 text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Last 90 Days
          </button>
        </div>
      </div>

      {/* UI Trigger Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          id="export-pdf-report-trigger-btn"
          type="button"
          disabled={isGenerating}
          onClick={handleExportPDF}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer border ${
            isGenerating 
              ? 'bg-surface-container-high text-on-surface-variant border-outline-variant/30 cursor-not-allowed'
              : isSuccess
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
              : 'bg-primary text-on-primary hover:bg-primary/95 border-primary/20'
          }`}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />
          ) : isSuccess ? (
            <Check className="w-4 h-4 text-white" />
          ) : (
            <FileDown className="w-4 h-4 text-on-primary" />
          )}
          <span>{isGenerating ? 'Exporting PDF...' : isSuccess ? 'Statement Exported!' : 'Export PDF Statement'}</span>
        </button>

        {/* Dynamic status/error indicator */}
        {(isGenerating || error) && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-low border border-outline-variant/20 rounded-xl">
            {isGenerating ? (
              <span className="text-[10px] font-medium text-on-surface-variant animate-pulse font-mono">
                {statusMessage}
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-error flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        PDF TEMPLATE CONTAINER
        ========================================================================
        We position this absolutely off-screen so it gets fully drawn on the DOM
        for html2canvas, but is completely invisible to the actual UI.
        We style it with high-contrast, beautiful print aesthetics.
      */}
      <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none select-none" ref={reportRef}>
        
        {/* ==================== PAGE 1: EXECUTIVE FINANCIAL DASHBOARD ==================== */}
        <div 
          id="pdf-page-1" 
          className="w-[800px] h-[1130px] bg-white text-slate-800 p-10 flex flex-col justify-between relative font-sans"
          style={{ boxSizing: 'border-box' }}
        >
          {/* Cover Watermark/Decorative Lines */}
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-teal-600 via-indigo-600 to-purple-600" />
          
          <div className="space-y-8">
            
            {/* Header Block */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-600">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <PiggyBank className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-indigo-950">SpendTrack</h1>
                    <p className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">Financial Intelligence</p>
                  </div>
                </div>
              </div>
              <div className="text-right space-y-1">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Official Statement
                </span>
                <p className="text-[11px] font-semibold text-slate-500 mt-1">
                  Report ID: ST-{Math.floor(100000 + Math.random() * 900000)}
                </p>
              </div>
            </div>

            {/* Account Metadata Grid */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Prepared For</h4>
                  <p className="text-sm font-bold text-slate-800">{profile.name}</p>
                  <p className="text-[11px] font-semibold text-slate-500 font-mono">{profile.email}</p>
                </div>
                <div>
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Account Tier</h4>
                  <p className="text-[11px] font-semibold text-teal-600 flex items-center gap-1">
                    <span>● Verified Sandbox User Ledger</span>
                  </p>
                </div>
              </div>
              <div className="space-y-3 text-right">
                <div>
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Statement Period</h4>
                  <p className="text-xs font-bold text-slate-700">{getDateRangeLabel()}</p>
                </div>
                <div>
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Generated Date</h4>
                  <p className="text-xs font-semibold text-slate-600">
                    {new Date().toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Performance Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary border-l-2 border-primary pl-2 font-serif">
                Executive Balance Summary
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                
                {/* Total Income */}
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col justify-between h-24">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Total Inflow</span>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-primary font-mono">{formatINR(totalInflow)}</h2>
                    <p className="text-[9px] font-medium text-primary/70">Active credit streams</p>
                  </div>
                </div>

                {/* Total Expense */}
                <div className="bg-secondary/5 border border-secondary/10 rounded-xl p-4 flex flex-col justify-between h-24">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wide">Total Outflow</span>
                    <TrendingDown className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-secondary font-mono">{formatINR(grandTotalOutflow)}</h2>
                    <p className="text-[9px] font-medium text-secondary/70">Commitments + expenses</p>
                  </div>
                </div>

                {/* Net Savings */}
                <div className={`rounded-xl p-4 border flex flex-col justify-between h-24 ${
                  netBalance >= 0 
                    ? 'bg-primary/10 border-primary/20' 
                    : 'bg-error-container/30 border-error-container/40'
                }`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${
                      netBalance >= 0 ? 'text-primary' : 'text-error'
                    }`}>Net Position</span>
                    <Wallet className={`w-4 h-4 ${netBalance >= 0 ? 'text-primary' : 'text-error'}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-black font-mono ${
                      netBalance >= 0 ? 'text-primary' : 'text-error'
                    }`}>{formatINR(netBalance)}</h2>
                    <p className="text-[9px] font-medium text-slate-500">Unspent surplus amount</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Budget Performance Meter */}
            <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-700 font-serif">Monthly Spending Limit Indicator</span>
                  <span className="text-[10px] text-slate-400 ml-2 font-mono">Limit: {formatINR(monthlyLimit)}</span>
                </div>
                <span className={`font-bold font-mono ${
                  budgetProgressPercent >= 90 ? 'text-error' : 'text-primary'
                }`}>
                  {budgetProgressPercent}% Used
                </span>
              </div>
              
              <div className="w-full h-3 bg-slate-200/60 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    budgetProgressPercent >= 90 
                      ? 'bg-error' 
                      : budgetProgressPercent >= 75 
                      ? 'bg-secondary' 
                      : 'bg-primary'
                  }`}
                  style={{ width: `${budgetProgressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                <span>Spent: {formatINR(grandTotalOutflow)}</span>
                <span>Remaining: {formatINR(budgetRemaining)}</span>
              </div>
            </div>

            {/* Analytics Dashboard (Category Share Progress bars) */}
            <div className="grid grid-cols-2 gap-6">
              
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary border-l-2 border-primary pl-2 font-serif">
                  Outflow by Category
                </h3>
                
                {/* Horizontal custom bar charts (Safe for html2canvas rendering) */}
                <div className="space-y-3 border border-slate-200/60 rounded-2xl p-4 bg-white shadow-xs">
                  {categoryShares.map((share, idx) => {
                    const barColor = 
                      share.name === 'Food' ? 'bg-primary' :
                      share.name === 'Transport' ? 'bg-secondary' :
                      share.name === 'Rent' ? 'bg-tertiary' :
                      share.name === 'Shopping' ? 'bg-primary/70' :
                      'bg-secondary/70';

                    const dotColor = 
                      share.name === 'Food' ? 'bg-primary' :
                      share.name === 'Transport' ? 'bg-secondary' :
                      share.name === 'Rent' ? 'bg-tertiary' :
                      share.name === 'Shopping' ? 'bg-primary/70' :
                      'bg-secondary/70';

                    return (
                      <div key={share.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                            <span>{share.name}</span>
                          </div>
                          <span className="font-mono text-slate-500 font-semibold">
                            {formatINR(share.total)} ({share.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${share.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recurring Committments */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-900 border-l-2 border-indigo-600 pl-2">
                  Active Recurring Subscriptions
                </h3>
                
                <div className="border border-slate-200/60 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200/60 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {subscriptions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-400 text-[10px]">
                            No subscription commitments recorded.
                          </td>
                        </tr>
                      ) : (
                        subscriptions.slice(0, 5).map(sub => (
                          <tr key={sub.id}>
                            <td className="py-2.5 px-3 font-bold text-slate-800">{sub.title}</td>
                            <td className="py-2.5 px-3 text-slate-400 text-[10px]">Day {sub.billingDate} of month</td>
                            <td className="py-2.5 px-3 text-right text-slate-900 font-mono font-bold">
                              {formatINR(sub.amount)}/mo
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {subscriptions.length > 5 && (
                    <div className="p-2 bg-slate-50 text-[9px] text-center text-indigo-600 font-bold border-t border-slate-100">
                      + {subscriptions.length - 5} more subscription commitments active
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Page 1 Footer */}
          <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Powered by SpendTrack Sandbox engine</span>
            <span>Page 1 of {totalPdfPages}</span>
          </div>
        </div>

        {/* ==================== PAGES 2+: CHRONOLOGICAL TRANSACTION LEDGER ==================== */}
        {transactionChunks.map((chunk, index) => {
          const pageNum = index + 2;
          return (
            <div 
              key={pageNum}
              id={`pdf-page-${pageNum}`} 
              className="w-[800px] h-[1130px] bg-white text-slate-800 p-10 flex flex-col justify-between relative font-sans"
              style={{ boxSizing: 'border-box' }}
            >
              <div className="absolute top-0 left-0 w-full h-3 bg-indigo-600" />

              <div className="space-y-6">
                
                {/* Minimal Header */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-1.5 text-indigo-600">
                    <PiggyBank className="w-5 h-5" />
                    <span className="font-extrabold text-sm text-indigo-950">SpendTrack Transaction Ledger</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Statement Period: {getDateRangeLabel()}
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-950 border-l-2 border-indigo-600 pl-2">
                    Ledger Account History (Page {pageNum - 1} of {transactionChunks.length})
                  </h3>

                  {/* Transaction Table */}
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Classification</th>
                          <th className="py-3 px-4 text-right">Amount (INR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {chunk.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-semibold">
                              No financial transactions recorded in ledger.
                            </td>
                          </tr>
                        ) : (
                          chunk.map(tx => {
                            const isIncome = tx.amount > 0;
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">
                                  {new Date(tx.date).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                  <span className="block text-[8px] text-slate-400/80">{tx.time}</span>
                                </td>
                                <td className="py-2.5 px-4 font-bold text-slate-800">
                                  {tx.title}
                                  {tx.notes && (
                                    <span className="block font-normal text-[9px] text-slate-400 italic">
                                      {tx.notes}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    tx.category === 'Food' ? 'bg-primary/10 text-primary' :
                                    tx.category === 'Transport' ? 'bg-secondary/10 text-secondary' :
                                    tx.category === 'Rent' ? 'bg-tertiary/10 text-tertiary' :
                                    tx.category === 'Shopping' ? 'bg-primary/15 text-primary' :
                                    'bg-secondary/15 text-secondary'
                                  }`}>
                                    {tx.category}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-[10px] font-semibold text-slate-500">
                                  {tx.label}
                                </td>
                                <td className={`py-2.5 px-4 text-right font-mono font-bold text-xs ${
                                  isIncome ? 'text-emerald-600' : 'text-slate-800'
                                }`}>
                                  {isIncome ? '+' : '-'}{formatINR(Math.abs(tx.amount))}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Page Footer */}
              <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Verified Transaction Ledger Statement</span>
                <span>Page {pageNum} of {totalPdfPages}</span>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
