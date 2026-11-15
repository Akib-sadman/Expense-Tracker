// A transaction date means "a calendar day", but it is stored as a timestamp and the server buckets by UTC month.
// Sending local midnight puts a Dhaka user's Nov 1 on Oct 31 (18:00Z). Noon UTC keeps the picked day on the
// right side of the month boundary on the server and on screen for every zone from UTC-12 to UTC+11.

export function calendarDateToUtcNoon(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12))
}

export function ymdToUtcNoon(ymd: string): Date {
  return new Date(`${ymd}T12:00:00.000Z`)
}

// The inclusive UTC span of the calendar day a date picker showed, for filtering stored timestamps.
export function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

export function utcDayEnd(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999))
}

// "Today" and "this month" as the user's own calendar sees them (toISOString would give UTC's).
export function todayYmd(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function currentMonth(now: Date = new Date()): string {
  return todayYmd(now).slice(0, 7)
}
