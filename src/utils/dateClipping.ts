export function getMonthRange(month: string): { start: string; end: string } {
  const [year, m] = month.split('-').map(Number);
  const start = `${year}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const end = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function calculateDaysRented(
  start: string,
  end: string,
  monthStart: string,
  monthEnd: string,
): number {
  const clippedStart = start < monthStart ? monthStart : start;
  const clippedEnd = end > monthEnd ? monthEnd : end;
  const startMs = new Date(clippedStart).getTime();
  const endMs = new Date(clippedEnd).getTime();
  return Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
}
