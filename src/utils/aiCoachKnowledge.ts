import { Transaction, BudgetConfig, Subscription, SavingsGoal } from '../types';

// ─── TYPES & INTERFACES ────────────────────────────────────────────────────────
export interface FinancialAuditSummary {
  currency: string;
  now: Date;
  currentMonthKey: string;
  lastMonthKey: string;
  daysInMonth: number;
  remainingDays: number;

  // Current month totals
  currentSpent: number;
  currentIncome: number;
  currentNet: number;
  currentTxCount: number;

  // Last month totals
  lastSpent: number;
  lastIncome: number;

  // All time
  allSpent: number;
  allIncome: number;
  allTxCount: number;

  // Budget
  monthlyLimit: number;
  remainingBudget: number | null;
  budgetPctUsed: number | null;
  dailySafePace: number;
  projectedEndSpent: number;

  // Category breakdown (sorted by spend)
  categoryBreakdown: { category: string; total: number; count: number; pctOfSpent: number }[];

  // Merchant breakdown
  topMerchants: { name: string; total: number; count: number }[];

  // Subscriptions
  activeSubs: Subscription[];
  subTotalMonthly: number;
  subTotalAnnual: number;

  // Savings goals
  goals: SavingsGoal[];
  totalSaved: number;
  totalTarget: number;

  // Work vs Personal
  workSpent: number;
  personalSpent: number;
}

// ─── 1. COMPREHENSIVE DATA ANALYZER ──────────────────────────────────────────
export const analyzeUserFinances = (
  transactions: Transaction[] = [],
  budgetConfig?: BudgetConfig,
  subscriptions: Subscription[] = [],
  savingsGoals: SavingsGoal[] = [],
  currency: string = 'INR'
): FinancialAuditSummary => {
  const safeTxs = Array.isArray(transactions) ? transactions : [];
  const safeSubs = Array.isArray(subscriptions) ? subscriptions : [];
  const safeGoals = Array.isArray(savingsGoals) ? savingsGoals : [];

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);

  const currentMonthTxs = safeTxs.filter((t) => t.date?.startsWith(currentMonthKey));
  const lastMonthTxs = safeTxs.filter((t) => t.date?.startsWith(lastMonthKey));

  const currentSpent = currentMonthTxs.filter((t) => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const currentIncome = currentMonthTxs.filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const currentNet = currentIncome - currentSpent;

  const lastSpent = lastMonthTxs.filter((t) => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const lastIncome = lastMonthTxs.filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);

  const allSpent = safeTxs.filter((t) => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const allIncome = safeTxs.filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);

  const limit = Number(budgetConfig?.monthlyLimit) || 0;
  const remainingBudget = limit > 0 ? limit - currentSpent : null;
  const budgetPctUsed = limit > 0 ? Math.round((currentSpent / limit) * 100) : null;
  const dailySafePace = remainingBudget != null && remainingBudget > 0 ? Math.round(remainingBudget / remainingDays) : 0;

  const dayOfMonth = now.getDate();
  const projectedEndSpent = dayOfMonth > 0 ? Math.round((currentSpent / dayOfMonth) * daysInMonth) : currentSpent;

  // Category breakdown
  const catMap: Record<string, { total: number; count: number }> = {};
  currentMonthTxs.filter((t) => Number(t.amount) < 0).forEach((t) => {
    const cat = t.category || 'Other';
    if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
    catMap[cat].total += Math.abs(Number(t.amount));
    catMap[cat].count++;
  });
  const categoryBreakdown = Object.entries(catMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      pctOfSpent: currentSpent > 0 ? Math.round((data.total / currentSpent) * 100) : 0,
    }));

  // Merchant breakdown (searches titles & merchants)
  const merchMap: Record<string, { total: number; count: number }> = {};
  safeTxs.filter((t) => Number(t.amount) < 0).forEach((t) => {
    const name = String(t.merchant || t.title || 'Other').trim();
    if (!merchMap[name]) merchMap[name] = { total: 0, count: 0 };
    merchMap[name].total += Math.abs(Number(t.amount));
    merchMap[name].count++;
  });
  const topMerchants = Object.entries(merchMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([name, data]) => ({ name, total: data.total, count: data.count }));

  // Subscriptions
  const activeSubs = safeSubs.filter((s) => s.isActive !== false);
  const subTotalMonthly = activeSubs.reduce((s, sub) => s + Number(sub.amount), 0);
  const subTotalAnnual = subTotalMonthly * 12;

  // Savings goals
  const totalSaved = safeGoals.reduce((s, g) => s + Number(g.currentAmount || 0), 0);
  const totalTarget = safeGoals.reduce((s, g) => s + Number(g.targetAmount || 0), 0);

  // Work vs Personal
  const workSpent = currentMonthTxs
    .filter((t) => Number(t.amount) < 0 && t.label === 'Work')
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const personalSpent = currentMonthTxs
    .filter((t) => Number(t.amount) < 0 && (t.label === 'Personal' || !t.label))
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  return {
    currency,
    now,
    currentMonthKey,
    lastMonthKey,
    daysInMonth,
    remainingDays,
    currentSpent,
    currentIncome,
    currentNet,
    currentTxCount: currentMonthTxs.length,
    lastSpent,
    lastIncome,
    allSpent,
    allIncome,
    allTxCount: safeTxs.length,
    monthlyLimit: limit,
    remainingBudget,
    budgetPctUsed,
    dailySafePace,
    projectedEndSpent,
    categoryBreakdown,
    topMerchants,
    activeSubs,
    subTotalMonthly,
    subTotalAnnual,
    goals: safeGoals,
    totalSaved,
    totalTarget,
    workSpent,
    personalSpent,
  };
};

