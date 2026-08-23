import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "../App.css";
import type {
  Appointment,
  AppointmentDraft,
  AppointmentStatusEvent,
  CalendarView,
} from "../appShared";
import { CalendarSection, type CalendarSectionProps } from "../features/calendar/CalendarSection";
import { getCalendarDates } from "../features/calendar/calendarDate";

const providerOne = {
  id: "provider-1",
  full_name: "Dr. Maya Santos",
  role: "Psychologist / Counselor",
  hpc_representative_name: "Dr. Maya Santos",
};

const providerTwo = {
  id: "provider-2",
  full_name: "Counselor Paolo Reyes",
  role: "Psychologist / Counselor",
  hpc_representative_name: "Counselor Paolo Reyes",
};

const services = [
  { id: "service-1", name: "Initial Consultation", default_duration_minutes: 60, is_active: true },
  { id: "service-2", name: "Follow-up Session", default_duration_minutes: 45, is_active: true },
];

const sampleActiveClients = [
  { id: "client-1", client_name: "Ana Dela Cruz", created_at: "", updated_at: "", intake_date: "2026-01-10", client_status: "Active" as const, category_path: null, hpc_representative: providerOne.hpc_representative_name },
  { id: "client-2", client_name: "Lea Villanueva", created_at: "", updated_at: "", intake_date: "2026-02-12", client_status: "Active" as const, category_path: null, hpc_representative: providerOne.hpc_representative_name },
  ...Array.from({ length: 498 }, (_, index) => ({
    id: `scale-client-${index + 1}`,
    client_name: `Sample Client ${String(index + 1).padStart(3, "0")}`,
    created_at: "",
    updated_at: "",
    intake_date: "2026-03-01",
    client_status: "Active" as const,
    category_path: null,
    hpc_representative: providerOne.hpc_representative_name,
  })),
].sort((left, right) => left.client_name.localeCompare(right.client_name));

const previewRoleKey = new URLSearchParams(window.location.search).get("role") ?? "admin";
const previewRole = previewRoleKey === "staff"
  ? "Staff"
  : previewRoleKey === "psychologist"
    ? "Psychologist / Counselor"
    : "Admin";

const sampleAppointments: Appointment[] = [
  {
    id: "appointment-1",
    client_id: "client-1",
    client_stage_at_booking: "existing",
    provisional_client_name: null,
    provisional_contact_number: null,
    booking_source: "phone",
    provider_profile_id: providerOne.id,
    service_id: services[1].id,
    appointment_mode: "in_person",
    starts_at: "2026-08-24T01:00:00.000Z",
    ends_at: "2026-08-24T01:45:00.000Z",
    status: "confirmed",
    scheduling_note: null,
    cancellation_reason: null,
    intake_linked_at: null,
    removed_at: null,
    removed_by: null,
    removal_reason: null,
    created_at: "2026-08-20T01:00:00.000Z",
    updated_at: "2026-08-20T01:00:00.000Z",
    clients: { id: "client-1", client_name: "Ana Dela Cruz", mobile_number: "09170000001" },
    profiles: { id: providerOne.id, full_name: providerOne.full_name, hpc_representative_name: providerOne.hpc_representative_name },
    appointment_services: services[1],
  },
  {
    id: "appointment-2",
    client_id: null,
    client_stage_at_booking: "new",
    provisional_client_name: "Miguel Flores",
    provisional_contact_number: "09170000002",
    booking_source: "walk_in",
    provider_profile_id: providerTwo.id,
    service_id: services[0].id,
    appointment_mode: "telecounseling",
    starts_at: "2026-08-25T02:30:00.000Z",
    ends_at: "2026-08-25T03:30:00.000Z",
    status: "arrived",
    scheduling_note: null,
    cancellation_reason: null,
    intake_linked_at: null,
    removed_at: null,
    removed_by: null,
    removal_reason: null,
    created_at: "2026-08-20T01:00:00.000Z",
    updated_at: "2026-08-20T01:00:00.000Z",
    clients: null,
    profiles: { id: providerTwo.id, full_name: providerTwo.full_name, hpc_representative_name: providerTwo.hpc_representative_name },
    appointment_services: services[0],
  },
  {
    id: "appointment-3",
    client_id: "client-2",
    client_stage_at_booking: "existing",
    provisional_client_name: null,
    provisional_contact_number: null,
    booking_source: "phone",
    provider_profile_id: providerOne.id,
    service_id: services[0].id,
    appointment_mode: "in_person",
    starts_at: "2026-08-27T06:00:00.000Z",
    ends_at: "2026-08-27T07:00:00.000Z",
    status: "completed",
    scheduling_note: null,
    cancellation_reason: null,
    intake_linked_at: null,
    removed_at: null,
    removed_by: null,
    removal_reason: null,
    created_at: "2026-08-20T01:00:00.000Z",
    updated_at: "2026-08-20T01:00:00.000Z",
    clients: { id: "client-2", client_name: "Lea Villanueva", mobile_number: "09170000003" },
    profiles: { id: providerOne.id, full_name: providerOne.full_name, hpc_representative_name: providerOne.hpc_representative_name },
    appointment_services: services[0],
  },
];

