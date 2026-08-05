export type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  email?: string | null;
  avatar_path?: string | null;
  avatar_url?: string | null;
  hpc_representative_name?: string | null;
  is_active?: boolean | null;
};


export type CareTeamInviteForm = {
  full_name: string;
  email: string;
  role: string;
  hpc_representative_name: string;
  temporary_password: string;
  confirm_temporary_password: string;
};


export type CareTeamMemberView = {
  id: string;
  full_name: string;
  email?: string | null;
  role: string;
  avatar_url?: string | null;
  hpc_representative_name?: string | null;
  is_main_admin?: boolean;
};

export type ClientCategory = {
  id: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Section = "dashboard" | "clients" | "analytics" | "careTeam" | "profile" | "settings" | "about";
export type ClientTab =
  | "overview"
  | "fourPs"
  | "notes"
  | "documents"
  | "assessments"
  | "cssrs";
export type SortMode = "alphabetical" | "last_created" | "last_modified";
export type UploadDateFilter = "all" | "today" | "last_7_days" | "this_month" | "this_year";
export type ClientStatus = "Active" | "Terminated";
export type ThemeMode = "light" | "dark" | "clinic" | "clinic-dark";
export type AnnouncementPriority = "Info" | "Important" | "Urgent";
export type IntakeTimelineGrouping = "month" | "year";
export type IntakeMonthRange = "6M" | "12M" | "THIS_YEAR" | "ALL";
export type IntakeYearRange = "3Y" | "5Y" | "THIS_YEAR" | "ALL";
export type AnalyticsDateRange = "LAST_30_DAYS" | "LAST_90_DAYS" | "THIS_YEAR" | "CUSTOM" | "ALL";
export type AnalyticsDateBasis = "intake" | "created";
export type AnalyticsStatusFilter = "all" | ClientStatus;
export type AnalyticsCategoryFilter = string;
export type AnalyticsCssrsRiskFilter =
  | "all"
  | "pending"
  | "completed"
  | "elevated"
  | "recent_behavior"
  | "severity_4_5";

export type AnalyticsDrilldownClient = {
  id: string;
  client_name: string | null;
  status: ClientStatus;
  category_path: string;
  intake_date: string | null;
  counselling_reasons: string[];
  cssrs_risk_label: string;
};

export type AnalyticsDataQualityItem = {
  label: string;
  value: number;
  denominator?: number;
  helpText: string;
  clients?: AnalyticsDrilldownClient[];
};

export type AnalyticsOperationalMetric = {
  label: string;
  value: string;
  helpText: string;
  clients?: AnalyticsDrilldownClient[];
};

export type AnalyticsClientDrilldownGroup = {
  title: string;
  emptyLabel: string;
  clients: AnalyticsDrilldownClient[];
};

export type AnalyticsFilterOption = {
  value: string;
  label: string;
};

export type AnalyticsClientInsight = {
  id: string;
  client_name: string | null;
  age: number | null;
  sex: string | null;
  intake_source?: string | null;
  sibling_order?: string | null;
  sexual_orientation?: string | null;
  marital_status?: string | null;
  educational_attainment?: string | null;
  employment_status?: string | null;
  occupation?: string | null;
  partner_age?: number | null;
  partner_sexual_orientation?: string | null;
  years_together?: number | null;
  partner_educational_attainment?: string | null;
  partner_employment_status?: string | null;
  pre_existing_psychiatric_diagnosis: string | null;
  pre_existing_psychiatric_diagnosis_details?: string | null;
  hpc_representative: string | null;
  intake_date: string | null;
  client_status: ClientStatus | null;
  category_path: string | null;
  created_at: string;
  updated_at: string;
  counselling_reasons: string[] | null;
};


export type AnalyticsClientRow = ClientListItem &
  ClientMetadata & {
    client_name: string | null;
    created_at: string;
    updated_at: string;
    intake_date: string | null;
    counselling_reasons: string[];
  };

export type AnalyticsActivityRecord = {
  id: string;
  client_id: string | null;
  created_at: string;
};

export type AnalyticsCssrsInsight = {
  client_id: string;
  positive_severity: number | null;
  behavior: CssrsBehaviorValue;
  ideation_answers: Record<string, YesNoValue>;
  demeanor_selections: CssrsDemeanorSelectionMap;
  protective_factor_texts: CssrsProtectiveFactorTextMap;
  updated_at: string;
};

export type AnalyticsClient4PsInsight = {
  client_id: string;
  form: Client4PsForm;
  narrative_report: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLogFilterRange = "today" | "last_7_days" | "month" | "all";

export type AuditLogEntry = {
  id: string;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
  module: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  details: Record<string, unknown> | null;
};

export type WriteAuditLog = (
  module: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  targetLabel: string | null,
  details?: Record<string, unknown>
) => Promise<void>;

export type BackupRestorePreview = {
  file_name: string;
  exported_at: string;
  product_name: string;
  table_counts: Array<{
    key: string;
    label: string;
    count: number;
  }>;
};

export type MfaFactor = {
  id: string;
  factor_type: string;
  status: string;
  friendly_name: string | null;
  phone: string | null;
  created_at: string | null;
};

export type MfaEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
  friendlyName: string;
};

export type AuthenticatorAssuranceLevel = "aal1" | "aal2" | null;

export type AuthenticatorAssuranceState = {
  currentLevel: AuthenticatorAssuranceLevel;
  nextLevel: AuthenticatorAssuranceLevel;
};


export type ClientListItem = {
  id: string;
  client_name: string | null;
  created_at: string;
  updated_at: string;
  intake_date: string | null;
  client_status: ClientStatus | null;
  category_path: string | null;
  age?: number | null;
  sex?: string | null;
  intake_source?: string | null;
  sibling_order?: string | null;
  sexual_orientation?: string | null;
  marital_status?: string | null;
  educational_attainment?: string | null;
  employment_status?: string | null;
  occupation?: string | null;
  partner_age?: number | null;
  partner_sexual_orientation?: string | null;
  years_together?: number | null;
  partner_educational_attainment?: string | null;
  partner_employment_status?: string | null;
  pre_existing_psychiatric_diagnosis?: string | null;
  pre_existing_psychiatric_diagnosis_details?: string | null;
  hpc_representative?: string | null;
  mobile_number?: string | null;
  email?: string | null;
  counselling_reasons?: string[] | null;
};

export type ClientMetadata = {
  status: ClientStatus;
  category_path: string;
  intake_month: string;
  intake_year: string;
};

export type DashboardAnnouncement = {
  id: string;
  message: string;
  priority: AnnouncementPriority;
  expiry_date: string;
  show_until_dismissed: boolean;
  updated_at: string;
  is_active: boolean;
};

export type PhoneUploadTarget = "document" | "assessment";
export type MobileUploadSessionStatus =
  | "pending"
  | "uploaded"
  | "completed"
  | "expired"
  | "cancelled";

export type MobileUploadSession = {
  id: string;
  client_id: string;
  target_type: PhoneUploadTarget;
  status: MobileUploadSessionStatus;
  expires_at: string;
  token: string;
  mobile_url: string;
  storage_path?: string | null;
  uploaded_file_name?: string | null;
};


export type FourPsRowKey =
  | "predisposing"
  | "precipitating"
  | "perpetuating"
  | "protective";

export type FourPsFactorKey = "biological" | "psychological" | "social";

export type Client4PsForm = Record<FourPsRowKey, Record<FourPsFactorKey, string>>;

export type ChildForm = {
  id?: string;
  child_name: string;
  child_age: string;
  child_birth_date: string;
  child_sex: string;
  child_sex_other: string;
};

export type ClientForm = {
  intake_source: string;
  intake_source_other: string;
  client_status: ClientStatus;
  category_path: string;

  client_name: string;
  age: string;
  sex: string;
  dob: string;
  complete_address: string;
  mobile_number: string;
  email: string;
  sibling_order: string;
  sexual_orientation: string;
  sexual_orientation_other: string;
  marital_status: string;
  marital_status_other: string;
  educational_attainment: string;
  employment_status: string;
  employment_status_other: string;
  occupation: string;
  employer_school: string;
  employer_school_address: string;

  partner_name: string;
  partner_age: string;
  partner_dob: string;
  partner_sexual_orientation: string;
  partner_sexual_orientation_other: string;
  years_together: string;
  partner_educational_attainment: string;
  partner_employment_status: string;
  partner_employment_status_other: string;
  partner_occupation: string;
  partner_employer_school: string;
  partner_employer_school_address: string;

  pre_existing_psychiatric_diagnosis: string;
  pre_existing_psychiatric_diagnosis_details: string;
  counselling_reasons: string[];
  counselling_reason_text: string;

  emergency_contact_person: string;
  emergency_contact_relationship: string;
  emergency_contact_address: string;
  emergency_contact_number: string;

  intake_date: string;
  hpc_representative: string;
  hpc_representative_other: string;
  time_started: string;
  time_ended: string;
};

export type ProgressNote = {
  id?: string;
  session_label: string;
  session_date: string;
  note_content: string;
  created_at?: string;
  updated_at?: string;
};

export type ClientStoredFileRecord = {
  id: string;
  client_id: string;
  original_file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
};

export type ClientDocument = ClientStoredFileRecord & {
  document_name: string;
};

export type ClientAssessment = ClientStoredFileRecord & {
  assessment_name: string;
};

export const emptyClientForm = (): ClientForm => ({
  intake_source: "",
  intake_source_other: "",
  client_status: "Active",
  category_path: "",

  client_name: "",

  age: "",
  sex: "",
  dob: "",
  complete_address: "",
  mobile_number: "",
  email: "",
  sibling_order: "",
  sexual_orientation: "",
  sexual_orientation_other: "",
  marital_status: "",
  marital_status_other: "",
  educational_attainment: "",
  employment_status: "",
  employment_status_other: "",
  occupation: "",
  employer_school: "",
  employer_school_address: "",

  partner_name: "",
  partner_age: "",
  partner_dob: "",
  partner_sexual_orientation: "",
  partner_sexual_orientation_other: "",
  years_together: "",
  partner_educational_attainment: "",
  partner_employment_status: "",
  partner_employment_status_other: "",
  partner_occupation: "",
  partner_employer_school: "",
  partner_employer_school_address: "",

  pre_existing_psychiatric_diagnosis: "",
  pre_existing_psychiatric_diagnosis_details: "",
  counselling_reasons: [],
  counselling_reason_text: "",

  emergency_contact_person: "",
  emergency_contact_relationship: "",
  emergency_contact_address: "",
  emergency_contact_number: "",

  intake_date: getTodayDateInputValue(),
  hpc_representative: "",
  hpc_representative_other: "",
  time_started: getCurrentTimeInputValue(),
  time_ended: "",
});

export const FOUR_PS_ROWS: Array<{ key: FourPsRowKey; label: string }> = [
  { key: "predisposing", label: "PREDISPOSING" },
  { key: "precipitating", label: "PRECIPITATING" },
  { key: "perpetuating", label: "PERPETUATING" },
  { key: "protective", label: "PROTECTIVE" },
];

export const FOUR_PS_FACTORS: Array<{ key: FourPsFactorKey; label: string }> = [
  { key: "biological", label: "Biological" },
  { key: "psychological", label: "Psychological" },
  { key: "social", label: "Social" },
];

export const emptyClient4PsForm = (): Client4PsForm => ({
  predisposing: {
    biological: "",
    psychological: "",
    social: "",
  },
  precipitating: {
    biological: "",
    psychological: "",
    social: "",
  },
  perpetuating: {
    biological: "",
    psychological: "",
    social: "",
  },
  protective: {
    biological: "",
    psychological: "",
    social: "",
  },
});

export const CLIENT_4PS_COLUMN_MAP: Record<
  FourPsRowKey,
  Record<FourPsFactorKey, string>
> = {
  predisposing: {
    biological: "predisposing_biological",
    psychological: "predisposing_psychological",
    social: "predisposing_social",
  },
  precipitating: {
    biological: "precipitating_biological",
    psychological: "precipitating_psychological",
    social: "precipitating_social",
  },
  perpetuating: {
    biological: "perpetuating_biological",
    psychological: "perpetuating_psychological",
    social: "perpetuating_social",
  },
  protective: {
    biological: "protective_biological",
    psychological: "protective_psychological",
    social: "protective_social",
  },
};

export const client4PsFormFromDatabaseRow = (
  row: Record<string, unknown> | null | undefined
): Client4PsForm => {
  const form = emptyClient4PsForm();

  FOUR_PS_ROWS.forEach(({ key: rowKey }) => {
    FOUR_PS_FACTORS.forEach(({ key: factorKey }) => {
      const columnKey = CLIENT_4PS_COLUMN_MAP[rowKey][factorKey];
      const value = row?.[columnKey];

      form[rowKey][factorKey] = typeof value === "string" ? value : "";
    });
  });

  return form;
};

export const client4PsFormToDatabasePayload = (
  form: Client4PsForm
): Record<string, string | null> => {
  const payload: Record<string, string | null> = {};

  FOUR_PS_ROWS.forEach(({ key: rowKey }) => {
    FOUR_PS_FACTORS.forEach(({ key: factorKey }) => {
      const columnKey = CLIENT_4PS_COLUMN_MAP[rowKey][factorKey];
      const value = form[rowKey][factorKey].trim();

      payload[columnKey] = value === "" ? null : value;
    });
  });

  return payload;
};

export const emptyChildForm = (): ChildForm => ({
  child_name: "",
  child_age: "",
  child_birth_date: "",
  child_sex: "",
  child_sex_other: "",
});

export const emptyProgressNoteForm = (): ProgressNote => ({
  session_label: "",
  session_date: getTodayDateInputValue(),
  note_content: "",
});

export const emptyDashboardAnnouncement = (): DashboardAnnouncement => ({
  id: "",
  message: "",
  priority: "Info",
  expiry_date: "",
  show_until_dismissed: false,
  updated_at: "",
  is_active: false,
});

export const CLINIC_NAME = "Clinic Psychological Center";
export const APP_PRODUCT_NAME = "HPC Client Management";

export const CLINIC_CLINIC_INFO = {
  name: CLINIC_NAME,
  mobile_number: "0917 000 0000",
  landline_number: "000-000-0000",
  email: "clinic@example.com",
  address: "Sample Psychological Center V, City Center Ave., Brgy. 33, Bacolod City",
};

export const CARE_TEAM_ROLE_OPTIONS = [
  "Admin",
  "CEO",
  "Psychologist / Counselor",
  "Staff",
  "Intern",
];


export const DEFAULT_MFA_FRIENDLY_NAME = "HPC Clinic Authenticator";
export const PROFILE_PICTURES_BUCKET = "profile-pictures";
export const PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS = 60 * 60;
export const AUDIT_LOG_PAGE_SIZE = 200;
export const AUDIT_LOG_FILTER_OPTIONS: Array<{ value: AuditLogFilterRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

export const isLikelyEmailAddress = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

export const PROFILE_PICTURE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const PROFILE_PICTURE_ACCEPT = PROFILE_PICTURE_ALLOWED_MIME_TYPES.join(",");
export const PROFILE_PICTURE_ALLOWED_LABEL = "JPG, PNG, or WebP";
export const PROFILE_PICTURE_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_PROFILE_PICTURE_BYTES = 2 * 1024 * 1024;
export const PROFILE_PICTURE_MAX_DIMENSION = 512;
export const PROFILE_PICTURE_COMPRESSION_QUALITY = 0.82;
export const PROFILE_PICTURE_OUTPUT_TYPE = "image/webp";
export const PROFILE_PICTURE_HELP_TEXT =
  "Use a JPG, PNG, or WebP image up to 10 MB. The app optimizes it before upload.";

export const CLIENT_FILE_MAX_BYTES = 25 * 1024 * 1024;
export const CLIENT_FILE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;
export const CLIENT_FILE_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".txt",
  ".csv",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
] as const;
export const CLIENT_FILE_ACCEPT = [
  ...CLIENT_FILE_ALLOWED_MIME_TYPES,
  ...CLIENT_FILE_ALLOWED_EXTENSIONS,
].join(",");
export const CLIENT_FILE_ALLOWED_LABEL =
  "PDF, image, text, CSV, Word, Excel, or PowerPoint files up to 25 MB";

export const getClientFileValidationMessage = (file: File) => {
  if (file.size > CLIENT_FILE_MAX_BYTES) {
    return `Choose a file up to ${formatFileSize(CLIENT_FILE_MAX_BYTES)}.`;
  }

  const normalizedType = file.type.trim().toLowerCase();
  const normalizedName = file.name.trim().toLowerCase();
  const hasAllowedType =
    normalizedType === "" ||
    CLIENT_FILE_ALLOWED_MIME_TYPES.some((type) => type === normalizedType);
  const hasAllowedExtension = CLIENT_FILE_ALLOWED_EXTENSIONS.some((extension) =>
    normalizedName.endsWith(extension)
  );

  if (!hasAllowedType && !hasAllowedExtension) {
    return `Unsupported file type. Use ${CLIENT_FILE_ALLOWED_LABEL}.`;
  }

  return "";
};

export const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Unable to read the selected image."));
      }
    };

    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });

