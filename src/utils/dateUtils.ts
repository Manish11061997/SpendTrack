/**
 * Returns YYYY-MM-DD string in local timezone (prevents UTC offset date-shift bugs)
 */
export function getLocalDateString(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Safely parses any date string (ISO, DD/MM/YYYY, DD Mon YYYY, etc.) into a local YYYY-MM-DD string
 * without causing UTC timezone backward/forward day shifts.
 */
export function parseLocalDate(raw: string): string {
  if (!raw || typeof raw !== 'string') return getLocalDateString();
  const clean = raw.replace(/["']/g, '').trim();

  // 1. Direct ISO match: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // 2. Format with month name: e.g. "05 Oct 2026", "5 October 2026", "05-Oct-2026"
  const monthNameMatch = clean.match(/^(\d{1,2})[\s\-/.]([a-zA-Z]{3,9})[\s\-/.]([0-9]{2,4})/);
  if (monthNameMatch) {
    const day = parseInt(monthNameMatch[1], 10);
    const monthStr = monthNameMatch[2].toLowerCase().slice(0, 3);
    let year = parseInt(monthNameMatch[3], 10);
    if (year < 100) year += 2000;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIdx = months.indexOf(monthStr);
    if (monthIdx !== -1) {
      return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Numeric 3-part split: DD/MM/YYYY or MM/DD/YYYY
  const parts = clean.split(/[-/.]/);
  if (parts.length >= 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;

    // Default to Indian/UK standard DD/MM/YYYY
    let day = p0;
    let month = p1;
    if (p1 > 12 && p0 <= 12) {
      day = p1;
      month = p0;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Fallback using local getFullYear, getMonth, getDate
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return getLocalDateString(d);
  }

  return getLocalDateString();
}

/**
 * Returns formatted time string in local timezone (e.g. "2:45 PM")
 */
export function getLocalTimeString(d: Date = new Date()): string {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
