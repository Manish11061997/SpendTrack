import { Transaction, BudgetConfig, Subscription, SavingsGoal } from '../types';
import { formatCurrency } from './currency';

export const generateMonthlyPdfReport = ({
  transactions,
  budget,
  subscriptions = [],
  savingsGoals = [],
  monthKey
}: {
  transactions: Transaction[];
  budget: BudgetConfig;
  subscriptions?: Subscription[];
  savingsGoals?: SavingsGoal[];
  monthKey: string;
}) => {
  const currency = budget?.currency || 'INR';
  const [yearStr, monthStr] = monthKey.split('-');
  const monthDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const monthTxs = transactions.filter(t => t.date && t.date.startsWith(monthKey));
  const incomeTxs = monthTxs.filter(t => Number(t.amount) > 0);
  const expenseTxs = monthTxs.filter(t => Number(t.amount) < 0);

  const totalIncome = incomeTxs.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = Math.abs(expenseTxs.reduce((sum, t) => sum + Number(t.amount), 0));
  const netSavings = totalIncome - totalExpense;

  const categories = ['Food', 'Transport', 'Rent', 'Shopping', 'Other'];
  const categoryBreakdown = categories.map(cat => {
    const amount = Math.abs(
      expenseTxs
        .filter(t => t.category === cat)
        .reduce((sum, t) => sum + Number(t.amount), 0)
    );
    const limit = budget?.categoryLimits?.[cat as keyof typeof budget.categoryLimits] || 0;
    return { category: cat, amount, limit };
  });

  const reportHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>SpendTrack Financial Report - ${monthName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e1e2d; padding: 40px; margin: 0; }
          .header { display: flex; justify-content: space-between; align-items: center; border-b: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 28px; font-weight: 900; color: #4f46e5; letter-spacing: -0.5px; }
          .title { font-size: 16px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
          .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 12px; }
          .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .card-val { font-size: 22px; font-weight: 800; margin-top: 6px; }
          .val-income { color: #10b981; }
          .val-expense { color: #ef4444; }
          .val-net { color: #4f46e5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          th { background: #f1f5f9; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 11px; }
          .section-title { font-size: 16px; font-weight: 800; margin-bottom: 12px; color: #0f172a; }
          .footer { margin-top: 50px; font-size: 11px; color: #94a3b8; text-align: center; border-t: 1px solid #e2e8f0; padding-top: 15px; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">SpendTrack</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Smart Financial Intelligence Statement</div>
          </div>
          <div style="text-align: right;">
            <div class="title">${monthName}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Generated on ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="cards">
          <div class="card">
            <div class="card-title">Total Inflow (Income)</div>
            <div class="card-val val-income">${formatCurrency(totalIncome, currency)}</div>
          </div>
          <div class="card">
            <div class="card-title">Total Outflow (Expenses)</div>
            <div class="card-val val-expense">${formatCurrency(totalExpense, currency)}</div>
          </div>
          <div class="card">
            <div class="card-title">Net Savings / Surplus</div>
            <div class="card-val val-net">${formatCurrency(netSavings, currency)}</div>
          </div>
        </div>

        <div class="section-title">Category Spending & Limits</div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Spent Amount</th>
              <th>Category Limit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${categoryBreakdown.map(c => `
              <tr>
                <td><strong>${c.category}</strong></td>
                <td>${formatCurrency(c.amount, currency)}</td>
                <td>${c.limit > 0 ? formatCurrency(c.limit, currency) : 'No Limit'}</td>
                <td>
                  ${c.limit > 0 && c.amount > c.limit 
                    ? '<span style="color: #ef4444; font-weight:700;">Over Limit</span>' 
                    : '<span style="color: #10b981; font-weight:700;">Within Budget</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${savingsGoals.length > 0 ? `
          <div class="section-title">Savings Goals Progress</div>
          <table>
            <thead>
              <tr>
                <th>Goal Title</th>
                <th>Saved</th>
                <th>Target</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              ${savingsGoals.map(g => `
                <tr>
                  <td><strong>${g.title}</strong></td>
                  <td>${formatCurrency(g.currentAmount, currency)}</td>
                  <td>${formatCurrency(g.targetAmount, currency)}</td>
                  <td><strong>${Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100)}%</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${subscriptions.length > 0 ? `
          <div class="section-title">Active Recurring Subscriptions</div>
          <table>
            <thead>
              <tr>
                <th>Subscription Title</th>
                <th>Amount</th>
                <th>Billing Date</th>
              </tr>
            </thead>
            <tbody>
              ${subscriptions.filter(s => s.isActive !== false).map(s => `
                <tr>
                  <td><strong>${s.title}</strong></td>
                  <td>${formatCurrency(s.amount, currency)}</td>
                  <td>${s.billingDate ? `Day ${s.billingDate} of month` : 'Monthly'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          SpendTrack Confidential Report • Page 1 of 1 • Keep your personal finances safe.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
    </html>
  `;

  // Mobile-compatible download: Blob → object URL → anchor click
  const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const fileName = `SpendTrack_Report_${monthName.replace(/\s+/g, '_')}.html`;
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
};
