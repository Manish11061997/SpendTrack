import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Transaction } from '../types';
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
  PlusCircle,
  TrendingUp,
  X
} from 'lucide-react';

interface AddTransactionFormProps {
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
}

export default function AddTransactionForm({ onSave, onCancel }: AddTransactionFormProps) {
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
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
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setError(null);
    // Allow digits and up to 2 decimal places
    if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
      setAmount(val);
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

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setReceiptFile(file);
      
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Maximum size constraint (800px max dimension)
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
          // Compress as JPEG with 0.6 quality (looks clear, but size is tiny like 30kb-50kb)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          setReceiptPreview(compressedBase64);
          setError(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a description or title.');
      return;
    }

    // Determine default labels based on common settings
    let defaultLabel = label;

    // format current time
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const timeString = `${hours}:${minutes} ${ampm}`;

    const txData: any = {
      title: title.trim(),
      category,
      amount: txType === 'expense' ? -parseFloat(amount) : parseFloat(amount),
      date,
      time: timeString,
      label: defaultLabel,
      notes: notes.trim(),
    };
    if (receiptPreview) {
      txData.receiptUrl = receiptPreview;
    }
    onSave(txData);
  };

  const categories = [
    { name: 'Food' as const, icon: Utensils, label: 'Food', color: 'bg-primary-container text-on-primary-container border-primary/20' },
    { name: 'Transport' as const, icon: Car, label: 'Transport', color: 'bg-secondary/10 text-secondary border-secondary/20 dark:bg-secondary/20' },
    { name: 'Rent' as const, icon: HomeIcon, label: 'Rent', color: 'bg-secondary-container text-on-secondary-container border-secondary/20' },
    { name: 'Shopping' as const, icon: ShoppingBag, label: 'Shopping', color: 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20' },
    { name: 'Other' as const, icon: MoreHorizontal, label: 'Other', color: 'bg-surface-variant text-on-surface-variant border-outline-variant/30' },
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
      className="bg-background text-on-surface min-h-screen flex flex-col font-body-md"
    >
      {/* Top App Bar — M3 frosted glass bar */}
      <header className="flex items-center gap-3 px-4 w-full h-14 bg-surface/80 backdrop-blur-md border-b border-outline-variant/20 sticky top-0 z-50">
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
          
          {/* Expense vs Income Segmented Toggle */}
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

          {/* Transaction Amount Section */}
          <section className="flex flex-col items-center justify-center py-6 bg-surface-container-low rounded-2xl border border-outline-variant/30 px-4">
            <label className="font-label-lg text-label-lg text-on-surface-variant mb-1">
              {txType === 'expense' ? 'Expense Amount' : 'Income Amount'}
            </label>
            <div className="relative flex items-center justify-center w-full">
              <span className={`text-4xl lg:text-5xl font-extrabold mr-1 transition-colors ${
                txType === 'expense' ? 'text-primary' : 'text-emerald-600 dark:text-emerald-500'
              }`}>
                {txType === 'expense' ? '' : '+'} ₹
              </span>
              <input 
                id="amountInput"
                autoFocus
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                required
                className="bg-transparent border-none focus:ring-0 focus:outline-none text-4xl lg:text-5xl font-extrabold text-on-surface placeholder:text-outline-variant w-44 text-center"
              />
            </div>
            <div className={`h-1 w-24 rounded-full mt-2 transition-colors ${
              txType === 'expense' ? 'bg-primary-container' : 'bg-emerald-500/20'
            }`}></div>
          </section>

          {/* Title/Description input — M3 Outlined Text Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant px-1 uppercase tracking-wider" htmlFor="tx-title">
              Description / Payee
            </label>
            <input
              id="tx-title"
              type="text"
              required
              placeholder="e.g. Whole Foods, Shell Station, Rent, Netflix"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface border border-outline/40 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-all duration-150 outline-none"
            />
          </div>

          {/* Category Selection — M3 Tonal Chips */}
          <section className="space-y-2.5">
            <h2 className="font-outfit text-sm font-black text-on-surface px-1 tracking-tight">Category</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const IconComp = cat.icon;
                const isSelected = category === cat.name;
                return (
                  <button
                    id={`category-chip-${cat.name.toLowerCase()}`}
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-150 text-xs font-extrabold cursor-pointer active:scale-95 ${
                      isSelected 
                        ? 'bg-primary-container text-on-primary-container border-primary-container/20 shadow-2xs' 
                        : 'bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Labels Selector — M3 Filter Chips */}
          <section className="space-y-2.5">
            <h2 className="font-outfit text-sm font-black text-on-surface px-1 tracking-tight">Classification</h2>
            <div className="flex flex-wrap gap-2">
              {labels.map((lbl) => {
                const isSelected = label === lbl.name;
                return (
                  <button
                    id={`label-chip-${lbl.name.toLowerCase()}`}
                    key={lbl.name}
                    type="button"
                    onClick={() => setLabel(lbl.name)}
                    className={`flex items-center px-4 py-2 rounded-full text-xs font-extrabold border transition-all duration-150 cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-secondary-container text-on-secondary-container border-secondary-container/20 shadow-2xs'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    {lbl.text}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Picker — M3 Outlined Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant px-1 uppercase tracking-wider" htmlFor="date">
                Transaction Date
              </label>
              <div className="relative">
                <input 
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-surface border border-outline/40 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-2xl px-4 py-3 text-sm text-on-surface transition-all duration-150 outline-none pr-10"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Calendar className="w-4 h-4 text-outline" />
                </div>
              </div>
            </div>

            {/* Receipt Attachment (Flexible drag & drop + manual click upload) */}
            <div className="space-y-1.5">
              <label className="font-label-lg text-label-lg text-on-surface-variant px-1">
                Attach Receipt (Optional)
              </label>
              
              {!receiptPreview ? (
                <div 
                  id="drag-drop-zone"
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={`w-full h-[52px] flex items-center justify-center gap-2 border-2 border-dashed rounded-xl cursor-pointer text-on-surface-variant hover:bg-surface-container-low hover:border-primary transition-all duration-200 group ${
                    dragActive ? 'bg-primary-container/10 border-primary' : 'border-outline-variant'
                  }`}
                >
                  <Receipt className="w-5 h-5 group-hover:text-primary text-outline transition-colors" />
                  <span className="font-label-lg text-label-lg text-on-surface-variant group-hover:text-primary transition-colors">
                    Upload Photo / Drop Here
                  </span>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2 h-[52px]">
                  <div className="flex items-center gap-2 overflow-hidden mr-4">
                    <img 
                      src={receiptPreview} 
                      alt="Receipt preview" 
                      className="w-8 h-8 rounded object-cover border border-outline-variant"
                    />
                    <span className="text-xs truncate max-w-[150px] font-mono text-on-surface-variant">
                      {receiptFile ? receiptFile.name : 'attached_receipt.png'}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={removeReceipt}
                    className="p-1 rounded-full hover:bg-surface-container-highest transition-colors"
                  >
                    <X className="w-4 h-4 text-error" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes Text Area — M3 Outlined Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant px-1 uppercase tracking-wider" htmlFor="notes">
              Notes
            </label>
            <textarea 
              id="notes"
              placeholder="Add a description, tags, or extra details..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface border border-outline/40 focus:border-primary focus:ring-2 focus:ring-primary/10 rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-all duration-150 outline-none resize-none"
            ></textarea>
          </div>

          {/* Visual Decor: Atmospheric Information Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container h-28 flex items-center px-6 shadow-sm mt-4 text-white">
            <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-24 h-24 bg-secondary-container/20 rounded-full blur-xl"></div>
            <div className="flex items-center gap-4 z-10">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-title-md text-title-md font-bold">Keep track easily</p>
                <p className="text-white/80 font-body-md text-body-md text-xs">
                  Your budget updates dynamically across all analytics tabs.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Actions - Fixed to Bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-surface-container-high/95 backdrop-blur-md p-4 border-t border-outline-variant/60 flex gap-3 justify-end z-40">
            <button 
              id="cancel-add-transaction"
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 font-label-lg text-label-lg text-primary hover:bg-primary/5 rounded-full transition-colors active:scale-95 border border-primary/25 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              id="save-add-transaction"
              type="submit"
              className="px-8 py-2.5 font-label-lg text-label-lg bg-primary text-on-primary rounded-full shadow-md hover:shadow-lg hover:bg-primary/95 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Save Transaction
            </button>
          </div>

        </form>
      </main>
    </motion.div>
  );
}
