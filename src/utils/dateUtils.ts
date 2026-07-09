import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth } from 'date-fns';

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateLong(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEEE, dd MMMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatTime(date: Date = new Date()): string {
  return format(date, 'hh:mm:ss a');
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a');
  } catch {
    return dateStr;
  }
}

export function getMonthDays(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  return eachDayOfInterval({ start, end });
}

export function isDateToday(dateStr: string): boolean {
  try {
    return isToday(parseISO(dateStr));
  } catch {
    return false;
  }
}

export function isDateInCurrentMonth(dateStr: string): boolean {
  try {
    return isSameMonth(parseISO(dateStr), new Date());
  } catch {
    return false;
  }
}

export function getWeekStart(dateStr: string): string {
  const d = parseISO(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return format(mon, 'yyyy-MM-dd');
}

export function getMonthRange(dateStr: string): { start: string; end: string } {
  const d = parseISO(dateStr);
  return {
    start: format(startOfMonth(d), 'yyyy-MM-dd'),
    end: format(endOfMonth(d), 'yyyy-MM-dd'),
  };
}

export function monthLabel(dateStr: string): string {
  try {
    return format(parseISO(dateStr + '-01'), 'MMMM yyyy');
  } catch {
    return dateStr;
  }
}

export function getReportFilename(type: string, subject?: string): string {
  const d = format(new Date(), 'dd-MM-yyyy');
  return subject ? `${type}_${subject.replace(/\s+/g, '_')}_${d}` : `${type}_${d}`;
}