export const getFileExtension = (fileName: string, fallback = "png") => {
  const matched = /\.([a-zA-Z0-9]+)$/.exec(fileName.trim());
  return (matched?.[1] ?? fallback).toLowerCase();
};

export const buildProfileAvatarPath = (userId: string, fileName: string) =>
  `${userId}/avatar-${Date.now()}.${getFileExtension(fileName)}`;

export const buildPasswordRecoveryRedirectUrl = () => {
  if (typeof window === "undefined") return undefined;

  return `${window.location.origin}${window.location.pathname}${window.location.search}#password-recovery`;
};

export const clearPasswordRecoveryHash = () => {
  if (typeof window === "undefined" || !window.location.hash.includes("password-recovery")) {
    return;
  }

  window.history.replaceState(
    null,
    document.title,
    `${window.location.pathname}${window.location.search}`
  );
};

export const getHasPasswordRecoveryHash = () =>
  typeof window !== "undefined" && window.location.hash.includes("password-recovery");

export const getAuditFilterStartIso = (range: AuditLogFilterRange) => {
  const now = new Date();

  if (range === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.toISOString();
  }

  if (range === "last_7_days") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString();
  }

  return null;
};

export const formatAuditDetailValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return "Unavailable";
  }
};

export const formatAuditDetails = (details: Record<string, unknown> | null | undefined) => {
  if (!details || typeof details !== "object") {
    return "No extra details recorded.";
  }

  const summary =
    typeof details.summary === "string" && details.summary.trim() !== ""
      ? details.summary.trim()
      : "";

  if (summary) {
    return summary;
  }

  const detailEntries = Object.entries(details).filter(([key]) => key !== "summary");

  if (detailEntries.length === 0) {
    return "No extra details recorded.";
  }

  return detailEntries
    .slice(0, 4)
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${formatAuditDetailValue(value)}`)
    .join(" â€¢ ");
};

export const getAuditTargetLabel = (entry: AuditLogEntry) =>
  entry.target_label?.trim() || entry.target_type?.trim() || "System activity";

export const getProfileInitial = (fullName: string | null | undefined, email: string | null | undefined) =>
  (fullName?.trim() || email?.trim() || "H").slice(0, 1).toUpperCase();

export const normalizeSvgDataUrl = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") return "";
  if (trimmed.startsWith("data:") || trimmed.startsWith("http")) {
    return trimmed;
  }
  if (trimmed.startsWith("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
};

export const summarizeMfaFactor = (factor: MfaFactor) => {
  const baseLabel =
    factor.friendly_name?.trim() ||
    (factor.factor_type === "totp"
      ? "Authenticator app"
      : factor.factor_type === "phone"
      ? "Phone verification"
      : factor.factor_type || "MFA factor");

  const statusLabel =
    factor.status === "verified"
      ? "Enabled"
      : factor.status === "unverified"
      ? "Pending verification"
      : factor.status || "Saved";

  return {
    label: baseLabel,
    statusLabel,
  };
};


export const hasVerifiedMfaFactor = (factors: MfaFactor[]) =>
  factors.some((factor) => factor.status === "verified");

export const getCurrentMfaProtectionLabel = (
  currentLevel: AuthenticatorAssuranceLevel,
  factors: MfaFactor[]
) =>
  currentLevel === "aal2" || hasVerifiedMfaFactor(factors)
    ? "Password + authenticator app"
    : "Password sign-in only";

export const getTwoStepVerificationStatusLabel = (
  currentLevel: AuthenticatorAssuranceLevel,
  nextLevel: AuthenticatorAssuranceLevel,
  factors: MfaFactor[]
) =>
  currentLevel === "aal2" || nextLevel === "aal2" || hasVerifiedMfaFactor(factors)
    ? "Enabled"
    : "Not enabled";

export const getMfaSetupStateLabel = (
  currentLevel: AuthenticatorAssuranceLevel,
  nextLevel: AuthenticatorAssuranceLevel,
  factors: MfaFactor[],
  hasActiveEnrollment: boolean
) => {
  if (hasActiveEnrollment) return "Setup in progress";
  if (nextLevel === "aal2" && currentLevel !== "aal2") return "Verification required";
  if (currentLevel === "aal2" || hasVerifiedMfaFactor(factors)) return "Enabled";
  return "Not enabled";
};



export const isAdminRole = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase() === "admin";

export const normalizeCareTeamRole = (value: string | null | undefined) => {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized === "ceo" || normalized === "chief executive officer") return "CEO";
  if (normalized.includes("admin")) return "Admin";
  if (
    normalized === "psychologist / counselor" ||
    normalized === "psychologist / counsellor" ||
    normalized === "psychologist" ||
    normalized === "counsellor" ||
    normalized === "counselor"
  ) {
    return "Psychologist / Counselor";
  }
  if (normalized.includes("intern")) return "Intern";
  return "Staff";
};

export const isRepresentativeAssignedRole = (value: string | null | undefined) => {
  const role = normalizeCareTeamRole(value);
  return role === "Psychologist / Counselor" || role === "CEO";
};

export const canUseAllRepresentativeAnalytics = (value: string | null | undefined) => {
  const role = normalizeCareTeamRole(value);
  return (
    role === "Admin" ||
    role === "CEO" ||
    role === "Staff" ||
    role === "Psychologist / Counselor"
  );
};

export const canUseIndividualRepresentativeAnalytics = (
  value: string | null | undefined
) => {
  const role = normalizeCareTeamRole(value);
  return role === "Admin" || role === "CEO" || role === "Staff";
};

export const shouldDefaultAnalyticsToAssignedRepresentative = (
  value: string | null | undefined
) => {
  const role = normalizeCareTeamRole(value);
  return role === "CEO" || role === "Psychologist / Counselor";
};

export const canEditClientClinicalRecords = (value: string | null | undefined) => {
  const role = normalizeCareTeamRole(value);
  return role === "Admin" || role === "CEO" || role === "Psychologist / Counselor";
};

export const canCreateClientRecords = (value: string | null | undefined) => {
  const role = normalizeCareTeamRole(value);
  return (
    role === "Admin" ||
    role === "CEO" ||
    role === "Psychologist / Counselor" ||
    role === "Staff" ||
    role === "Intern"
  );
};

export const shouldLockClientRepresentativeToAssigned = (
  value: string | null | undefined
) => {
  const role = normalizeCareTeamRole(value);
  return role === "CEO" || role === "Psychologist / Counselor";
};

export const canEditClientCssrsInterview = (value: string | null | undefined) => {
  const role = normalizeCareTeamRole(value);
  return (
    role === "Admin" ||
    role === "CEO" ||
    role === "Psychologist / Counselor" ||
    role === "Staff" ||
    role === "Intern"
  );
};

export const canEditClientCssrsProtectiveFactors = (
  value: string | null | undefined
) => {
  const role = normalizeCareTeamRole(value);
  return role === "Admin" || role === "CEO" || role === "Psychologist / Counselor";
};

export const canManageClientDocuments = (value: string | null | undefined) => {
  const role = normalizeCareTeamRole(value);
  return role === "Admin" || role === "CEO" || role === "Psychologist / Counselor" || role === "Staff";
};

export const canManageClientAssessments = (value: string | null | undefined) => {
  const role = normalizeCareTeamRole(value);
  return role === "Admin" || role === "CEO" || role === "Psychologist / Counselor" || role === "Staff";
};

export const getProfileDisplayName = (value: string | null | undefined) =>
  value?.trim() || "User";

export const getProfileDisplayRole = (value: string | null | undefined) =>
  normalizeCareTeamRole(value) || "Staff";

export const normalizeCareTeamMemberEmail = (value: string | null | undefined) => {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized && /\S+@\S+\.\S+/.test(normalized) ? normalized : "";
};

export const getCareTeamMemberDisplayName = (
  fullName: string | null | undefined,
  email: string | null | undefined
) => {
  const trimmedName = fullName?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const normalizedEmail = normalizeCareTeamMemberEmail(email);
  return normalizedEmail || "Unnamed Member";
};

export const APP_BUILD_INFO = {
  product_name: APP_PRODUCT_NAME,
  version: import.meta.env.VITE_APP_VERSION ?? "0.1.0",
  identifier: "com.clinic.hpcclientmanagement",
  environment_summary: `Tauri 2 â€¢ React â€¢ TypeScript â€¢ Vite â€¢ Supabase â€¢ ${
    import.meta.env.MODE === "production" ? "Production build" : "Development build"
  }`,
};


export const MOBILE_UPLOAD_SESSION_POLL_MS = 2500;
export const MOBILE_UPLOAD_SESSION_EXPIRY_MS = 5 * 60 * 1000;

export const defaultMobileUploadBaseUrl =
  typeof window !== "undefined" && window.location.protocol.startsWith("http")
    ? window.location.origin
    : "";

export const MOBILE_UPLOAD_BASE_URL =
  import.meta.env.VITE_MOBILE_UPLOAD_BASE_URL ?? defaultMobileUploadBaseUrl;

export const CARE_TEAM_INVITE_REDIRECT_URL =
  import.meta.env.VITE_CARE_TEAM_INVITE_REDIRECT_URL ??
  import.meta.env.VITE_INVITE_REDIRECT_URL ??
  undefined;

export const createPhoneUploadToken = () => {
  const values = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
};

export const hashPhoneUploadToken = async (token: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
};

export const formatPhoneUploadTargetLabel = (target: PhoneUploadTarget) =>
  target === "document" ? "Document" : "Assessment";

export const buildPhoneUploadMobileUrl = (token: string) => {
  const baseUrl = MOBILE_UPLOAD_BASE_URL.trim();

  if (!baseUrl) {
    return "";
  }

  return `${baseUrl.replace(/\/$/, "")}/mobile-upload?token=${encodeURIComponent(token)}`;
};

export const formatPhoneUploadExpiry = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const normalizeDate = (value: string | null | undefined) =>
  value ? value.slice(0, 10) : "";

export const normalizeTime = (value: string | null | undefined) =>
  value ? value.slice(0, 5) : "";

export const getTodayDateInputValue = () => {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset();
  return new Date(today.getTime() - timezoneOffset * 60_000)
    .toISOString()
    .slice(0, 10);
};

export const getCurrentTimeInputValue = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset();
  return new Date(now.getTime() - timezoneOffset * 60_000)
    .toISOString()
    .slice(11, 16);
};

export const formatAuditTimestamp = (value: string) => {
  const parsed = new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    return "Unknown time";
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const hasMeaningfulTimestampChange = (
  createdAt: string | null | undefined,
  updatedAt: string | null | undefined
) => {
  if (!createdAt || !updatedAt) {
    return false;
  }

  const createdMs = new Date(createdAt).getTime();
  const updatedMs = new Date(updatedAt).getTime();

  if (!Number.isFinite(createdMs) || !Number.isFinite(updatedMs)) {
    return false;
  }

  return Math.abs(updatedMs - createdMs) > 60_000;
};

export const truncateAuditDetails = (value: string, maxLength = 100) => {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}â€¦`;
};

