import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { parseBankCsv, ParsedCsvRow } from '../utils/csvParser';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newTxs: Omit<Transaction, 'id'>[]) => void;
  existingTransactions: Transaction[];
  currency?: string;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingTransactions,
  currency = 'INR',
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ignoreDuplicates, setIgnoreDuplicates] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const { valid, errors: errs } = parseBankCsv(text, existingTransactions);
        setParsedRows(valid);
        setErrors(errs);
      }
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const rowsToImport = ignoreDuplicates ? parsedRows.filter(r => !r.isDuplicate) : parsedRows;

  const handleConfirmImport = () => {
    const finalTxs: Omit<Transaction, 'id'>[] = rowsToImport.map(r => ({
      title: r.title,
      amount: r.amount,
      category: r.category,
      date: r.date,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      label: r.label,
      notes: r.notes || 'Imported via CSV',
    }));

    onImport(finalTxs);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl bg-surface-container-lowest border border-outline-variant/30 rounded-3xl shadow-2xl p-6 space-y-5 z-10 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-on-surface">Import Bank Statement CSV</h2>
              <p className="text-xs text-on-surface-variant">HDFC, SBI, ICICI, Mint, YNAB or custom CSVs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone */}
        {parsedRows.length === 0 ? (
          <div className="border-2 border-dashed border-outline-variant/40 hover:border-primary/50 rounded-2xl p-8 text-center space-y-4 transition-colors bg-surface-container-low/40">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-on-surface">Click to select your bank statement CSV</p>
              <p className="text-xs text-on-surface-variant">Supports .csv files with Date, Amount, Description columns</p>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-file-input"
            />
            <label
              htmlFor="csv-file-input"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-md hover:bg-primary/95 cursor-pointer active:scale-95 transition-all"
            >
              Choose CSV File
            </label>
          </div>
        ) : (
          /* Preview Zone */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="flex items-center justify-between bg-surface-container-low p-3 rounded-2xl border border-outline-variant/30">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-on-surface">{fileName}</span>
              </div>
              <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {parsedRows.length} Rows Parsed
              </span>
            </div>

            {/* Duplicate Filter Toggle */}
            <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  {parsedRows.filter(r => r.isDuplicate).length} duplicates detected
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={ignoreDuplicates}
                  onChange={e => setIgnoreDuplicates(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                Skip Duplicates
              </label>
            </div>

            {/* Table Preview */}
            <div className="border border-outline-variant/30 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-high text-on-surface-variant font-bold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {parsedRows.map((r, idx) => (
                    <tr
                      key={idx}
                      className={r.isDuplicate && ignoreDuplicates ? 'opacity-40 bg-surface-container/50' : 'hover:bg-surface-container-low'}
                    >
                      <td className="p-2.5 text-on-surface-variant font-mono text-[11px]">{r.date}</td>
                      <td className="p-2.5 font-bold text-on-surface truncate max-w-[140px]">{r.title}</td>
                      <td className="p-2.5 text-on-surface-variant">{r.category}</td>
                      <td className={`p-2.5 text-right font-black ${r.amount < 0 ? 'text-error' : 'text-emerald-500'}`}>
                        {r.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(r.amount), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setParsedRows([])}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                Choose Different File
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={rowsToImport.length === 0}
                className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-md hover:bg-primary/95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Import {rowsToImport.length} Transactions</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
