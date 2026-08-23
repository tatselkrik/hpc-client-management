import type { Appointment, CalendarView } from "../../appShared";

export const PHILIPPINE_TIME_ZONE = "Asia/Manila";
export const PHILIPPINE_UTC_OFFSET = "+08:00";

const pad = (value: number) => value.toString().padStart(2, "0");

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const fromDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};

export const addCalendarDays = (dateKey: string, amount: number) => {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
};

export const startOfCalendarWeek = (dateKey: string) => {
  const date = fromDateKey(dateKey);
  const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + mondayOffset);
  return toDateKey(date);
};

export const getCalendarDates = (anchorDate: string, view: CalendarView) => {
  if (view === "day") return [anchorDate];
  const start = startOfCalendarWeek(anchorDate);
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index));
};

export const toPhilippineIso = (dateKey: string, time: string) =>
  `${dateKey}T${time.length === 5 ? `${time}:00` : time}${PHILIPPINE_UTC_OFFSET}`;

export const getPhilippineDateKey = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

export const todayPhilippineDateKey = () =>
  getPhilippineDateKey(new Date().toISOString());

export const formatPhilippineTime = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: PHILIPPINE_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

export const formatPhilippineDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: PHILIPPINE_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

export const formatPhilippineClockDate = (date: Date) =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: PHILIPPINE_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);

export const formatCalendarDate = (dateKey: string, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-PH", options ?? {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(fromDateKey(dateKey));

export const formatCalendarRange = (dates: string[]) => {
  if (dates.length === 0) return "";
  if (dates.length === 1) {
    return formatCalendarDate(dates[0], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const first = formatCalendarDate(dates[0], { month: "short", day: "numeric" });
  const last = formatCalendarDate(dates[dates.length - 1], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${first} – ${last}`;
};

export const appointmentDisplayName = (appointment: Appointment) =>
  appointment.client_stage_at_booking === "existing"
    ? appointment.clients?.client_name?.trim() || "Existing client"
    : appointment.provisional_client_name?.trim() || "First-timer";

export const appointmentStatusLabel = (status: Appointment["status"]) =>
  status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