export const toNullableText = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export const toNullableInt = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
};

export const sanitizeFileName = (fileName: string) =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

export const formatBytes = (value: number | null) => {
  if (!value && value !== 0) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const BACKUP_TABLE_CONFIG = [
  { key: "profiles", label: "Profiles" },
  { key: "clients", label: "Clients" },
  { key: "client_4ps", label: "4Ps" },
  { key: "client_categories", label: "Client Categories" },
  { key: "client_children", label: "Children" },
  { key: "progress_notes", label: "Progress Notes" },
  { key: "client_documents", label: "Documents" },
  { key: "client_assessments", label: "Assessments" },
  { key: "client_cssrs", label: "C-SSRS" },
  { key: "dashboard_announcements", label: "Clinic Banners" },
] as const;

export const SEXUAL_ORIENTATION_OPTIONS = [
  "Gay",
  "Lesbian",
  "Bisexual",
  "Pansexual",
  "Transgender",
  "Straight Female",
  "Straight Male",
  "Other",
];

export const MARITAL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Widow",
  "Separated",
  "Divorce",
  "Other",
];

export const EMPLOYMENT_STATUS_OPTIONS = [
  "Student",
  "Unemployed",
  "Employed",
  "Self-Employed",
  "Retired",
  "Other",
];

export const PARTNER_EMPLOYMENT_STATUS_OPTIONS = [
  "Employed",
  "Unemployed",
  "Self-employed",
  "Other",
];

