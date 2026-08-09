import type { AnnouncementPriority } from "./appTypes";

export type ClientStatus = "Active" | "Terminated";

export type ClientCategory = {
  id: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
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

export type ClientDocument = ClientStoredFileRecord & { document_name: string };
export type ClientAssessment = ClientStoredFileRecord & { assessment_name: string };
