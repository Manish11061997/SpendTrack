export interface ExchangeRates {
  [currency: string]: number; // Relative to USD base
}

export const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  JPY: 155.0,
  CAD: 1.36,
  AUD: 1.51,
  AED: 3.67,
  SGD: 1.35,
};

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

const CACHE_KEY = 'spendtrack_exchange_rates_cache';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Fetch live exchange rates relative to USD with fallback & caching
 */
export async function fetchLiveExchangeRates(): Promise<ExchangeRates> {
  // Check local storage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { rates, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL_MS && rates) {
        return rates;
      }
    }
  } catch (e) {
    // Ignore cache parse failure
  }

  // Fetch live rates from free Open ER API
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const rates: ExchangeRates = data.rates;
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ rates, timestamp: Date.now() })
        );
        return rates;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch live exchange rates, using fallback:', err);
  }

  return FALLBACK_RATES;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customRates?: ExchangeRates
): number {
  if (!amount || fromCurrency === toCurrency) return amount;

  const rates = customRates || FALLBACK_RATES;
  const fromRate = rates[fromCurrency.toUpperCase()] || FALLBACK_RATES[fromCurrency.toUpperCase()] || 1;
  const toRate = rates[toCurrency.toUpperCase()] || FALLBACK_RATES[toCurrency.toUpperCase()] || 1;

  // Convert to USD base first, then to target currency
  const inUSD = amount / fromRate;
  const converted = inUSD * toRate;

  return Math.round(converted * 100) / 100;
}
