import React, { useState } from 'react';
import { Zap, Utensils, Car, ShoppingBag, Home as HomeIcon, Check } from 'lucide-react';
import { QuickLogTemplate } from '../types';
import { formatCurrency } from '../utils/currency';

interface QuickTemplatesWidgetProps {
  templates?: QuickLogTemplate[];
  currency?: string;
  onLogTemplate: (template: { title: string; amount: number; category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other' }) => void;
}

export const QuickTemplatesWidget: React.FC<QuickTemplatesWidgetProps> = ({
  templates = [],
  currency = 'INR',
  onLogTemplate,
}) => {
  const activeTemplates = templates && Array.isArray(templates) ? templates : [];
  const [loggedId, setLoggedId] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Food': return Utensils;
      case 'Transport': return Car;
      case 'Shopping': return ShoppingBag;
      case 'Rent': return HomeIcon;
      default: return Zap;
    }
  };

  const handleTap = (tpl: QuickLogTemplate) => {
    onLogTemplate({
      title: tpl.title,
      amount: Math.abs(tpl.amount),
      category: tpl.category
    });
    setLoggedId(tpl.id);
    setTimeout(() => setLoggedId(null), 1400);
  };

  // Only render if the user has explicitly added 1 or more quick presets to their list
  if (activeTemplates.length === 0) return null;

  return (
    <div className="bg-surface-container-low rounded-2xl p-3 border border-outline-variant/30 space-y-2 shadow-2xs">
      <div className="flex items-center gap-1.5 px-0.5">
        <Zap className="w-3.5 h-3.5 text-primary" />
        <h3 className="font-outfit text-[11px] font-black uppercase tracking-wider text-on-surface-variant">1-Tap Quick Presets</h3>
      </div>

      {/* Compact Micro-Pill Carousel */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {activeTemplates.map((tpl) => {
          const IconComp = getCategoryIcon(tpl.category);
          const isJustLogged = loggedId === tpl.id;

          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleTap(tpl)}
              className={`px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0 ${
                isJustLogged
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm scale-95'
                  : 'bg-surface-container-lowest hover:bg-surface-container-high border-outline-variant/30 text-on-surface shadow-2xs'
              }`}
            >
              {isJustLogged ? (
                <Check className="w-3.5 h-3.5 text-white animate-bounce" />
              ) : (
                <IconComp className="w-3.5 h-3.5 text-primary" />
              )}
              <span>{tpl.title}</span>
              <span className={`font-extrabold ${isJustLogged ? 'text-white' : 'text-primary'}`}>
                {formatCurrency(tpl.amount, currency)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
