export const getCurrencyLocale = (code: string = 'INR'): string => {
  switch (code.toUpperCase()) {
    case 'INR': return 'en-IN';
    case 'USD': return 'en-US';
    case 'EUR': return 'en-IE'; // English with Euros is very readable
    case 'GBP': return 'en-GB';
    case 'AED': return 'en-AE';
    default: return 'en-US';
  }
};

export const formatCurrency = (val: number, code: string = 'INR', maxFractionDigits: number = 0): string => {
  const safeVal = (typeof val !== 'number' || isNaN(val) || !isFinite(val)) ? 0 : val;
  const locale = getCurrencyLocale(code);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: (code || 'INR').toUpperCase(),
    maximumFractionDigits: maxFractionDigits
  }).format(safeVal);
};

export const getCurrencySymbol = (code: string = 'INR'): string => {
  switch (code.toUpperCase()) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'AED': return 'AED ';
    case 'INR':
    default: return '₹';
  }
};

export const isSubscriptionDoubleCounted = (subName: string, txTitle: string): boolean => {
  const clean = (str: string) => 
    str.toLowerCase()
       .replace(/[^a-z0-9\s]/g, '') // Keep spaces so we can do word-based matching
       .replace(/\b(payment|membership|subscription|premium|family|monthly|sub)\b/g, '')
       .trim()
       .replace(/\s+/g, ' ');
  const cleanSub = clean(subName);
  const cleanTx = clean(txTitle);
  if (!cleanSub || !cleanTx) return false;
  
  // Exact match after cleaning
  if (cleanSub === cleanTx) return true;
  
  // Substring match
  if (cleanTx.includes(cleanSub) || cleanSub.includes(cleanTx)) return true;

  // Keyword overlap matching (matches distinctive brand terms e.g. Spotify, Netflix, Adobe)
  const STOP_WORDS = new Set(['the', 'and', 'for', 'via', 'app', 'pay', 'bill', 'order', 'card', 'auto', 'debit', 'plan', 'charge', 'service']);
  const subWords = cleanSub.split(' ').filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  const txWords = cleanTx.split(' ').filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  return subWords.some(w => txWords.includes(w));
};

/**
 * Formats a raw number string with commas for live input fields (e.g. 100000 -> "1,00,000" for INR)
 */
export const formatInputAmount = (val: string | number, currencyCode: string = 'INR'): string => {
  if (val === undefined || val === null || val === '') return '';
  const strVal = String(val).replace(/,/g, '');
  if (!strVal) return '';

  const parts = strVal.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

  if (!integerPart && decimalPart) return '0' + decimalPart;
  const num = parseInt(integerPart, 10);
  if (isNaN(num)) return strVal;

  const locale = getCurrencyLocale(currencyCode);
  const formattedInteger = num.toLocaleString(locale);
  return formattedInteger + decimalPart;
};

/**
 * Parses a comma-formatted string back to clean numeric string (e.g. "1,00,000.50" -> "100000.50")
 */
export const parseRawAmount = (val: string): string => {
  if (!val) return '';
  return val.replace(/,/g, '');
};
