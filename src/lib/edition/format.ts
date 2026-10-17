const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Formats the edition's YYYY-MM-DD date without depending on server timezone. */
export function formatEditionDate(date: string): string {
  return LONG_DATE.format(new Date(`${date}T00:00:00Z`));
}
