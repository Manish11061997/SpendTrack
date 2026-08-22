import { Transaction } from '../types';

export interface ParsedCsvRow {
  date: string;
  title: string;
  amount: number;
  category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other';
  label: 'Personal' | 'Work' | 'Freelance' | 'Subscription' | 'General';
  notes?: string;
  isDuplicate?: boolean;
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
  let amountIdx = headers.findIndex(h => h === 'amount' || h.includes('value') || h.includes('sum'));
  let outflowIdx = headers.findIndex(h => h.includes('debit') || h.includes('expense') || h.includes('outflow') || h.includes('withdrawal'));
  let inflowIdx = headers.findIndex(h => h.includes('credit') || h.includes('income') || h.includes('inflow') || h.includes('deposit'));
  let catIdx = headers.findIndex(h => h.includes('cat') || h.includes('type'));
  let notesIdx = headers.findIndex(h => h.includes('note') || h.includes('remark') || h.includes('memo'));

  // Fallbacks if indices not matched cleanly
  if (dateIdx === -1) dateIdx = 0;
  if (titleIdx === -1) titleIdx = 1;
  if (amountIdx === -1 && outflowIdx === -1 && inflowIdx === -1) amountIdx = 2;

  const validRows: ParsedCsvRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length < 2) continue;

    try {
      const rawDate = row[dateIdx] || new Date().toISOString().split('T')[0];
      const parsedDate = normalizeDate(rawDate);
      const rawTitle = row[titleIdx] || 'Imported Transaction';

      let amount = 0;
      if (amountIdx !== -1 && row[amountIdx]) {
        amount = parseFloat(row[amountIdx].replace(/,/g, ''));
      } else {
        const outflow = outflowIdx !== -1 && row[outflowIdx] ? parseFloat(row[outflowIdx].replace(/,/g, '')) : 0;
        const inflow = inflowIdx !== -1 && row[inflowIdx] ? parseFloat(row[inflowIdx].replace(/,/g, '')) : 0;
        if (inflow > 0) {
          amount = inflow;
        } else if (outflow > 0) {
          amount = -Math.abs(outflow);
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
      inQuotes = !inQuotes;
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

function normalizeDate(raw: string): string {
  const clean = raw.replace(/["']/g, '').trim();
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (day > 12) {
      // DD/MM/YYYY
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

function inferCategory(title: string, rawCat: string): 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other' {
  const text = (title + ' ' + rawCat).toLowerCase();
  if (/swiggy|zomato|starbucks|mcdonald|restaurant|cafe|food|grocery|d Mart|blinkit|zepto|supermarket/i.test(text)) return 'Food';
  if (/uber|ola|rapido|fuel|petrol|shell|metro|bus|train|flight|parking|fastag/i.test(text)) return 'Transport';
  if (/rent|landlord|maintenance|society|housing/i.test(text)) return 'Rent';
  if (/amazon|flipkart|myntra|zara|h&m|uniqlo|shopping|store|apparel|electronics/i.test(text)) return 'Shopping';
  return 'Other';
}
