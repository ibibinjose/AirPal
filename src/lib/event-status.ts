/**
 * Honest registration-window check for Luma-style closed states.
 * Compares calendar dates (YYYY-MM-DD); anything unparseable stays open —
 * the page must never claim "ended" on bad data.
 */
export function isEventEnded(dateStr: string | undefined, todayStr: string | undefined): boolean {
  if (!dateStr || !todayStr) return false;
  const at = new Date(`${dateStr}T00:00:00`);
  const today = new Date(`${todayStr}T00:00:00`);
  if (Number.isNaN(at.getTime()) || Number.isNaN(today.getTime())) return false;
  return at.getTime() < today.getTime();
}
