import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Transaction, BudgetConfig } from '../types';
import { formatCurrency, getCurrencySymbol, formatInputAmount, parseRawAmount } from '../utils/currency';
import { parseReceiptWithAI } from '../utils/aiReceiptParser';
import { parseVoiceTranscript } from '../utils/voiceParser';
import { SUPPORTED_CURRENCIES, convertCurrency } from '../utils/currencyConverter';
import { triggerHaptic } from '../utils/haptics';
import { 
  ArrowLeft, 
  Utensils, 
  Car, 
  Home as HomeIcon, 
  ShoppingBag, 
  MoreHorizontal, 
  Calendar, 
  Receipt, 
  Check, 
  PiggyBank,
  Sparkles,
  X,
  Tag,
  Globe,
  Scissors,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';

interface AddTransactionFormProps {
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
  budget: BudgetConfig;
  transactions?: Transaction[];
}

export default function AddTransactionForm({ onSave, onCancel, budget, transactions = [] }: AddTransactionFormProps) {
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>(budget?.currency || 'INR');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other'>('Food');
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [label, setLabel] = useState<'Personal' | 'Work' | 'Freelance' | 'Subscription' | 'General'>('Personal');
  const [notes, setNotes] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState<boolean>(false);

  // Custom Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');

  // Split Expense
  const [isSplit, setIsSplit] = useState<boolean>(false);
  const [splits, setSplits] = useState<{ category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other'; amount: number }[]>([
    { category: 'Food', amount: 0 },
    { category: 'Shopping', amount: 0 },
  ]);

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/,/g, '');
    setError(null);
    if (rawVal === '' || /^\d*(\.\d{0,2})?$/.test(rawVal)) {
      setAmount(rawVal);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setReceiptFile(file);
      
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          setReceiptPreview(compressedBase64);
          setError(null);

          // AI OCR Scan Trigger
          setIsScanningReceipt(true);
          try {
            const parsed = await parseReceiptWithAI(compressedBase64);
            if (parsed.merchantName) setTitle(parsed.merchantName);
            if (parsed.totalAmount) setAmount(parsed.totalAmount.toString());
            if (parsed.date) setDate(parsed.date);
            if (parsed.category) setCategory(parsed.category);
            if (parsed.suggestedNotes) setNotes(parsed.suggestedNotes);
          } catch (err) {
            console.error(err);
          } finally {
            setIsScanningReceipt(false);
          }
        } else {
          setError('Failed to process receipt image.');
        }
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        setError('Failed to load image file.');
        URL.revokeObjectURL(img.src);
      };
    } else {
      setError('Please upload an image file (PNG, JPG).');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanningReceipt(true);
      setError('');
      const base64Str = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      setReceiptPreview(base64Str);

      const parsed = await parseReceiptWithAI(base64Str);
      if (parsed.merchantName) setTitle(parsed.merchantName);
      if (parsed.totalAmount) setAmount(parsed.totalAmount.toString());
      if (parsed.category) setCategory(parsed.category as any);
    } catch (err: any) {
      console.error("Receipt upload scan error:", err);
    } finally {
      setIsScanningReceipt(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !tags.includes('#' + val)) {
        setTags([...tags, '#' + val]);
        setTagInput('');
      }
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanAmtStr = parseRawAmount(amount);
    if (!cleanAmtStr || parseFloat(cleanAmtStr) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a description or title.');
      return;
    }

    setIsSubmitting(true);

    const baseCurrency = budget?.currency || 'INR';
    const rawNum = parseFloat(cleanAmtStr);
    const convertedAmount = convertCurrency(rawNum, selectedCurrency, baseCurrency);

    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeString = `${hours}:${minutes} ${ampm}`;

    const txData: any = {
      title: title.trim(),
      category,
      amount: txType === 'expense' ? -convertedAmount : convertedAmount,
      date,
      time: timeString,
      label,
      notes: notes.trim(),
      tags,
    };

    if (isSplit && splits) txData.splits = splits;
    if (selectedCurrency !== baseCurrency) {
      txData.originalCurrency = selectedCurrency;
      txData.originalAmount = rawNum;
    }
    if (receiptPreview) {
      txData.receiptUrl = receiptPreview;
    }

    // Double-check no undefined values are present
    Object.keys(txData).forEach(key => {
      if (txData[key] === undefined) delete txData[key];
    });

    triggerHaptic('success');
    onSave(txData);
  };

  const categories = [
    { name: 'Food' as const, icon: Utensils, label: 'Food' },
    { name: 'Transport' as const, icon: Car, label: 'Transport' },
    { name: 'Rent' as const, icon: HomeIcon, label: 'Rent' },
    { name: 'Shopping' as const, icon: ShoppingBag, label: 'Shopping' },
    { name: 'Other' as const, icon: MoreHorizontal, label: 'Other' },
  ];

  const labels = [
    { name: 'Personal' as const, text: 'Personal' },
    { name: 'Work' as const, text: 'Business / Work' },
    { name: 'Freelance' as const, text: 'Freelance' },
    { name: 'Subscription' as const, text: 'Subscription' },
    { name: 'General' as const, text: 'General' }
  ];

  return (
    <motion.div 
      id="add-transaction-view"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="bg-background text-on-surface h-full w-full flex flex-col font-body-md overflow-y-auto"
      style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } as React.CSSProperties}
    >
      {/* Top App Bar */}
      <header className="sticky-form-header flex items-center gap-3 px-4 w-full h-14 bg-surface/80 backdrop-blur-md border-b border-outline-variant/20 sticky top-0 z-50">
        <button 
          id="back-from-add-form"
          onClick={onCancel}
          aria-label="Back" 
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors active:scale-95 duration-100"
        >
          <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
        </button>
        <h1 className="font-outfit font-black text-lg text-on-surface tracking-tight">Add Transaction</h1>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4 md:p-6 space-y-6 pb-32">
        {error && (
          <div className="p-4 rounded-2xl bg-error/15 border border-error/30 text-error text-xs font-bold flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse shrink-0" />
              <span>{error}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setError(null)} 
              className="text-error/70 hover:text-error text-xs font-black cursor-pointer px-1.5"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Expense vs Income Toggle */}
          <div className="flex bg-surface-container rounded-2xl p-1 border border-outline-variant/35 max-w-sm mx-auto w-full">
            <button
              id="tx-type-expense-btn"
              type="button"
              onClick={() => setTxType('expense')}
              className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                txType === 'expense'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              Expense
            </button>
            <button
              id="tx-type-income-btn"
              type="button"
              onClick={() => setTxType('income')}
              className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                txType === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              Income
            </button>
          </div>

          {/* Quick Preset Fill Chips */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block px-1">
              ⚡ 1-Tap Quick Fill Presets
            </label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {(budget?.quickTemplates !== undefined ? budget.quickTemplates : [
                { id: 'def-1', title: 'Chai / Coffee', amount: 20, category: 'Food' },
                { id: 'def-2', title: 'Metro / Cab', amount: 100, category: 'Transport' },
                { id: 'def-3', title: 'Swiggy Meal', amount: 250, category: 'Food' },
                { id: 'def-4', title: 'Fuel / Petrol', amount: 500, category: 'Transport' },
              ]).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setTxType('expense');
                    setTitle(tpl.title);
                    setAmount(tpl.amount.toString());
                    setCategory(tpl.category as any);
                  }}
                  className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 rounded-full text-xs font-bold text-on-surface whitespace-nowrap transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>{tpl.title}</span>
                  <span className="text-primary font-extrabold">{formatCurrency(tpl.amount, selectedCurrency)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount & Currency Selection */}
          <section className="flex flex-col items-center justify-center py-6 bg-surface-container-low rounded-2xl border border-outline-variant/30 px-4 space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="bg-surface border border-outline-variant rounded-lg px-2 py-1 text-xs font-bold text-on-surface"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-gray-900 text-white">
                    {c.code} ({c.symbol}) - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex items-center justify-center w-full max-w-sm px-4">
              <span className={`font-extrabold mr-1 text-3xl lg:text-4xl ${
                txType === 'expense' ? 'text-primary' : 'text-emerald-600'
              }`}>
                {getCurrencySymbol(selectedCurrency)}
              </span>
              <input 
                id="amountInput"
                autoFocus
                type="text" 
                inputMode="decimal"
                placeholder="0.00"
                value={formatInputAmount(amount, selectedCurrency)}
                onChange={handleAmountChange}
                required
                className="bg-transparent border-none focus:ring-0 focus:outline-none font-extrabold text-on-surface placeholder:text-outline-variant text-center text-4xl lg:text-5xl w-64"
              />
            </div>

            {/* Quick Amount Increment Chips */}
            <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
              {[100, 500, 1000, 5000].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => {
                    const curr = parseFloat(parseRawAmount(amount)) || 0;
                    setAmount((curr + inc).toString());
                  }}
                  className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-[10px] font-bold text-on-surface-variant hover:text-primary hover:border-primary/40 transition-all active:scale-95 cursor-pointer font-mono shadow-2xs"
                >
                  +{getCurrencySymbol(selectedCurrency)}{inc}
                </button>
              ))}
            </div>

            {selectedCurrency !== (budget?.currency || 'INR') && amount && (
              <p className="text-xs text-purple-400 font-medium">
                ≈ {formatCurrency(convertCurrency(parseFloat(parseRawAmount(amount)) || 0, selectedCurrency, budget?.currency || 'INR'), budget?.currency || 'INR')} in base currency
              </p>
            )}
          </section>

          {/* Description & AI Receipt OCR / Voice Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="tx-title">
                Description / Payee
              </label>
              <div className="flex items-center gap-2">
                {/* Voice Logger Button */}
                <button
                  type="button"
                  onClick={async () => {
                    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    if (!SpeechRecognition) {
                      const input = window.prompt("Voice Speech Recognition API is disabled in this browser. Please type or speak your entry (e.g. 'Spent 450 for lunch'):");
                      if (input) {
                        setIsScanningReceipt(true);
                        const parsed = await parseVoiceTranscript(input);
                        if (parsed.title) setTitle(parsed.title);
                        if (parsed.amount) setAmount(parsed.amount.toString());
                        if (parsed.category) setCategory(parsed.category);
                        if (parsed.type) setTxType(parsed.type);
                        if (parsed.notes) setNotes(parsed.notes);
                        setIsScanningReceipt(false);
                      }
                      return;
                    }

                    try {
                      setIsScanningReceipt(true);
                      setError('');
                      const recognition = new SpeechRecognition();
                      recognition.lang = navigator.language || 'en-IN';
                      recognition.interimResults = false;
                      recognition.maxAlternatives = 1;
                      recognition.start();

                      recognition.onresult = async (event: any) => {
                        const transcript = event.results[0][0].transcript;
                        console.log("Voice transcript:", transcript);
                        const parsed = await parseVoiceTranscript(transcript);
                        if (parsed.title) setTitle(parsed.title);
                        if (parsed.amount) setAmount(parsed.amount.toString());
                        if (parsed.category) setCategory(parsed.category);
                        if (parsed.type) setTxType(parsed.type);
                        if (parsed.notes) setNotes(parsed.notes);
                        setIsScanningReceipt(false);
                      };

                      recognition.onerror = (err: any) => {
                        console.error("Speech recognition error:", err);
                        setError("Voice recording failed or permission denied. Click again to retry.");
                        setIsScanningReceipt(false);
                      };

                      recognition.onend = () => {
                        setIsScanningReceipt(false);
                      };
                    } catch (e) {
                      console.error("Voice start error:", e);
                      setIsScanningReceipt(false);
                    }
                  }}
                  className="px-2.5 py-1 bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Voice Log</span>
                </button>

                {/* Receipt Scan OCR Upload Button */}
                <label className="px-2.5 py-1 bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Receipt</span>
                  <input 
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleReceiptUpload}
                  />
                </label>

                {isScanningReceipt && (
                  <span className="text-xs text-purple-400 font-semibold flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" /> AI Parsing...
                  </span>
                )}
              </div>
            </div>
            <input
              id="tx-title"
              type="text"
              required
              placeholder="e.g. Whole Foods, Shell Station, Rent, Netflix"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface border border-outline/40 focus:border-primary rounded-2xl px-4 py-3 text-sm text-on-surface outline-none"
            />
          </div>

          {/* Category Chips */}
          <section className="space-y-2.5">
            <h2 className="font-outfit text-sm font-black text-on-surface tracking-tight">Category</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const IconComp = cat.icon;
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setCategory(cat.name);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-extrabold ${
                      isSelected 
                        ? 'bg-primary-container text-on-primary-container border-primary-container/20' 
                        : 'bg-surface-container text-on-surface-variant border-outline-variant'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Real-time Category Budget Warning Badge */}
            {(() => {
              const currentMonthKey = date.substring(0, 7);
              const currentMonthCategorySpent = transactions
                .filter(t => t.date?.startsWith(currentMonthKey) && t.category === category && t.amount < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

              const enteredVal = txType === 'expense' 
                ? convertCurrency(parseFloat(parseRawAmount(amount)) || 0, selectedCurrency, budget?.currency || 'INR') 
                : 0;
              const totalProjected = currentMonthCategorySpent + enteredVal;
              const limit = budget?.categoryLimits?.[category] || Math.round((budget?.monthlyLimit || 10000) / 5);
              const remaining = limit - totalProjected;
              const pct = limit > 0 ? Math.round((totalProjected / limit) * 100) : 0;

              if (txType === 'expense' && limit > 0) {
                if (pct > 100) {
                  return (
                    <div className="mt-2 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>⚠️ Over {category} budget by {formatCurrency(Math.abs(remaining), budget?.currency || 'INR')} ({pct}% used)!</span>
                    </div>
                  );
                } else if (pct >= 80) {
                  return (
                    <div className="mt-2 p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-400">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>💡 {pct}% of {category} budget used ({formatCurrency(remaining, budget?.currency || 'INR')} remaining)</span>
                    </div>
                  );
                } else {
                  return (
                    <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{pct}% used • {formatCurrency(remaining, budget?.currency || 'INR')} remaining for {category}</span>
                    </div>
                  );
                }
              }
              return null;
            })()}
          </section>

          {/* Custom Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Custom Tags
            </label>
            <div className="flex flex-wrap gap-2 p-2 bg-surface border border-outline/40 rounded-2xl">
              {tags.map((t) => (
                <span key={t} className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-medium flex items-center gap-1">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-white">✕</button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add #tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="bg-transparent border-none outline-none text-xs text-on-surface placeholder:text-outline-variant flex-1 min-w-[120px]"
              />
            </div>
          </div>

          {/* Classifications & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Classification</label>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value as any)}
                className="w-full bg-surface border border-outline/40 rounded-2xl px-4 py-3 text-sm text-on-surface"
              >
                {labels.map((l) => (
                  <option key={l.name} value={l.name} className="bg-gray-900">{l.text}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Transaction Date</label>
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface border border-outline/40 rounded-2xl px-4 py-3 text-sm text-on-surface"
              />
            </div>
          </div>

          {/* Receipt OCR Upload Zone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Attach & AI Scan Receipt (Optional)
            </label>
            {!receiptPreview ? (
              <div 
                onClick={triggerFileSelect}
                className="w-full h-16 border-2 border-dashed border-purple-500/40 hover:border-purple-500 bg-purple-950/20 rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-xs font-bold text-purple-300">Upload Receipt for Instant AI Auto-Fill</span>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
            ) : (
              <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <img src={receiptPreview} alt="Receipt preview" className="w-10 h-10 rounded-lg object-cover" />
                  <span className="text-xs text-on-surface-variant">Receipt Attached</span>
                </div>
                <button type="button" onClick={removeReceipt} className="p-1 text-rose-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Notes</label>
            <textarea 
              placeholder="Add extra details..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface border border-outline/40 rounded-2xl px-4 py-3 text-sm text-on-surface outline-none resize-none"
            />
          </div>

          {/* Fixed Save Actions */}
          <div className="fixed bottom-0 left-0 right-0 bg-surface-container-high/95 backdrop-blur-md p-4 border-t border-outline-variant/60 flex gap-3 justify-end z-40">
            <button 
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 font-bold text-xs text-primary rounded-full border border-primary/25"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 font-bold text-xs bg-primary text-on-primary rounded-full shadow-md flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Transaction
            </button>
          </div>
        </form>
      </main>
    </motion.div>
  );
}