export const SEX_OPTIONS = ["Male", "Female", "Other"];

export const CHILD_SEX_OPTIONS = SEX_OPTIONS;

export const DEFAULT_HPC_REPRESENTATIVE_OPTIONS = [
  "Clinic Administrator",
  "Ms Therese",
  "Ms Yanglee",
  "Ms Christine",
  "Doc Ade",
  "Ms Marg",
  "Ms Daisy",
  "Ms Trish",
  "Ms June",
];


const REMOVED_HPC_REPRESENTATIVE_OPTIONS = new Set(
  [
    "kit",
    "dr. rivera",
    "dr rivera",
    "counselor lim",
    "hpc staff",
    "intake team",
  ].map((option) => option.toLowerCase())
);

export const HPC_REPRESENTATIVE_OPTIONS = [...DEFAULT_HPC_REPRESENTATIVE_OPTIONS];

export const CARE_TEAM_HPC_REPRESENTATIVE_OPTIONS = [
  ...DEFAULT_HPC_REPRESENTATIVE_OPTIONS,
  "Other",
];

export const normalizeHpcRepresentativeName = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.toLowerCase() === "ms. june") {
    return "Ms June";
  }

  return normalized;
};

export const mergeHpcRepresentativeOptions = (
  representativeNames: string[],
  existingClientRepresentatives: string[] = []
) => {
  const normalizedDefaults = new Set(
    DEFAULT_HPC_REPRESENTATIVE_OPTIONS.map((option) => option.toLowerCase())
  );
  const customOptions = [...representativeNames, ...existingClientRepresentatives]
    .map((value) => normalizeHpcRepresentativeName(value))
    .filter((value) => value !== "" && value !== "Other")
    .filter((value) => !REMOVED_HPC_REPRESENTATIVE_OPTIONS.has(value.toLowerCase()))
    .filter((value) => !normalizedDefaults.has(value.toLowerCase()));

  return Array.from(
    new Set([...DEFAULT_HPC_REPRESENTATIVE_OPTIONS, ...customOptions])
  );
};

