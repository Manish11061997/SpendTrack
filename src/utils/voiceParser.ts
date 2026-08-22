export interface ParsedVoiceCommand {
  type: 'expense' | 'income';
  amount: number;
  title: string;
  category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other';
  rawTranscript: string;
  notes?: string;
}

/**
 * Parses spoken phrases into structured transaction fields
 * Examples:
 * - "Spent 250 rupees on dinner" -> Expense, 250, Food, "Dinner"
 * - "Paid 500 for uber taxi" -> Expense, 500, Transport, "Uber taxi"
 * - "Received 15000 freelance payment" -> Income, 15000, Other, "Freelance payment"
 * - "Shopping 3000 zara" -> Expense, 3000, Shopping, "Zara"
 */
export function parseVoiceTranscript(transcript: string): ParsedVoiceCommand {
  const text = transcript.trim().toLowerCase();

  // 1. Detect type: income vs expense
  const isIncome = /\b(income|salary|received|got|credited|bonus|earned|deposit)\b/i.test(text);
  const type: 'expense' | 'income' = isIncome ? 'income' : 'expense';

  // 2. Extract numeric amount
  // Matches "250", "250.50", "2,500", "50k", etc.
  let amount = 0;
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    amount = parseFloat(kMatch[1]) * 1000;
  } else {
    const numMatch = text.match(/\b(?:\$|₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\b/i);
    if (numMatch) {
      amount = parseFloat(numMatch[1].replace(/,/g, ''));
    }
  }

  // 3. Detect Category
  let category: 'Food' | 'Transport' | 'Rent' | 'Shopping' | 'Other' = 'Other';
  if (/\b(food|dinner|lunch|breakfast|swiggy|zomato|coffee|restaurant|tea|cafe|grocery|eat|eating|pizza|burger)\b/i.test(text)) {
    category = 'Food';
  } else if (/\b(uber|ola|rapido|cab|taxi|fuel|petrol|diesel|bus|train|metro|flight|auto|parking|travel|transport)\b/i.test(text)) {
    category = 'Transport';
  } else if (/\b(rent|house rent|room rent|flat|maintenance|landlord)\b/i.test(text)) {
    category = 'Rent';
  } else if (/\b(shopping|clothes|zara|h&m|amazon|flipkart|myntra|shoes|electronics|mall|dress|buy)\b/i.test(text)) {
    category = 'Shopping';
  }

  // 4. Extract Title / Description
  let cleanTitle = text
    .replace(/\b(spent|paid|received|credited|for|on|rupees|rs|inr|dollars|\$|at)\b/gi, '')
    .replace(/\b(\d+(?:\.\d+)?)\s*k\b/gi, '')
    .replace(/\b(?:\$|₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\b/gi, '')
    .trim();

  // Capitalize first letter
  cleanTitle = cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : (isIncome ? 'Income Credit' : 'Voice Logged Expense');

  return {
    type,
    amount: Math.abs(amount),
    title: cleanTitle.slice(0, 40),
    category,
    rawTranscript: transcript
  };
}
