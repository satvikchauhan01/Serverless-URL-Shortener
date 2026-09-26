const DAY_MS = 24 * 60 * 60 * 1000;

export const EXPIRY_PRESETS = [
  { id: 'never', label: 'Never' },
  { id: '1d', label: '1 day', days: 1 },
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: 'custom', label: 'Pick a date' },
];

// Turns the picker's state into what the API expects: an ISO timestamp, or null for a
// link that never expires. A picked date lasts until the end of that day, local time.
export function expiryFromChoice(choice, customDate, now = Date.now()) {
  if (choice === 'never') return { value: null };
  if (choice === 'custom') {
    if (!customDate) return { error: 'Pick the last day the link should work.' };
    const endOfDay = new Date(`${customDate}T23:59:59`);
    if (Number.isNaN(endOfDay.getTime()) || endOfDay.getTime() <= now) {
      return { error: 'Pick a date in the future.' };
    }
    return { value: endOfDay.toISOString() };
  }
  const preset = EXPIRY_PRESETS.find((option) => option.id === choice);
  return { value: new Date(now + preset.days * DAY_MS).toISOString() };
}

// For <input type="date" min=...>: tomorrow, in local time.
export function tomorrowAsDateInput(now = Date.now()) {
  const tomorrow = new Date(now + DAY_MS);
  const pad = (n) => String(n).padStart(2, '0');
  return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
}
