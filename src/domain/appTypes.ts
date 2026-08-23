export type Section =
  | "dashboard"
  | "clients"
  | "calendar"
  | "analytics"
  | "careTeam"
  | "profile"
  | "settings"
  | "about";

export type ClientTab =
  | "overview"
  | "fourPs"
  | "notes"
  | "documents"
  | "assessments"
  | "cssrs";

export type SortMode = "alphabetical" | "last_created" | "last_modified";
export type UploadDateFilter = "all" | "today" | "last_7_days" | "this_month" | "this_year";
export type ThemeMode = "light" | "dark" | "clinic" | "clinic-dark";
export type AnnouncementPriority = "Info" | "Important" | "Urgent";
