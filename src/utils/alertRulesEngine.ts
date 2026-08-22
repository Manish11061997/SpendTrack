import { Transaction, BudgetConfig, AlertRule } from '../types';
import { formatCurrency } from './currency';

export const DEFAULT_ALERT_RULES: AlertRule[] = [
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

export function getStoredAlertRules(): AlertRule[] {
  try {
    const saved = localStorage.getItem('spendtrack_alert_rules');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_ALERT_RULES;
}

/**
 * Evaluates active alert rules against a saved transaction and triggers toasts
 */
export function checkAlertRulesOnSave(
  savedTx: Omit<Transaction, 'id'> | Transaction,
  allTxs: Transaction[],
  budget: BudgetConfig,
  showToast: (msg: string, type: 'warning' | 'info' | 'success') => void
) {
  const rules = getStoredAlertRules().filter(r => r.isEnabled);
  const currency = budget?.currency || 'INR';
  const absAmount = Math.abs(savedTx.amount);

  for (const rule of rules) {
    if (rule.type === 'large_transaction' && savedTx.amount < 0) {
      if (absAmount >= rule.threshold) {
        showToast(
          `⚠️ High Expense Alert: "${savedTx.title}" (${formatCurrency(absAmount, currency)}) exceeds threshold ${formatCurrency(rule.threshold, currency)}!`,
          'warning'
        );
      }
    } else if (rule.type === 'category_cap' && savedTx.amount < 0 && rule.targetCategory) {
      if (savedTx.category === rule.targetCategory) {
        const currentMonthKey = (savedTx.date || new Date().toISOString()).slice(0, 7);
        const catSpent = Math.abs(
          allTxs
            .filter(t => t.date && t.date.startsWith(currentMonthKey) && t.category === rule.targetCategory && t.amount < 0)
            .reduce((sum, t) => sum + Number(t.amount), 0)
        ) + absAmount;

        const catLimit = budget?.categoryLimits?.[rule.targetCategory as keyof typeof budget.categoryLimits] || 0;
        if (catLimit > 0) {
          const usedPct = (catSpent / catLimit) * 100;
          if (usedPct >= rule.threshold) {
            showToast(
              `⚠️ ${rule.targetCategory} Budget Alert: You have reached ${Math.round(usedPct)}% of your category limit (${formatCurrency(catSpent, currency)} / ${formatCurrency(catLimit, currency)})!`,
              'warning'
            );
          }
        }
      }
    }
  }
}
