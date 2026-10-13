import { Transaction } from '../types';
import { getLocalDateString, parseLocalDate } from './dateUtils';

export interface ParsedCsvRow {
  date: string;
  title: string;
  amount: number;
  category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other';
  label: 'Personal' | 'Work' | 'Freelance' | 'Subscription' | 'General';
  notes?: string;
  isDuplicate?: boolean;
}

function parseAmountString(str: string): number {
  if (!str) return 0;
  let clean = str.replace(/[₹$,€£\s]/g, '').trim();
  const isDr = /dr\.?$/i.test(clean) || (clean.startsWith('(') && clean.endsWith(')'));
  const isCr = /cr\.?$/i.test(clean);
  clean = clean.replace(/[()]/g, '').replace(/dr\.?$/i, '').replace(/cr\.?$/i, '').replace(/,/g, '');
  let val = parseFloat(clean);
  if (isNaN(val)) return 0;
  if (isDr) val = -Math.abs(val);
  else if (isCr) val = Math.abs(val);
  return val;
}

/**
  Parse raw CSV content string into transaction drafts
 */
export function parseBankCsv(
  csvText: string,
  existingTxs: Transaction[] = []
): { valid: ParsedCsvRow[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { valid: [], errors: ['CSV file is empty or has no data rows.'] };
  }

  // Parse header
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());

  // Find column indices
  let dateIdx = headers.findIndex(h => h.includes('date') || h.includes('time') || h.includes('day'));
  let titleIdx = headers.findIndex(h => h.includes('desc') || h.includes('title') || h.includes('payee') || h.includes('merchant') || h.includes('particulars') || h.includes('name'));
  let outflowIdx = headers.findIndex(h => h.includes('debit') || h.includes('expense') || h.includes('outflow') || h.includes('withdrawal'));
  let inflowIdx = headers.findIndex(h => h.includes('credit') || h.includes('income') || h.includes('inflow') || h.includes('deposit'));
  let amountIdx = headers.findIndex(h => !h.includes('date') && !h.includes('time') && !h.includes('balance') && (h === 'amount' || h.includes('amount') || h.includes('value') || h.includes('sum')));
  let typeIdx = headers.findIndex(h => h === 'type' || h.includes('type'));
  let catIdx = headers.findIndex(h => h.includes('category') || (h.includes('cat') && !h.includes('type')));
  let notesIdx = headers.findIndex(h => h.includes('note') || h.includes('remark') || h.includes('memo'));

  // If there are separate debit and credit columns, prefer them over a generic amount column
  const hasDebitCredit = outflowIdx !== -1 || inflowIdx !== -1;
  if (hasDebitCredit && amountIdx !== -1 && headers[amountIdx] !== 'amount') {
    amountIdx = -1;
  }

  // Fallbacks if indices not matched cleanly
  if (dateIdx === -1) dateIdx = 0;
  if (titleIdx === -1) titleIdx = 1;
  if (amountIdx === -1 && !hasDebitCredit) amountIdx = 2;

  const validRows: ParsedCsvRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length < 2) continue;

    try {
      const rawDate = row[dateIdx] || getLocalDateString();
      const parsedDate = parseLocalDate(rawDate);
      const rawTitle = row[titleIdx] || 'Imported Transaction';

      let amount = 0;
      if (hasDebitCredit && (outflowIdx !== -1 || inflowIdx !== -1)) {
        const rawOutflow = outflowIdx !== -1 && row[outflowIdx] ? parseAmountString(row[outflowIdx]) : 0;
        const rawInflow = inflowIdx !== -1 && row[inflowIdx] ? parseAmountString(row[inflowIdx]) : 0;
        if (rawInflow > 0) {
          amount = rawInflow;
        } else if (rawOutflow > 0) {
          amount = -Math.abs(rawOutflow);
        }
      } else if (amountIdx !== -1 && row[amountIdx]) {
        amount = parseAmountString(row[amountIdx]);
      }

      // Check type column (e.g. from app's own export: "Expense" or "Income")
      if (typeIdx !== -1 && row[typeIdx]) {
        const tVal = row[typeIdx].toLowerCase();
        if (tVal.includes('expense') || tVal.includes('debit') || tVal.includes('outflow')) {
          amount = -Math.abs(amount);
        } else if (tVal.includes('income') || tVal.includes('credit') || tVal.includes('inflow')) {
          amount = Math.abs(amount);
        }
      }

      if (isNaN(amount) || amount === 0) continue;

      const rawCat = catIdx !== -1 ? row[catIdx] : '';
      const category = inferCategory(rawTitle, rawCat);
      const notes = notesIdx !== -1 ? row[notesIdx] : 'Imported via CSV';

      // Duplicate check: matching date and amount
      const isDuplicate = existingTxs.some(
        tx => tx.date === parsedDate && Math.abs(tx.amount - amount) < 0.01
      );

      validRows.push({
        date: parsedDate,
        title: rawTitle.slice(0, 50),
        amount,
        category,
        label: 'Personal',
        notes,
        isDuplicate
      });
    } catch (e) {
      errors.push(`Row ${i + 1}: Failed to parse.`);
    }
  }

  return { valid: validRows, errors };
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function inferCategory(title: string, rawCat: string): 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other' {
  const text = (title + ' ' + rawCat).toLowerCase();
  if (/swiggy|zomato|starbucks|mcdonald|restaurant|cafe|food|grocery|d Mart|blinkit|zepto|supermarket/i.test(text)) return 'Food';
  if (/uber|ola|rapido|fuel|petrol|shell|metro|bus|train|flight|parking|fastag/i.test(text)) return 'Transport';
  if (/rent|landlord|maintenance|society|housing/i.test(text)) return 'Rent';
  if (/amazon|flipkart|myntra|zara|h&m|uniqlo|shopping|store|apparel|electronics/i.test(text)) return 'Shopping';
  return 'Other';
}