const sampleStatusEvents: AppointmentStatusEvent[] = [
  {
    id: "status-event-1",
    appointment_id: "appointment-1",
    previous_status: null,
    next_status: "scheduled",
    recorded_at: "2026-08-20T01:00:00.000Z",
    recorded_by: "staff-1",
    event_source: "appointment_created",
    recorded_by_profile: { id: "staff-1", full_name: "Clinic Staff" },
  },
  {
    id: "status-event-2",
    appointment_id: "appointment-1",
    previous_status: "scheduled",
    next_status: "confirmed",
    recorded_at: "2026-08-23T02:12:00.000Z",
    recorded_by: "staff-1",
    event_source: "status_change",
    recorded_by_profile: { id: "staff-1", full_name: "Clinic Staff" },
  },
  {
    id: "status-event-3",
    appointment_id: "appointment-2",
    previous_status: null,
    next_status: "scheduled",
    recorded_at: "2026-08-20T01:05:00.000Z",
    recorded_by: "staff-1",
    event_source: "appointment_created",
    recorded_by_profile: { id: "staff-1", full_name: "Clinic Staff" },
  },
  {
    id: "status-event-4",
    appointment_id: "appointment-2",
    previous_status: "scheduled",
    next_status: "arrived",
    recorded_at: "2026-08-25T02:41:00.000Z",
    recorded_by: "staff-1",
    event_source: "status_change",
    recorded_by_profile: { id: "staff-1", full_name: "Clinic Staff" },
  },
  {
    id: "status-event-5",
    appointment_id: "appointment-3",
    previous_status: "in_session",
    next_status: "completed",
    recorded_at: "2026-08-27T07:02:00.000Z",
    recorded_by: providerOne.id,
    event_source: "status_change",
    recorded_by_profile: { id: providerOne.id, full_name: providerOne.full_name },
  },
];