export const COUNSELLING_REASON_OPTIONS = [
  "Nervousness / Excessive Worry",
  "Feeling Lonely / Hopelessness",
  "Grief or Loss of Someone",
  "Anxiety",
  "Marital Conflict",
  "Employment Difficulty",
  "Overthinking",
  "Low Self-esteem",
  "Concentration Problem",
  "Relationship Problem",
  "Addiction",
  "Financial Difficulty",
  "Discrimination",
  "Suicidal Ideation",
];

export const parseSiblingOrder = (value: string) => {
  const [position = "", total = ""] = value.split("/").map((part) => part.trim());

  return {
    position: position.replace(/\D/g, ""),
    total: total.replace(/\D/g, ""),
  };
};

export const buildSiblingOrder = (position: string, total: string) => {
  const cleanPosition = position.replace(/\D/g, "");
  const cleanTotal = total.replace(/\D/g, "");

  if (!cleanPosition && !cleanTotal) return "";
  if (!cleanPosition) return `/${cleanTotal}`;
  if (!cleanTotal) return `${cleanPosition}/`;

  return `${cleanPosition}/${cleanTotal}`;
};


export const THEME_STORAGE_KEY = "hpc-client-management-theme";
export const DASHBOARD_ANNOUNCEMENT_DISMISS_KEY =
  "hpc-client-management-dashboard-announcement-dismissed";
