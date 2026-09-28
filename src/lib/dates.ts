function pad(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

// Local calendar day as YYYY-MM-DD.
export function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// True when `previousKey` is exactly the day before `currentKey`.
export function isConsecutiveDay(previousKey: string, currentKey: string): boolean {
  if (!previousKey) return false;
  const previous = new Date(`${previousKey}T00:00:00`).getTime();
  const current = new Date(`${currentKey}T00:00:00`).getTime();
  return Math.round((current - previous) / 86400000) === 1;
}

// Whole days elapsed since `dateKey` (Infinity if empty).
export function daysSince(dateKey: string): number {
  if (!dateKey) return Infinity;
  const then = new Date(`${dateKey}T00:00:00`).getTime();
  const now = new Date(`${todayKey()}T00:00:00`).getTime();
  return Math.round((now - then) / 86400000);
}