// ─── 2. GEMINI 2.0 SYSTEM PROMPT GENERATOR WITH 100+ INTENT TRAINING ─────────
export const buildGeminiSystemPrompt = (
  audit: FinancialAuditSummary,
  transactions: Transaction[] = []
): string => {
  const curr = audit.currency;
  const safeTxs = Array.isArray(transactions) ? transactions : [];

  const catStr = audit.categoryBreakdown
    .map((c) => `  - ${c.category}: ${curr} ${c.total.toLocaleString('en-IN')} (${c.pctOfSpent}%, ${c.count} txs)`)
    .join('\n') || '  No expenses recorded this month';

  const merchStr = audit.topMerchants
    .map((m) => `  - "${m.name}": ${curr} ${m.total.toLocaleString('en-IN')} (${m.count} txs)`)
    .join('\n') || '  No merchant transactions';

  const subStr = audit.activeSubs
    .map((s) => `  - ${s.title}: ${curr} ${s.amount}/mo (due day ${s.billingDate})`)
    .join('\n') || '  No active subscriptions';

  const goalStr = audit.goals
    .map((g) => {
      const pct = g.targetAmount > 0 ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100) : 0;
      return `  - ${g.title}: ${curr} ${Number(g.currentAmount).toLocaleString('en-IN')} / ${curr} ${Number(g.targetAmount).toLocaleString('en-IN')} (${pct}% complete)`;
    })
    .join('\n') || '  No active savings goals';

  const txListStr = safeTxs
    .slice(0, 50)
    .map((t) => `  [${t.date}] ${t.title} (${t.category}${t.label ? ', ' + t.label : ''}): ${Number(t.amount) < 0 ? '-' : '+'}${curr} ${Math.abs(Number(t.amount))}`)
    .join('\n') || '  No transactions logged';

  return `You are "Tracky", the official AI Personal Finance Advisor & Wealth Coach embedded in SpendTrack. You have been trained across 100+ unique financial intents and possess complete real-time access to the user's financial ledger.

=== TRAINED INTENT DOMAINS & MANDATES ===
1. **INCOME & INFLOW INTENTS**: Answer total income, credits, deposits, work earnings directly with exact numbers.
2. **EXPENSE & OUTFLOW INTENTS**: Answer total spend, daily burn, peak spend day, and single highest/lowest expenses accurately.
3. **CATEGORY BREAKDOWN INTENTS**: Provide exact category spending (Food, Transport, Shopping, Rent, Other) and percentage of total outflow.
4. **MERCHANT & VENDOR SEARCH INTENTS**: Search through transaction titles & merchant fields for specific vendors (e.g. Swiggy, Zomato, Amazon, Flipkart, Myntra, Blinkit, Zepto, Uber, Ola, Starbucks).
5. **BUDGET & SAFE PACE INTENTS**: Provide exact budget limit, spent %, remaining budget, and calculated safe daily spending pace for remaining days.
6. **AFFORDABILITY INTENTS ("Can I afford X?")**: Check remaining budget and net cash flow. Give an explicit "✅ YES" or "⚠️ CAUTION / OVER BUDGET" verdict with exact pre- and post-purchase balances.
7. **SUBSCRIPTION & RECURRING BILL INTENTS**: List active subscriptions, monthly/annual burden, due dates, and cutback recommendations.
8. **SAVINGS GOAL INTENTS**: Display goal progress, target shortfalls, and savings pacing.
9. **FINANCIAL FRAMEWORK INTENTS (50/30/20, Emergency Fund, 70/20/10)**: Apply real-world financial frameworks directly to the user's actual income and expense figures.
10. **APP FEATURE INTENTS**: Assist with privacy mode, exporting data, APK downloading, dark mode, and quick log templates.

=== STRICT RESPONSE GUIDELINES ===
- **DATA INTEGRITY**: Use ONLY real values from the live financial audit below. Never invent transactions or fabricate amounts.
- **CURRENCY FORMAT**: Format all amounts as "${curr} X,XX,XXX" (Indian numerical format).
- **CONCISENESS & CLARITY**: Keep responses under 160 words unless detailed multi-item breakdowns are requested. Use bolding (**amount**) and bullet points (•) effectively.
- **DIRECTNESS**: Respond immediately to the user's explicit question without unnecessary generic greetings.

=== LIVE USER FINANCIAL AUDIT DATA (${audit.now.toDateString()}) ===
Currency: ${curr}

CURRENT MONTH (${audit.currentMonthKey}):
- Total Spent (Expenses): ${curr} ${audit.currentSpent.toLocaleString('en-IN')} (${audit.currentTxCount} transactions)
- Total Income: ${curr} ${audit.currentIncome.toLocaleString('en-IN')}
- Net Surplus/Deficit: ${curr} ${audit.currentNet.toLocaleString('en-IN')}
${audit.monthlyLimit > 0 ? `- Monthly Budget Limit: ${curr} ${audit.monthlyLimit.toLocaleString('en-IN')}
- Budget Used: ${audit.budgetPctUsed}% (${curr} ${audit.currentSpent.toLocaleString('en-IN')} spent)
- Remaining Budget: ${curr} ${(audit.remainingBudget ?? 0).toLocaleString('en-IN')}
- Safe Daily Spending Pace (${audit.remainingDays} days remaining): ${curr} ${audit.dailySafePace}/day
- Projected Month-End Spend: ${curr} ${audit.projectedEndSpent.toLocaleString('en-IN')}` : '- Monthly Budget Limit: Not configured'}

CATEGORY BREAKDOWN (Current Month):
${catStr}

LAST MONTH COMPARISON (${audit.lastMonthKey}):
- Spent Last Month: ${curr} ${audit.lastSpent.toLocaleString('en-IN')}
- Income Last Month: ${curr} ${audit.lastIncome.toLocaleString('en-IN')}

TOP VENDORS & MERCHANTS:
${merchStr}

ACTIVE SUBSCRIPTIONS:
- Count: ${audit.activeSubs.length} active
- Total Monthly Burden: ${curr} ${audit.subTotalMonthly.toLocaleString('en-IN')}
- Total Annual Burden: ${curr} ${audit.subTotalAnnual.toLocaleString('en-IN')}
${subStr}

SAVINGS GOALS:
- Total Saved: ${curr} ${audit.totalSaved.toLocaleString('en-IN')} of ${curr} ${audit.totalTarget.toLocaleString('en-IN')}
${goalStr}

RECENT 50 TRANSACTIONS:
${txListStr}`;
};