export const DASHBOARD_ANNOUNCEMENT_SELECT =
  "id, message, priority, expiry_date, show_until_dismissed, updated_at, is_active";

export const readStoredTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (
      storedTheme === "dark" ||
      storedTheme === "clinic" ||
      storedTheme === "clinic-dark"
    ) {
      return storedTheme;
    }

    return "light";
  } catch {
    return "light";
  }
};

export const normalizeDashboardAnnouncement = (
  value?: Partial<DashboardAnnouncement> | null
): DashboardAnnouncement => ({
  id: value?.id?.trim() ?? "",
  message: value?.message?.trim() ?? "",
  priority:
    value?.priority === "Important" || value?.priority === "Urgent"
      ? value.priority
      : "Info",
  expiry_date: normalizeDate(value?.expiry_date),
  show_until_dismissed: value?.show_until_dismissed === true,
  updated_at: value?.updated_at?.trim() ?? "",
  is_active: value?.is_active === true,
});

export const readStoredDismissedAnnouncementKey = () => {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem(DASHBOARD_ANNOUNCEMENT_DISMISS_KEY) ?? "";
  } catch {
    return "";
  }
};

export const CLIENT_STATUS_OPTIONS: ClientStatus[] = ["Active", "Terminated"];
export const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const DEFAULT_CATEGORY_PATH_OPTIONS = [
  "Bago",
  "Himamaylan",
  "Cauayan",
];

export const CATEGORY_PATH_OPTIONS = [...DEFAULT_CATEGORY_PATH_OPTIONS];

export const CATEGORY_PATH_SUGGESTIONS = [...DEFAULT_CATEGORY_PATH_OPTIONS];

export const normalizeCategoryName = (value: string) => value.trim().replace(/\s+/g, " ");

export const mergeClientCategoryOptions = (
  categoryNames: string[],
  existingClientCategories: string[] = []
) =>
  Array.from(
    new Set(
      [...categoryNames, ...existingClientCategories]
        .map((value) => formatCategoryPath(value))
        .filter((value) => value !== UNCATEGORIZED_LABEL)
    )
  ).sort((left, right) => left.localeCompare(right));
export const ANALYTICS_COLOR_TOKENS = [
  "var(--analytics-tone-1)",
  "var(--analytics-tone-2)",
  "var(--analytics-tone-3)",
  "var(--analytics-tone-4)",
  "var(--analytics-tone-5)",
  "var(--analytics-tone-6)",
];
export const UNCATEGORIZED_LABEL = "Uncategorized";
export const APP_TIME_ZONE = "Asia/Manila";

