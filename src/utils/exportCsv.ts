import { Transaction } from '../types';

export const exportTransactionsToCSV = (transactions: Transaction[], filename = 'spendtrack_transactions.csv') => {
  if (!transactions || transactions.length === 0) {
    alert('No transactions available to export.');
    return;
  }

  const headers = ['Date', 'Time', 'Title', 'Category', 'Type', 'Amount', 'Label', 'Notes', 'Tags'];
  const rows = transactions.map(t => {
    const isExpense = t.amount < 0;
    const absAmt = Math.abs(t.amount).toFixed(2);
    const cleanTitle = `"${(t.title || '').replace(/"/g, '""')}"`;
    const cleanNotes = `"${(t.notes || '').replace(/"/g, '""')}"`;
    const cleanTags = `"${(t.tags || []).join(', ')}"`;

    return [
      t.date,
      t.time || '',
      cleanTitle,
      t.category,
      isExpense ? 'Expense' : 'Income',
      absAmt,
      t.label || '',
      cleanNotes,
      cleanTags
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