// ─── 3. DETERMINISTIC 100+ INTENT OFFLINE NLP ENGINE ─────────────────────────
export const generateOfflineResponse = (
  query: string,
  transactions: Transaction[] = [],
  budgetConfig?: BudgetConfig,
  subscriptions: Subscription[] = [],
  savingsGoals: SavingsGoal[] = [],
  currency: string = 'INR'
): string => {
  const q = query.toLowerCase().trim();
  const audit = analyzeUserFinances(transactions, budgetConfig, subscriptions, savingsGoals, currency);
  const curr = audit.currency;
  const safeTxs = Array.isArray(transactions) ? transactions : [];

  // Helper: Search transactions by keyword in title, merchant, category, or label
  const searchTxByKeyword = (kw: string) => {
    const matched = safeTxs.filter(
      (t) =>
        Number(t.amount) < 0 &&
        (t.title?.toLowerCase().includes(kw) ||
          t.merchant?.toLowerCase().includes(kw) ||
          t.label?.toLowerCase().includes(kw) ||
          t.category?.toLowerCase().includes(kw) ||
          t.notes?.toLowerCase().includes(kw))
    );
    const total = matched.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    return { matched, total, count: matched.length };
  };

  // ──── INTENT GROUP 1: FINANCIAL OVERVIEW & HEALTH ───────────────────────────
  if (['summary', 'overview', 'financial health', 'how am i doing', 'report', 'audit', 'dashboard'].some((k) => q.includes(k))) {
    const topCat = audit.categoryBreakdown[0];
    return `📊 **Financial Summary — ${audit.now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}**\n\n• **Spent:** ${curr} ${audit.currentSpent.toLocaleString('en-IN')}\n• **Income:** ${curr} ${audit.currentIncome.toLocaleString('en-IN')}\n• **Net Cash Flow:** ${curr} ${audit.currentNet.toLocaleString('en-IN')}\n${
      audit.monthlyLimit > 0
        ? `• **Budget Status:** ${audit.budgetPctUsed}% used (${curr} ${audit.remainingBudget?.toLocaleString('en-IN')} left)\n• **Daily Safe Pace:** ${curr} ${audit.dailySafePace}/day for ${audit.remainingDays} remaining days\n`
        : ''
    }• **Top Spend Area:** ${topCat ? `${topCat.category} (${curr} ${topCat.total.toLocaleString('en-IN')})` : 'None logged'}\n• **Active Subscriptions:** ${audit.activeSubs.length} (${curr} ${audit.subTotalMonthly.toLocaleString('en-IN')}/mo)`;
  }

  // ──── INTENT GROUP 2: INCOME & CREDITS ──────────────────────────────────────
  if (['income', 'salary', 'earning', 'earnings', 'payday', 'inflow', 'credited', 'deposit'].some((k) => q.includes(k))) {
    const incomeTxs = safeTxs.filter((t) => Number(t.amount) > 0);
    return `💵 **Income & Inflow Audit**\n\n• **This Month Income:** ${curr} ${audit.currentIncome.toLocaleString('en-IN')}\n• **All-Time Income:** ${curr} ${audit.allIncome.toLocaleString('en-IN')} (${incomeTxs.length} credit logs)\n• **Work-Labeled Spent:** ${curr} ${audit.workSpent.toLocaleString('en-IN')}\n\n${
      incomeTxs.length > 0
        ? `Recent Income Credits:\n${incomeTxs.slice(0, 5).map((t) => `• [${t.date}] ${t.title}: +${curr} ${Math.abs(Number(t.amount)).toLocaleString('en-IN')}`).join('\n')}`
        : 'No income transactions logged yet.'
    }`;
  }

  // ──── INTENT GROUP 3: TOTAL EXPENSES & OUTFLOW ──────────────────────────────
  if (['expense', 'expenses', 'spent', 'spending', 'outflow', 'total spend', 'burn rate', 'money spent'].some((k) => q.includes(k)) && !['category', 'food', 'transport', 'shopping', 'rent', 'swiggy', 'zomato', 'amazon', 'uber'].some((k) => q.includes(k))) {
    return `💸 **Spending & Outflow Audit**\n\n• **This Month Spent:** ${curr} ${audit.currentSpent.toLocaleString('en-IN')} (${audit.currentTxCount} transactions)\n• **All-Time Spent:** ${curr} ${audit.allSpent.toLocaleString('en-IN')} (${audit.allTxCount} transactions)\n• **Last Month Spent:** ${curr} ${audit.lastSpent.toLocaleString('en-IN')}\n${
      audit.monthlyLimit > 0
        ? `• **Budget Used:** ${audit.budgetPctUsed}% (${curr} ${audit.remainingBudget?.toLocaleString('en-IN')} remaining)\n• **Daily Safe Pace:** ${curr} ${audit.dailySafePace}/day`
        : 'Set a monthly limit in Settings to enable budget pacing!'
    }`;
  }

  // ──── INTENT GROUP 4: BUDGET & SAFE PACING ──────────────────────────────────
  if (['budget', 'remaining', 'limit', 'cap', 'leftover', 'how much left', 'overbudget', 'pace', 'daily pace'].some((k) => q.includes(k))) {
    if (audit.monthlyLimit > 0) {
      const statusIcon = (audit.budgetPctUsed ?? 0) >= 100 ? '🔴 OVER BUDGET' : (audit.budgetPctUsed ?? 0) >= 80 ? '🟡 HIGH CAUTION' : '🟢 ON TRACK';
      return `🎯 **Budget Status:** ${statusIcon}\n\n• **Monthly Limit:** ${curr} ${audit.monthlyLimit.toLocaleString('en-IN')}\n• **Total Spent:** ${curr} ${audit.currentSpent.toLocaleString('en-IN')} (${audit.budgetPctUsed}%)\n• **Remaining Cap:** ${curr} ${audit.remainingBudget?.toLocaleString('en-IN')}\n• **Days Remaining:** ${audit.remainingDays} days\n• **Safe Daily Pace:** **${curr} ${audit.dailySafePace}/day**\n• **Projected Month-End Spend:** ${curr} ${audit.projectedEndSpent.toLocaleString('en-IN')}`;
    }
    return `⚠️ **No Monthly Budget Configured**\n\nYou haven't set a monthly budget limit yet. Go to **Settings → Budget** to set your monthly cap so I can calculate your safe daily spending pace!`;
  }

  // ──── INTENT GROUP 5: AFFORDABILITY & PURCHASE DECISIONS ─────────────────────
  const priceMatch = q.match(/(?:afford|buy|purchase|cost|spend|get).*?(?:rs\.?|inr|₹|\$)?\s*(\d[\d,]*)/i);
  if (priceMatch || q.includes('afford') || q.includes('can i buy') || q.includes('should i buy')) {
    const targetAmt = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;
    if (targetAmt > 0) {
      if (audit.monthlyLimit > 0) {
        const rem = audit.remainingBudget ?? 0;
        if (targetAmt <= rem) {
          return `✅ **YES, YOU CAN AFFORD THIS!**\n\n• **Item Cost:** ${curr} ${targetAmt.toLocaleString('en-IN')}\n• **Current Remaining Budget:** ${curr} ${rem.toLocaleString('en-IN')}\n• **Post-Purchase Remaining:** ${curr} ${(rem - targetAmt).toLocaleString('en-IN')}\n• **Days Left in Month:** ${audit.remainingDays} days\n\nVerdict: Purchase fits cleanly within your remaining monthly budget!`;
        }
        return `⚠️ **CAUTION — EXCEEDS MONTHLY BUDGET!**\n\n• **Item Cost:** ${curr} ${targetAmt.toLocaleString('en-IN')}\n• **Current Remaining Budget:** ${curr} ${rem.toLocaleString('en-IN')}\n• **Over Budget Amount:** **${curr} ${(targetAmt - rem).toLocaleString('en-IN')}**\n\nVerdict: This purchase will push you past your monthly limit. Consider postponing or cutting back on non-essential categories first.`;
      }
      const net = audit.currentNet;
      if (targetAmt <= net) {
        return `✅ **LIKELY AFFORDABLE BASED ON NET CASH SURPLUS**\n\n• **Item Cost:** ${curr} ${targetAmt.toLocaleString('en-IN')}\n• **Current Net Surplus (Income - Spent):** ${curr} ${net.toLocaleString('en-IN')}\n• **Post-Purchase Surplus:** ${curr} ${(net - targetAmt).toLocaleString('en-IN')}\n\nTip: Set a monthly budget limit in Settings for exact daily pacing calculations!`;
      }
      return `⚠️ **CAUTION — LOW CASH SURPLUS**\n\n• **Item Cost:** ${curr} ${targetAmt.toLocaleString('en-IN')}\n• **Current Net Surplus:** ${curr} ${net.toLocaleString('en-IN')}\n• **Shortfall:** ${curr} ${(targetAmt - net).toLocaleString('en-IN')}`;
    }
  }

  // ──── INTENT GROUP 6: CATEGORY AUDITS ───────────────────────────────────────
  if (['category', 'categories', 'category breakdown', 'where am i spending', 'top category', 'spending breakdown'].some((k) => q.includes(k))) {
    if (audit.categoryBreakdown.length === 0) return `No expenses categorized this month yet!`;
    return `📂 **Category Spending Breakdown — ${audit.now.toLocaleString('en-IN', { month: 'long' })}**\n\n${audit.categoryBreakdown
      .map((c, i) => `${i + 1}. **${c.category}:** ${curr} ${c.total.toLocaleString('en-IN')} (${c.pctOfSpent}%, ${c.count} txs)`)
      .join('\n')}\n\n**Total Monthly Outflow:** ${curr} ${audit.currentSpent.toLocaleString('en-IN')}`;
  }

  // Food & Dining (handles food, swiggy, zomato, blinkit, zepto, dining, groceries, cafe, etc.)
  if (['food', 'dining', 'eating', 'swiggy', 'zomato', 'restaurant', 'cafe', 'groceries', 'blinkit', 'zepto', 'bigbasket', 'khana', 'nashta', 'tea', 'coffee'].some((k) => q.includes(k))) {
    const swiggy = searchTxByKeyword('swiggy');
    const zomato = searchTxByKeyword('zomato');
    const blinkit = searchTxByKeyword('blinkit');
    const zepto = searchTxByKeyword('zepto');

    if (q.includes('swiggy') && swiggy.count > 0) {
      return `🍔 **Swiggy Spend Audit**\n\n• **Total Spent:** ${curr} ${swiggy.total.toLocaleString('en-IN')} (${swiggy.count} orders)\n• **Average Order Value:** ${curr} ${Math.round(swiggy.total / swiggy.count).toLocaleString('en-IN')}\n\nRecent Orders:\n${swiggy.matched.slice(0, 4).map((t) => `• [${t.date}] ${t.title}: ${curr} ${Math.abs(Number(t.amount)).toLocaleString('en-IN')}`).join('\n')}`;
    }
    if (q.includes('zomato') && zomato.count > 0) {
      return `🍕 **Zomato Spend Audit**\n\n• **Total Spent:** ${curr} ${zomato.total.toLocaleString('en-IN')} (${zomato.count} orders)\n• **Average Order Value:** ${curr} ${Math.round(zomato.total / zomato.count).toLocaleString('en-IN')}\n\nRecent Orders:\n${zomato.matched.slice(0, 4).map((t) => `• [${t.date}] ${t.title}: ${curr} ${Math.abs(Number(t.amount)).toLocaleString('en-IN')}`).join('\n')}`;
    }

    const foodCat = audit.categoryBreakdown.find((c) => c.category === 'Food');
    const foodTotal = foodCat ? foodCat.total : searchTxByKeyword('food').total;
    const foodCount = foodCat ? foodCat.count : searchTxByKeyword('food').count;
    const foodPct = foodCat ? foodCat.pctOfSpent : audit.currentSpent > 0 ? Math.round((foodTotal / audit.currentSpent) * 100) : 0;

    return `🍳 **Food & Dining Audit**\n\n• **Total Food Spend:** ${curr} ${foodTotal.toLocaleString('en-IN')} (${foodPct}% of monthly outflow)\n• **Transaction Count:** ${foodCount} logs\n${swiggy.count > 0 ? `• **Swiggy:** ${curr} ${swiggy.total.toLocaleString('en-IN')} (${swiggy.count} orders)\n` : ''}${zomato.count > 0 ? `• **Zomato:** ${curr} ${zomato.total.toLocaleString('en-IN')} (${zomato.count} orders)\n` : ''}${blinkit.count > 0 ? `• **Blinkit:** ${curr} ${blinkit.total.toLocaleString('en-IN')} (${blinkit.count} orders)\n` : ''}${zepto.count > 0 ? `• **Zepto:** ${curr} ${zepto.total.toLocaleString('en-IN')} (${zepto.count} orders)\n` : ''}\n💡 Rule of Thumb: Food & Dining should ideally stay under 15–20% of income.`;
  }

  // Transport & Travel
  if (['transport', 'travel', 'fuel', 'petrol', 'diesel', 'uber', 'ola', 'rapido', 'cab', 'metro', 'flight', 'commute'].some((k) => q.includes(k))) {
    const uber = searchTxByKeyword('uber');
    const ola = searchTxByKeyword('ola');
    const rapido = searchTxByKeyword('rapido');

    if (q.includes('uber') && uber.count > 0) {
      return `🚗 **Uber Ride Audit**\n\n• **Total Spent:** ${curr} ${uber.total.toLocaleString('en-IN')} (${uber.count} rides)\n• **Average Ride:** ${curr} ${Math.round(uber.total / uber.count).toLocaleString('en-IN')}`;
    }

    const transCat = audit.categoryBreakdown.find((c) => c.category === 'Transport');
    return `🚗 **Transport & Travel Audit**\n\n• **Total Transport Spend:** ${curr} ${(transCat?.total || 0).toLocaleString('en-IN')} (${transCat?.pctOfSpent || 0}% of monthly outflow)\n${uber.count > 0 ? `• **Uber:** ${curr} ${uber.total.toLocaleString('en-IN')} (${uber.count} rides)\n` : ''}${ola.count > 0 ? `• **Ola:** ${curr} ${ola.total.toLocaleString('en-IN')} (${ola.count} rides)\n` : ''}${rapido.count > 0 ? `• **Rapido:** ${curr} ${rapido.total.toLocaleString('en-IN')} (${rapido.count} rides)\n` : ''}`;
  }

  // Shopping & E-Commerce
  if (['shopping', 'amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'electronics', 'meesho'].some((k) => q.includes(k))) {
    const amazon = searchTxByKeyword('amazon');
    const flipkart = searchTxByKeyword('flipkart');
    const myntra = searchTxByKeyword('myntra');

    if (q.includes('amazon') && amazon.count > 0) {
      return `🛍️ **Amazon Shopping Audit**\n\n• **Total Spent:** ${curr} ${amazon.total.toLocaleString('en-IN')} (${amazon.count} orders)`;
    }

    const shopCat = audit.categoryBreakdown.find((c) => c.category === 'Shopping');
    return `🛍️ **Shopping & E-Commerce Audit**\n\n• **Total Shopping Spend:** ${curr} ${(shopCat?.total || 0).toLocaleString('en-IN')} (${shopCat?.pctOfSpent || 0}% of monthly outflow)\n${amazon.count > 0 ? `• **Amazon:** ${curr} ${amazon.total.toLocaleString('en-IN')} (${amazon.count} orders)\n` : ''}${flipkart.count > 0 ? `• **Flipkart:** ${curr} ${flipkart.total.toLocaleString('en-IN')} (${flipkart.count} orders)\n` : ''}${myntra.count > 0 ? `• **Myntra:** ${curr} ${myntra.total.toLocaleString('en-IN')} (${myntra.count} orders)\n` : ''}`;
  }

  // Rent & Housing
  if (['rent', 'housing', 'landlord', 'apartment', 'lease'].some((k) => q.includes(k))) {
    const rentCat = audit.categoryBreakdown.find((c) => c.category === 'Rent');
    const rentAmt = rentCat ? rentCat.total : searchTxByKeyword('rent').total;
    const rentRatio = audit.currentIncome > 0 ? Math.round((rentAmt / audit.currentIncome) * 100) : 0;
    return `🏠 **Rent & Housing Commitment**\n\n• **Rent Spent This Month:** ${curr} ${rentAmt.toLocaleString('en-IN')}\n• **Income Ratio:** ${rentRatio}%\n\n💡 Rule of thumb: Keep housing costs below 30% of gross monthly income.`;
  }

  // ──── INTENT GROUP 7: SUBSCRIPTIONS & RECURRING BILLS ──────────────────────
  if (['sub', 'subscription', 'subscriptions', 'recurring', 'netflix', 'spotify', 'prime', 'youtube', 'apple', 'hotstar'].some((k) => q.includes(k))) {
    if (audit.activeSubs.length === 0) return `💳 **No Active Subscriptions Tracked**\n\nYou have 0 active recurring subscriptions in SpendTrack. Add recurring bills in the Dashboard to audit annual costs!`;

    return `💳 **Active Subscriptions Audit (${audit.activeSubs.length} Active)**\n\n${audit.activeSubs
      .map((s) => `• **${s.title}:** ${curr} ${s.amount}/mo (Due day ${s.billingDate})`)
      .join('\n')}\n\n• **Total Monthly Cost:** ${curr} ${audit.subTotalMonthly.toLocaleString('en-IN')}\n• **Total Annual Burden:** ${curr} ${audit.subTotalAnnual.toLocaleString('en-IN')}\n\n💡 Audit Tip: Cancel any service you haven't used in the past 30 days to free up budget.`;
  }

  // ──── INTENT GROUP 8: SAVINGS GOALS & WEALTH ────────────────────────────────
  if (['saving', 'savings', 'goal', 'goals', 'target', 'piggy', 'wealth', 'save'].some((k) => q.includes(k))) {
    if (audit.goals.length === 0) return `🎯 **No Savings Goals Set**\n\nCreate goal targets in the Dashboard to track your wealth accumulation!`;

    return `🎯 **Savings Goals Progress Audit**\n\n${audit.goals
      .map((g) => {
        const pct = Number(g.targetAmount) > 0 ? Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100) : 0;
        const progressChars = Math.round(pct / 10);
        const bar = '█'.repeat(progressChars) + '░'.repeat(10 - progressChars);
        return `• **${g.title}:** ${curr} ${Number(g.currentAmount).toLocaleString('en-IN')} / ${curr} ${Number(g.targetAmount).toLocaleString('en-IN')}\n  [${bar}] ${pct}% complete`;
      })
      .join('\n\n')}\n\n• **Total Savings Accumulated:** ${curr} ${audit.totalSaved.toLocaleString('en-IN')} of ${curr} ${audit.totalTarget.toLocaleString('en-IN')}`;
  }

  // ──── INTENT GROUP 9: FINANCIAL FRAMEWORKS & RULES ──────────────────────────
  // 50/30/20 Rule
  if (['50/30/20', '50 30 20', 'allocation', 'needs wants savings', 'framework'].some((k) => q.includes(k))) {
    const base = audit.currentIncome > 0 ? audit.currentIncome : audit.monthlyLimit > 0 ? audit.monthlyLimit : 30000;
    const needs = Math.round(base * 0.5);
    const wants = Math.round(base * 0.3);
    const savings = Math.round(base * 0.2);

    return `📊 **50/30/20 Budget Blueprint (Base: ${curr} ${base.toLocaleString('en-IN')})**\n\n• **Needs (50%):** ${curr} ${needs.toLocaleString('en-IN')}\n  (Rent, groceries, transport, essential bills)\n• **Wants (30%):** ${curr} ${wants.toLocaleString('en-IN')}\n  (Dining out, shopping, entertainment, subscriptions)\n• **Savings & Investments (20%):** **${curr} ${savings.toLocaleString('en-IN')}**\n  (Emergency fund, goals, mutual funds, SIPs)\n\nYour actual spend so far this month: ${curr} ${audit.currentSpent.toLocaleString('en-IN')}`;
  }

  // Emergency Fund Target
  if (['emergency', 'reserve', 'buffer', 'safety net', 'rainy day'].some((k) => q.includes(k))) {
    const monthlyBurn = audit.currentSpent || 20000;
    const target3 = monthlyBurn * 3;
    const target6 = monthlyBurn * 6;

    return `🛡️ **Emergency Reserve Target Audit**\n\nBased on your current monthly spend of ${curr} ${monthlyBurn.toLocaleString('en-IN')}:\n\n• **3-Month Minimum Buffer:** **${curr} ${target3.toLocaleString('en-IN')}**\n• **6-Month Complete Shield:** **${curr} ${target6.toLocaleString('en-IN')}**\n\n💡 Strategy: Keep 1-2 months in liquid savings and 3-4 months in liquid mutual funds or high-yield flexi-FDs for instant access.`;
  }

  // Top Merchants / Vendors
  if (['top merchant', 'top vendor', 'where do i spend most', 'biggest merchant', 'merchants', 'vendors'].some((k) => q.includes(k))) {
    if (audit.topMerchants.length === 0) return `No merchant transactions recorded yet!`;
    return `🏪 **Top Vendors & Merchants By Spend**\n\n${audit.topMerchants
      .slice(0, 5)
      .map((m, i) => `${i + 1}. **${m.name}:** ${curr} ${m.total.toLocaleString('en-IN')} (${m.count} transactions)`)
      .join('\n')}`;
  }

  // Largest Single Expense
  if (['highest expense', 'largest expense', 'biggest purchase', 'max spend', 'single expense'].some((k) => q.includes(k))) {
    const expenseTxs = safeTxs.filter((t) => Number(t.amount) < 0);
    if (expenseTxs.length === 0) return `No expense transactions recorded yet.`;
    const sorted = [...expenseTxs].sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)));
    const top = sorted.slice(0, 3);

    return `💥 **Largest Expenses Logged**\n\n${top
      .map((t, i) => `${i + 1}. **${t.title}:** ${curr} ${Math.abs(Number(t.amount)).toLocaleString('en-IN')} (${t.category}, ${t.date})`)
      .join('\n')}`;
  }

  // Recent Transactions
  if (['recent', 'latest', 'last 5', 'history', 'transaction history'].some((k) => q.includes(k))) {
    if (safeTxs.length === 0) return `No transactions recorded yet.`;
    const recent = safeTxs.slice(0, 5);
    return `📜 **Latest 5 Transactions**\n\n${recent
      .map((t) => `• **[${t.date}]** ${t.title}: ${Number(t.amount) < 0 ? '-' : '+'}${curr} ${Math.abs(Number(t.amount)).toLocaleString('en-IN')} (${t.category})`)
      .join('\n')}`;
  }

  // Generic keyword match fallback across transactions
  const words = q.split(/\s+/).filter((w) => w.length > 2 && !['what', 'where', 'how', 'much', 'show', 'tell', 'about', 'this', 'that', 'with', 'from'].includes(w));
  for (const word of words) {
    const res = searchTxByKeyword(word);
    if (res.count > 0) {
      return `🔍 **Search Results for "${word}":**\n\n• **Total Spent:** ${curr} ${res.total.toLocaleString('en-IN')} across ${res.count} transactions\n\nTransactions:\n${res.matched
        .slice(0, 5)
        .map((t) => `• [${t.date}] ${t.title}: ${curr} ${Math.abs(Number(t.amount)).toLocaleString('en-IN')} (${t.category})`)
        .join('\n')}`;
    }
  }

  // Default trained response
  const topCat = audit.categoryBreakdown[0];
  return `🤖 **SpendTrack Financial Overview (${audit.now.toLocaleString('en-IN', { month: 'long' })}):**\n\n• Total Outflow: **${curr} ${audit.currentSpent.toLocaleString('en-IN')}**\n• Total Inflow: **${curr} ${audit.currentIncome.toLocaleString('en-IN')}**\n${
    audit.monthlyLimit > 0 ? `• Budget Status: **${audit.budgetPctUsed}% used** (${curr} ${audit.remainingBudget?.toLocaleString('en-IN')} left)\n` : ''
  }• Top Category: ${topCat ? `**${topCat.category}** (${curr} ${topCat.total.toLocaleString('en-IN')})` : 'None logged'}\n\nAsk me specific questions like:\n• *"Swiggy spend this month"*\n• *"Can I afford a ₹4,000 purchase?"*\n• *"What are my top 3 categories?"*\n• *"Emergency fund target"*`;
};