const getClinicDateParts = (value: string | null | undefined) => {
  if (!value) return null;

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch && !value.includes("T")) {
    return {
      year: dateOnlyMatch[1],
      month: dateOnlyMatch[2],
      day: dateOnlyMatch[3],
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? { year, month, day } : null;
};

export const getDateKeyFromDate = (value: string | null | undefined) => {
  const parts = getClinicDateParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
};

export const getMonthLabelFromDate = (value: string | null | undefined) => {
  const parts = getClinicDateParts(value);
  if (!parts) return "";
  return MONTH_OPTIONS[Number(parts.month) - 1] ?? "";
};

export const getYearLabelFromDate = (value: string | null | undefined) => {
  const parts = getClinicDateParts(value);
  return parts?.year ?? "";
};

export const getMonthOrder = (value: string) => {
  const monthIndex = MONTH_OPTIONS.findIndex(
    (month) => month.toLowerCase() === value.trim().toLowerCase()
  );

  return monthIndex === -1 ? 0 : monthIndex + 1;
};

export const formatCategoryPath = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return UNCATEGORIZED_LABEL;
  }

  return trimmed;
};

export const getMonthKeyFromDate = (value: string | null | undefined) => {
  const parts = getClinicDateParts(value);
  return parts ? `${parts.year}-${parts.month}` : "";
};

export const formatMonthKeyLabel = (value: string) => {
  const [year = "", monthValue = ""] = value.split("-");
  const numericMonth = Number(monthValue);
  const monthLabel =
    MONTH_OPTIONS[numericMonth - 1]?.slice(0, 3) ?? monthValue;
  return year ? `${monthLabel} ${year}` : value;
};

export const getTrendDirection = (value: number) => {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
};

export const formatTrendDelta = (value: number) => {
  if (value > 0) return `+${value}`;
  return `${value}`;
};

export const buildConicGradient = (
  items: Array<{ value: number }>,
  colors: string[]
) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return "conic-gradient(var(--border) 0deg 360deg)";
  }

  let offset = 0;

  return `conic-gradient(${items
    .map((item, index) => {
      const start = (offset / total) * 360;
      offset += item.value;
      const end = (offset / total) * 360;
      return `${colors[index % colors.length]} ${start}deg ${end}deg`;
    })
    .join(", ")})`;
};


export const getClientGroupLabel = (metadata: Pick<ClientMetadata, "intake_month" | "intake_year">) => {
  const month = metadata.intake_month.trim() || "Unknown Month";
  const year = metadata.intake_year.trim() || "Unknown Year";
  return `${month} ${year}`;
};

export const getClientGroupSortValue = (
  metadata: Pick<ClientMetadata, "intake_month" | "intake_year">
) => {
  const numericYear = Number(metadata.intake_year);
  const safeYear = Number.isFinite(numericYear) ? numericYear : 0;
  return safeYear * 100 + getMonthOrder(metadata.intake_month);
};

export const normalizeClientMetadata = (
  client: Pick<
    ClientListItem,
    "created_at" | "intake_date" | "client_status" | "category_path"
  >
): ClientMetadata => {
  const fallbackDate =
    client.intake_date || client.created_at || new Date().toISOString();
  const derivedIntakeMonth = getMonthLabelFromDate(fallbackDate);
  const derivedIntakeYear = getYearLabelFromDate(fallbackDate);

  return {
    status: client.client_status === "Terminated" ? "Terminated" : "Active",
    category_path: client.category_path?.trim() ?? "",
    intake_month: derivedIntakeMonth || "",
    intake_year: derivedIntakeYear || "",
  };
};

export type YesNoValue = "yes" | "no" | null;

export type CssrsBehaviorValue = {
  lifetime: YesNoValue;
  recent: YesNoValue;
};

export type CssrsDemeanorSelectionMap = Record<string, boolean>;
export type CssrsDemeanorOtherTextMap = Record<string, string>;
export type CssrsProtectiveFactorTextMap = Record<string, string>;

export const CSSRS_IDEATION_ITEMS = [
  {
    id: "q1",
    number: 1,
    title: "Wish to be dead",
    prompt:
      "Have you wished you were dead or wished you could go to sleep and not wake up?",
    toneClass: "tone-low",
  },
  {
    id: "q2",
    number: 2,
    title: "Suicidal Thoughts",
    prompt: "Have you been thinking about how you might do this?",
    toneClass: "tone-low-mid",
  },
  {
    id: "q3",
    number: 3,
    title: "Suicidal Thoughts with Wethod (without specific Plan or Intent to Act)",
    prompt:
      "Have you been thinking about how you might do this?",
    toneClass: "tone-mid",
  },
  {
    id: "q4",
    number: 4,
    title: "Suicidal Intent (without specific plan)",
    prompt:
      "Have you had these thoughts and had some intention of acting on them?",
    toneClass: "tone-high",
  },
  {
    id: "q5",
    number: 5,
    title: "Suicidal Intent with Specific Plan",
    prompt:
      "Have you started to work out or worked out the details of how to kill yourself? Do you intend to carry out this plan?",
    toneClass: "tone-highest",
  },
] as const;

export const CSSRS_DEMEANOR_GROUPS = [
  {
    title: "Emotional State",
    items: [
      "numb",
      "irritable",
      "depressed",
      "angry",
      "anxious",
      "scared",
      "others ________",
    ],
  },
  {
    title: "Cognitive State",
    items: [
      "hopeless about future",
      "inflexible thinking",
      "auditory, visual, tactile hallucinations",
      "poor judgment",
      "blaming self",
      "confused",
      "unrealistic",
      "others ________",
    ],
  },
  {
    title: "Behavioral State",
    items: [
      "inactive/lazy",
      "abnormal movement (e.g. tic)",
      "agitated",
      "threatening",
      "impulsive",
      "risk-taking",
      "others ________",
    ],
  },
] as const;