function CalendarPreview() {
  const [anchorDate, setAnchorDate] = useState("2026-08-26");
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [selectedProviderId, setSelectedProviderId] = useState("all");
  const [isBookingPanelOpen, setIsBookingPanelOpen] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState("");
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft>({
    id: "",
    clientStage: "existing",
    clientId: "",
    provisionalClientName: "",
    provisionalContactNumber: "",
    bookingSource: "phone",
    providerProfileId: providerOne.id,
    serviceId: services[0].id,
    appointmentMode: "in_person",
    appointmentDate: "2026-08-26",
    startTime: "09:00",
    schedulingNote: "",
  });
  const visibleDates = useMemo(
    () => getCalendarDates(anchorDate, calendarView),
    [anchorDate, calendarView]
  );
  const filteredAppointments = sampleAppointments.filter(
    (appointment) =>
      selectedProviderId === "all" || appointment.provider_profile_id === selectedProviderId
  );

  const props: CalendarSectionProps = {
    appointments: sampleAppointments,
    statusEvents: sampleStatusEvents,
    filteredAppointments,
    services,
    clinicHours: [
      { weekday: 0, is_open: false, opens_at: null, closes_at: null },
      ...Array.from({ length: 6 }, (_, index) => ({ weekday: index + 1, is_open: true, opens_at: "08:00", closes_at: "18:00" })),
    ],
    availability: [
      { id: "weekly-1", profile_id: providerOne.id, weekday: 1, starts_at: "09:00", ends_at: "17:00", is_active: true },
      { id: "weekly-2", profile_id: providerOne.id, weekday: 2, starts_at: "09:00", ends_at: "17:00", is_active: true },
      { id: "weekly-3", profile_id: providerOne.id, weekday: 3, starts_at: "09:00", ends_at: "17:00", is_active: true },
      { id: "weekly-4", profile_id: providerOne.id, weekday: 4, starts_at: "09:00", ends_at: "17:00", is_active: true },
      { id: "weekly-5", profile_id: providerOne.id, weekday: 5, starts_at: "09:00", ends_at: "17:00", is_active: true },
      { id: "weekly-6", profile_id: providerTwo.id, weekday: 2, starts_at: "10:00", ends_at: "16:00", is_active: true },
      { id: "weekly-7", profile_id: providerTwo.id, weekday: 4, starts_at: "10:00", ends_at: "16:00", is_active: true },
    ],
    availabilityOverrides: [
      { id: "override-1", profile_id: providerOne.id, availability_date: "2026-08-26", starts_at: "13:00", ends_at: "15:00", availability_kind: "unavailable", note: "Clinic meeting" },
      { id: "override-2", profile_id: providerTwo.id, availability_date: "2026-08-28", starts_at: "09:00", ends_at: "12:00", availability_kind: "available", note: "Morning coverage" },
    ],
    providers: [providerOne, providerTwo],
    activeClients: sampleActiveClients,
    profile: previewRole === "Staff"
      ? { id: "staff-1", full_name: "Clinic Staff", role: previewRole, hpc_representative_name: null }
      : { id: providerOne.id, full_name: providerOne.full_name, role: previewRole, hpc_representative_name: providerOne.hpc_representative_name },
    anchorDate,
    setAnchorDate,
    calendarView,
    setCalendarView,
    visibleDates,
    selectedProviderId,
    setSelectedProviderId,
    appointmentDraft,
    setAppointmentDraft,
    isBookingPanelOpen,
    isLoadingCalendar: false,
    isSavingCalendar: false,
    calendarMessage,
    mayManageAppointments: previewRole === "Admin" || previewRole === "Staff",
    mayManageConfiguration: previewRole === "Admin",
    mayManageOwnAvailability: previewRole !== "Staff",
    mayViewTeamAvailability: previewRole === "Admin" || previewRole === "Staff",
    openNewAppointment: (date = anchorDate, startTime = "09:00") => {
      setCalendarMessage("");
      setAppointmentDraft((current) => ({ ...current, id: "", appointmentDate: date, startTime }));
      setIsBookingPanelOpen(true);
    },
    openExistingAppointment: (appointment) => {
      setCalendarMessage("");
      setAppointmentDraft((current) => ({ ...current, id: appointment.id }));
      setIsBookingPanelOpen(true);
    },
    closeBookingPanel: () => setIsBookingPanelOpen(false),
    clearCalendarMessage: () => setCalendarMessage(""),
    saveAppointment: async () => {
      if (!appointmentDraft.clientId && appointmentDraft.clientStage === "existing") {
        setCalendarMessage("Choose an existing client.");
        return false;
      }
      setCalendarMessage("Appointment saved.");
      setIsBookingPanelOpen(false);
      return true;
    },
    updateAppointmentStatus: async () => {
      setCalendarMessage("Appointment status saved.");
      return true;
    },
    removeAppointment: async () => {
      setCalendarMessage("Appointment removed from the calendar.");
      return true;
    },
    beginAppointmentIntake: async () => undefined,
    addAvailability: async () => undefined,
    removeAvailability: async () => undefined,
    addAvailabilityOverride: async () => undefined,
    removeAvailabilityOverride: async () => undefined,
    saveClinicHours: async () => undefined,
    saveService: async () => undefined,
    getAvailableStatusTransitions: (appointment) =>
      appointment.status === "confirmed" ? ["arrived", "cancelled", "no_show"] : [],
    loadCalendar: async () => true,
  };

  return <CalendarSection {...props} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><CalendarPreview /></StrictMode>
);
