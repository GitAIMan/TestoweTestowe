export const DEFAULT_LOCK_DAYS_BEFORE = 14;

export function computeClientLockDate(
  eventDateFrom: Date | string,
  lockDaysBefore: number = DEFAULT_LOCK_DAYS_BEFORE
): Date {
  const d = new Date(eventDateFrom);
  d.setDate(d.getDate() - lockDaysBefore);
  return d;
}

export function isClientLocked(
  eventDateFrom: Date | string,
  lockDaysBefore: number = DEFAULT_LOCK_DAYS_BEFORE,
  now: Date = new Date()
): boolean {
  return now >= computeClientLockDate(eventDateFrom, lockDaysBefore);
}
