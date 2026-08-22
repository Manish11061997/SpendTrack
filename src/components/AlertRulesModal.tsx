import React, { useState, useEffect } from 'react';
import { X, Bell, Plus, Trash2, ShieldAlert, Check } from 'lucide-react';
import { AlertRule } from '../types';
import { parseRawAmount } from '../utils/currency';

interface AlertRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
}

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-large-tx',
    name: 'Large Transaction Alert',
    type: 'large_transaction',
    threshold: 5000,
    isEnabled: true
  },
  {
    id: 'rule-cat-cap',
    name: 'Category Budget Warning (80%)',
    type: 'category_cap',
    threshold: 80,
    targetCategory: 'Food',
    isEnabled: true
  }
];

export const AlertRulesModal: React.FC<AlertRulesModalProps> = ({
  isOpen,
  onClose,
  currency = 'INR'
}) => {
  const [rules, setRules] = useState<AlertRule[]>(() => {
    const saved = localStorage.getItem('spendtrack_alert_rules');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_ALERT_RULES;
  });

  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleType, setNewRuleType] = useState<'large_transaction' | 'category_cap'>('large_transaction');
  const [newRuleThreshold, setNewRuleThreshold] = useState<number>(5000);
  const [newTargetCat, setNewTargetCat] = useState<'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other'>('Food');

  useEffect(() => {
    localStorage.setItem('spendtrack_alert_rules', JSON.stringify(rules));
  }, [rules]);

  if (!isOpen) return null;

  const handleAddRule = () => {
    if (!newRuleName.trim()) return;

    const newRule: AlertRule = {
      id: Math.random().toString(36).substring(2, 9),
      name: newRuleName.trim(),
      type: newRuleType,
      threshold: newRuleThreshold,
      targetCategory: newRuleType === 'category_cap' ? newTargetCat : undefined,
      isEnabled: true
    };

    setRules(prev => [...prev, newRule]);
    setNewRuleName('');
    setNewRuleThreshold(5000);
  };

  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isEnabled: !r.isEnabled } : r));
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div 
        onClick={onClose}
        className="absolute inset-0 cursor-pointer"
      />
      <div className="relative w-full max-w-lg bg-surface-container-lowest border border-outline-variant/40 rounded-3xl shadow-2xl p-6 space-y-5 z-10 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-outfit font-black text-lg text-on-surface flex items-center gap-1.5">
                Custom Alert Rules Engine
                <span className="text-[9px] bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-md uppercase font-mono font-bold">Real-time</span>
              </h3>
              <p className="text-xs text-on-surface-variant">Configure automated triggers & high-value spend warnings</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Rules List */}
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">Active Trigger Rules</span>
          {rules.length === 0 ? (
            <p className="text-xs text-on-surface-variant/60 py-3 text-center">No alert rules configured.</p>
          ) : (
            rules.map((rule) => (
              <div 
                key={rule.id}
                className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-2xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface truncate">{rule.name}</span>
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {rule.type === 'large_transaction' ? `>${rule.threshold} ${currency}` : `${rule.threshold}% of ${rule.targetCategory}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
                      rule.isEnabled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {rule.isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Rule Form */}
        <div className="p-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl space-y-3">
          <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-primary" />
            Create New Rule
          </span>

          <div className="space-y-2 text-xs">
            <input 
              type="text"
              placeholder="Rule Name (e.g. Dining Cap Warning)"
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 outline-none focus:border-primary"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={newRuleType}
                onChange={(e: any) => setNewRuleType(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-2 py-2 font-semibold text-on-surface outline-none"
              >
                <option value="large_transaction">Single Tx &gt; Threshold</option>
                <option value="category_cap">Category Spend %</option>
              </select>

              <input 
                type="number"
                placeholder={newRuleType === 'large_transaction' ? "Threshold Amount (e.g. 5000)" : "Threshold % (e.g. 80)"}
                value={newRuleThreshold || ''}
                onChange={(e) => setNewRuleThreshold(parseFloat(parseRawAmount(e.target.value)) || 0)}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 font-mono outline-none focus:border-primary"
              />
            </div>

            {newRuleType === 'category_cap' && (
              <select
                value={newTargetCat}
                onChange={(e: any) => setNewTargetCat(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-2 py-2 font-semibold text-on-surface outline-none"
              >
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Rent">Rent</option>
                <option value="Shopping">Shopping</option>
                <option value="Other">Other</option>
              </select>
            )}
          </div>

          <button
            onClick={handleAddRule}
            disabled={!newRuleName.trim()}
            className="w-full py-2 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-xs hover:bg-primary/95 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Save Alert Rule</span>
          </button>
        </div>

      </div>
    </div>
  );
};
