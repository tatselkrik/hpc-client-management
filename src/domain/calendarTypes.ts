export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "arrived"
  | "intake_in_progress"
  | "in_session"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentMode = "in_person" | "telecounseling";
export type AppointmentBookingSource = "phone" | "walk_in";
export type AppointmentClientStage = "new" | "existing";
export type CalendarView = "week" | "day" | "agenda";
export type AvailabilityKind = "available" | "unavailable";
export type AppointmentStatusEventSource =
  | "appointment_created"
  | "status_change"
  | "migration_snapshot";

export type AppointmentService = {
  id: string;
  name: string;
  default_duration_minutes: number;
  is_active: boolean;
};

export type ClinicHours = {
  weekday: number;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

export type CareTeamAvailability = {
  id: string;
  profile_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

export type CareTeamAvailabilityOverride = {
  id: string;
  profile_id: string;
  availability_date: string;
  starts_at: string;
  ends_at: string;
  availability_kind: AvailabilityKind;
  note: string | null;
};

export type AppointmentClientSummary = {
  id: string;
  client_name: string | null;
  mobile_number: string | null;
};

export type AppointmentProviderSummary = {
  id: string;
  full_name: string | null;
  hpc_representative_name: string | null;
};

export type AppointmentStatusActorSummary = {
  id: string;
  full_name: string | null;
};

export type AppointmentStatusEvent = {
  id: string;
  appointment_id: string;
  previous_status: AppointmentStatus | null;
  next_status: AppointmentStatus;
  recorded_at: string;
  recorded_by: string | null;
  event_source: AppointmentStatusEventSource;
  recorded_by_profile: AppointmentStatusActorSummary | null;
};

export type Appointment = {
  id: string;
  client_id: string | null;
  client_stage_at_booking: AppointmentClientStage;
  provisional_client_name: string | null;
  provisional_contact_number: string | null;
  booking_source: AppointmentBookingSource;
  provider_profile_id: string;
  service_id: string;
  appointment_mode: AppointmentMode;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  scheduling_note: string | null;
  cancellation_reason: string | null;
  intake_linked_at: string | null;
  removed_at: string | null;
  removed_by: string | null;
  removal_reason: string | null;
  created_at: string;
  updated_at: string;
  clients: AppointmentClientSummary | null;
  profiles: AppointmentProviderSummary | null;
  appointment_services: AppointmentService | null;
};

export type AppointmentDraft = {
  id: string;
  clientStage: AppointmentClientStage;
  clientId: string;
  provisionalClientName: string;
  provisionalContactNumber: string;
  bookingSource: AppointmentBookingSource;
  providerProfileId: string;
  serviceId: string;
  appointmentMode: AppointmentMode;
  appointmentDate: string;
  startTime: string;
  schedulingNote: string;
};
