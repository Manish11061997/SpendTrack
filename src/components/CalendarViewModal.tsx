import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Clock, Tag } from 'lucide-react';
import { Transaction, Subscription } from '../types';
import { formatCurrency } from '../utils/currency';

interface CalendarViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  subscriptions: Subscription[];
  currency: string;
}

export const CalendarViewModal: React.FC<CalendarViewModalProps> = ({
  isOpen,
  onClose,
  transactions,
  subscriptions,
  currency,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Map expenses to dates YYYY-MM-DD
  const dailySpendMap: { [dateStr: string]: { total: number; count: number } } = {};
  transactions.forEach((tx) => {
    if (tx.amount < 0) {
      const absAmt = Math.abs(tx.amount);
      if (!dailySpendMap[tx.date]) {
        dailySpendMap[tx.date] = { total: 0, count: 0 };
      }
      dailySpendMap[tx.date].total += absAmt;
      dailySpendMap[tx.date].count += 1;
    }
  });

  const selectedDayTransactions = selectedDayDate
    ? transactions.filter((t) => t.date === selectedDayDate)
    : [];

  const selectedDaySubscriptions = selectedDayDate
    ? subscriptions.filter((s) => s.isActive && s.billingDate === parseInt(selectedDayDate.split('-')[2], 10))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#1e1e2d] border border-white/10 text-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-900/30 to-indigo-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Financial Calendar</h2>
              <p className="text-xs text-gray-400">Daily spending heatmap & subscription billing dates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <button onClick={handlePrevMonth} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-white">{monthNames[month]} {year}</h3>
          <button onClick={handleNextMonth} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Body & Details */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}

            {/* Empty slots for start offset */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 rounded-xl bg-white/[0.02] opacity-30" />
            ))}

            {/* Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const spendInfo = dailySpendMap[dateStr];
              const daySubs = subscriptions.filter((s) => s.isActive && s.billingDate === dayNum);
              const isSelected = selectedDayDate === dateStr;

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDayDate(dateStr)}
                  className={`h-20 p-1.5 rounded-xl border flex flex-col justify-between items-start transition-all relative text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/50'
                      : spendInfo
                      ? 'border-white/10 bg-white/5 hover:border-white/20'
                      : 'border-white/5 bg-black/20 hover:bg-white/5'
                  }`}
                >
                  <span className={`text-xs font-bold ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                    {dayNum}
                  </span>

                  <div className="w-full space-y-1">
                    {/* Subscription Badge */}
                    {daySubs.length > 0 && (
                      <span className="block text-[9px] px-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded truncate font-medium">
                        🔔 {daySubs[0].title}
                      </span>
                    )}

                    {/* Spend Indicator */}
                    {spendInfo && (
                      <span className={`block text-[10px] font-bold truncate ${
                        spendInfo.total > 200 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        -{formatCurrency(spendInfo.total, currency)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Day Details Drawer */}
          {selectedDayDate && (
            <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-xl space-y-3 animate-in slide-in-from-bottom-2">
              <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Transactions for {selectedDayDate}
              </h4>

              {selectedDaySubscriptions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-amber-300 font-semibold uppercase">Subscriptions Due Today:</p>
                  {selectedDaySubscriptions.map((sub) => (
                    <div key={sub.id} className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs flex justify-between">
                      <span>🔔 {sub.title} ({sub.category})</span>
                      <span className="font-bold text-amber-300">{formatCurrency(sub.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {selectedDayTransactions.length === 0 ? (
                  <p className="text-xs text-gray-400">No logged expenses on this date.</p>
                ) : (
                  selectedDayTransactions.map((tx) => (
                    <div key={tx.id} className="p-2.5 bg-black/40 border border-white/5 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">{tx.title}</span>
                        <span className="text-gray-400 ml-2">({tx.category})</span>
                      </div>
                      <span className={`font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {formatCurrency(tx.amount, currency)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