export const CSSRS_RISK_FACTORS = [
  {
    label: "Ideation",
    description:
      "Expressed or communicated ideation\nThreatening to hurt or kill him/herself or talking of wanting to hurt or kill him/herself\nLooking for ways to kill him/herself by seeking acess to firearms, available pills or other means\nTalking or writing about death, dying, or suicide when these actions are out of the ordinary",
  },
  {
    label: "Substance Abuse",
    description: "Increased substance (alcohol or drug) use",
  },
  {
    label: "Purposelessness",
    description: "No reasons for living\nNo sense of purpose in life",
  },
  {
    label: "Anxiety",
    description: "Anxiety, agitation, unable to sleep or sleeping all the time",
  },
  {
    label: "Trapped",
    description: "Feeling trapped â€” like there's no way out",
  },
  {
    label: "Hopelessness",
    description: "Hopelessness",
  },
  {
    label: "Withdrawal",
    description: "Withdrawing from friends, family, and society",
  },
  {
    label: "Anger",
    description: "Rage, uncontrolled anger, seeking revenge",
  },
  {
    label: "Recklessness",
    description:
      "Acting reckless or engaging in risky activities, seemingly without thinking",
  },
  {
    label: "Mood changes",
    description: "Dramatic mood changes",
  },
] as const;

export const CSSRS_INTERVENTION_ROWS = [
  {
    level: "Mild",
    descriptor: "Close the gate",
    toneClass: "cssrs-intervention-row-mild",
    student: [
      "Perform an advanced assessment",
      "Do safety planning",
      "Follow-up periodically",
    ],
    guardian: ["Notify parents/guardian of the risk level"],
    professional: ["Can opt not yet to refer"],
  },
  {
    level: "Moderate",
    descriptor: "Open the gate",
    toneClass: "cssrs-intervention-row-moderate",
    student: [
      "Perform an advanced assessment",
      "Do safety planning",
      "Follow-up closely",
    ],
    guardian: [
      "Notify parents/guardian of the risk level",
      "Recommend removal of means",
      "Recommend non-emergency referral to professional",
    ],
    professional: ["Assist non-emergency referral with written or oral endorsement"],
  },
  {
    level: "Severe",
    descriptor: "Open the gate and bring them through",
    toneClass: "cssrs-intervention-row-severe",
    student: [
      "Perform an advanced assessment",
      "Do safety planning",
      "Ensure close watch for safety",
    ],
    guardian: [
      "Notify/guardian of risk level",
      "Recommend removal of means and 24/7 watch",
      "Recommend emergency referral to professional/hospital",
    ],
    professional: ["Assist emergency referral with oral endorsement"],
  },
] as const;

export const CSSRS_PROTECTIVE_FACTORS = [
  "Reasons for living.",
  "Support of family member/adult.",
  "Support of friends/peers.",
  "Skills, passion and interest.",
] as const;

export const createCssrsIdeationState = () =>
  Object.fromEntries(
    CSSRS_IDEATION_ITEMS.map((item) => [item.id, null as YesNoValue])
  );

export const buildCssrsDemeanorItemKey = (groupTitle: string, index: number, item: string) =>
  `${groupTitle}-${index}-${item}`;

export const buildCssrsNumberedItemKey = (index: number, item: string) =>
  `${index + 1}-${item}`;

export const createCssrsDemeanorSelectionState = (): CssrsDemeanorSelectionMap =>
  Object.fromEntries(
    CSSRS_DEMEANOR_GROUPS.flatMap((group) =>
      group.items.map((item, index) => [
        buildCssrsDemeanorItemKey(group.title, index, item),
        false,
      ] as const)
    )
  );

export const createCssrsDemeanorOtherTextState = (): CssrsDemeanorOtherTextMap =>
  Object.fromEntries(
    CSSRS_DEMEANOR_GROUPS.flatMap((group) =>
      group.items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.toLowerCase().includes("others"))
        .map(({ item, index }) => [
          buildCssrsDemeanorItemKey(group.title, index, item),
          "",
        ] as const)
    )
  );

export const createCssrsProtectiveFactorTextState = (): CssrsProtectiveFactorTextMap =>
  Object.fromEntries(
    CSSRS_PROTECTIVE_FACTORS.map((item, index) => [buildCssrsNumberedItemKey(index, item), ""] as const)
  );


export type CssrsClinicTabProps = {
  clientId: string;
  clientName?: string | null;
  writeAuditLog?: WriteAuditLog;
  onCssrsSaved?: () => void | Promise<void>;
  isReadOnly?: boolean;
  canEditProtectiveFactors?: boolean;
};

export const normalizeCssrsIdeationAnswers = (
  value?: Record<string, unknown> | null
): Record<string, YesNoValue> => {
  const next = createCssrsIdeationState();

  if (!value) return next;

  for (const key of Object.keys(next)) {
    const answer = value[key];
    if (answer === "yes" || answer === "no") {
      next[key] = answer;
    }
  }

  return next;
};

export const normalizeCssrsBehavior = (
  value?: Partial<Record<keyof CssrsBehaviorValue, unknown>> | null
): CssrsBehaviorValue => ({
  lifetime: value?.lifetime === "yes" || value?.lifetime === "no" ? value.lifetime : null,
  recent: value?.recent === "yes" || value?.recent === "no" ? value.recent : null,
});

export const normalizeCssrsDemeanorSelections = (
  value?: Record<string, unknown> | null
): CssrsDemeanorSelectionMap => {
  const next = createCssrsDemeanorSelectionState();

  if (!value) return next;

  for (const key of Object.keys(next)) {
    next[key] = value[key] === true;
  }

  return next;
};

export const normalizeCssrsDemeanorOtherTexts = (
  value?: Record<string, unknown> | null
): CssrsDemeanorOtherTextMap => {
  const next = createCssrsDemeanorOtherTextState();

  if (!value) return next;

  for (const key of Object.keys(next)) {
    next[key] = typeof value[key] === "string" ? String(value[key]).trim() : "";
  }

  return next;
};

export const normalizeCssrsProtectiveFactorTexts = (
  value?: Record<string, unknown> | null
): CssrsProtectiveFactorTextMap => {
  const next = createCssrsProtectiveFactorTextState();

  if (!value) return next;

  for (const key of Object.keys(next)) {
    next[key] = typeof value[key] === "string" ? String(value[key]) : "";
  }

  return next;
};

export const hasCompleteCssrsProtectiveFactorTexts = (
  value?: Record<string, unknown> | CssrsProtectiveFactorTextMap | null
) => {
  const normalized = normalizeCssrsProtectiveFactorTexts(value);

  return Object.values(normalized).every((text) => text.trim().length > 0);
};

