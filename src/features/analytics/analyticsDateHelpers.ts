export const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const parseDateKeyAsLocalDate = (dateKey: string) => {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return new Date(year, month - 1, day);
};

export const addDaysToDateKey = (dateKey: string, dayOffset: number) => {
  const date = parseDateKeyAsLocalDate(dateKey);
  if (!date) return dateKey;

  date.setDate(date.getDate() + dayOffset);
  return toLocalDateKey(date);
};

export const getInclusiveDaySpan = (startDateKey: string, endDateKey: string) => {
  const startDate = parseDateKeyAsLocalDate(startDateKey);
  const endDate = parseDateKeyAsLocalDate(endDateKey);

  if (!startDate || !endDate) return 0;

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1
  );
};
