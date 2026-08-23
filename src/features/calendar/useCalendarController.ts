import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { supabase } from "../../lib/supabase";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import type {
  Appointment,
  AppointmentDraft,
  AppointmentService,
  AppointmentStatus,
  AppointmentStatusEvent,
  CalendarView,
  CareTeamAvailability,
  CareTeamAvailabilityOverride,
  CareTeamMemberView,
  ClientListItem,
  ClientTab,
  ClinicHours,
  Profile,
  Section,
} from "../../appShared";
import {
  canManageAppointments,
  canManageCalendarConfiguration,
  canUpdateOwnAppointmentStatus,
  getProfileDisplayRole,
  hasHpcRepresentativeAssignment,
} from "../../appShared";
import {
  addCalendarDays,
  getCalendarDates,
  getPhilippineDateKey,
  toPhilippineIso,
  todayPhilippineDateKey,
} from "./calendarDate";

const APPOINTMENT_SELECT = `
  id,
  client_id,
  client_stage_at_booking,
  provisional_client_name,
  provisional_contact_number,
  booking_source,
  provider_profile_id,
  service_id,
  appointment_mode,
  starts_at,
  ends_at,
  status,
  scheduling_note,
  cancellation_reason,
  intake_linked_at,
  removed_at,
  removed_by,
  removal_reason,
  created_at,
  updated_at,
  clients ( id, client_name, mobile_number ),
  profiles!appointments_provider_profile_id_fkey (
    id,
    full_name,
    hpc_representative_name
  ),
  appointment_services (
    id,
    name,
    default_duration_minutes,
    is_active
  )
`;

const APPOINTMENT_STATUS_EVENT_SELECT = `
  id,
  appointment_id,
  previous_status,
  next_status,
  recorded_at,
  recorded_by,
  event_source,
  recorded_by_profile:profiles!appointment_status_events_recorded_by_fkey (
    id,
    full_name
  ),
  appointments!inner ( starts_at )
`;

const emptyDraft = (providerProfileId = "", serviceId = ""): AppointmentDraft => ({
  id: "",
  clientStage: "existing",
  clientId: "",
  provisionalClientName: "",
  provisionalContactNumber: "",
  bookingSource: "phone",
  providerProfileId,
  serviceId,
  appointmentMode: "in_person",
  appointmentDate: todayPhilippineDateKey(),
  startTime: "09:00",
  schedulingNote: "",
});

const statusTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "arrived", "cancelled", "no_show"],
  confirmed: ["scheduled", "arrived", "cancelled", "no_show"],
  arrived: ["intake_in_progress", "in_session", "cancelled", "no_show"],
  intake_in_progress: ["in_session", "cancelled"],
  in_session: ["completed", "cancelled"],
  completed: [],
  cancelled: ["scheduled"],
  no_show: ["scheduled"],
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
};

const timeRangesOverlap = (
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string
) =>
  timeToMinutes(leftStart) < timeToMinutes(rightEnd) &&
  timeToMinutes(leftEnd) > timeToMinutes(rightStart);

type CalendarControllerOptions = {
  activeSection: Section;
  profile: Profile | null;
  clients: ClientListItem[];
  careTeamMembers: CareTeamMemberView[];
  loadClients: () => Promise<void>;
  setClientMessage: (message: string) => void;
  setSelectedClientId: Dispatch<SetStateAction<string>>;
  setActiveClientTab: Dispatch<SetStateAction<ClientTab>>;
  setActiveSection: Dispatch<SetStateAction<Section>>;
};

type LoadCalendarOptions = {
  preserveMessage?: boolean;
};

export function useCalendarController({
  activeSection,
  profile,
  clients,
  careTeamMembers,
  loadClients,
  setClientMessage,
  setSelectedClientId,
  setActiveClientTab,
  setActiveSection,
}: CalendarControllerOptions) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statusEvents, setStatusEvents] = useState<AppointmentStatusEvent[]>([]);
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [clinicHours, setClinicHours] = useState<ClinicHours[]>([]);
  const [availability, setAvailability] = useState<CareTeamAvailability[]>([]);
  const [availabilityOverrides, setAvailabilityOverrides] =
    useState<CareTeamAvailabilityOverride[]>([]);
  const [anchorDate, setAnchorDate] = useState(todayPhilippineDateKey);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [selectedProviderId, setSelectedProviderId] = useState("all");
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft>(() =>
    emptyDraft()
  );
  const [isBookingPanelOpen, setIsBookingPanelOpen] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState("");

  const role = getProfileDisplayRole(profile?.role);
  const mayManageAppointments = canManageAppointments(role);
  const mayManageConfiguration = canManageCalendarConfiguration(role);
  const mayManageOwnAvailability = hasHpcRepresentativeAssignment(
    profile?.hpc_representative_name
  );
  const mayViewTeamAvailability = mayManageAppointments;
  const mayUpdateOwnStatus =
    canUpdateOwnAppointmentStatus(role) && mayManageOwnAvailability;

  const providers = useMemo(
    () =>
      careTeamMembers.filter(
        (member) => hasHpcRepresentativeAssignment(member.hpc_representative_name)
      ),
    [careTeamMembers]
  );

  const activeClients = useMemo(
    () =>
      clients
        .filter((client) => client.client_status !== "Terminated")
        .sort((left, right) =>
          (left.client_name ?? "").localeCompare(right.client_name ?? "")
        ),
    [clients]
  );

  const visibleDates = useMemo(
    () => getCalendarDates(anchorDate, calendarView),
    [anchorDate, calendarView]
  );

  const filteredAppointments = useMemo(() => {
    const visibleDateSet = new Set(visibleDates);
    return appointments.filter(
      (appointment) =>
        visibleDateSet.has(getPhilippineDateKey(appointment.starts_at)) &&
        (selectedProviderId === "all" ||
          appointment.provider_profile_id === selectedProviderId)
    );
  }, [appointments, selectedProviderId, visibleDates]);

  const loadCalendar = useCallback(async (
    { preserveMessage = false }: LoadCalendarOptions = {}
  ) => {
    if (!profile?.id) return false;

    setIsLoadingCalendar(true);
    if (!preserveMessage) {
      setCalendarMessage(feedbackMessages.loading("Loading calendar"));
    }

    const rangeStart = toPhilippineIso(addCalendarDays(anchorDate, -14), "00:00");
    const rangeEnd = toPhilippineIso(addCalendarDays(anchorDate, 46), "00:00");

    const [
      appointmentsResult,
      statusEventsResult,
      servicesResult,
      hoursResult,
      availabilityResult,
      overridesResult,
    ] =
      await Promise.all([
        supabase
          .from("appointments")
          .select(APPOINTMENT_SELECT)
          .is("removed_at", null)
          .gte("starts_at", rangeStart)
          .lt("starts_at", rangeEnd)
          .order("starts_at", { ascending: true }),
        supabase
          .from("appointment_status_events")
          .select(APPOINTMENT_STATUS_EVENT_SELECT)
          .gte("appointments.starts_at", rangeStart)
          .lt("appointments.starts_at", rangeEnd)
          .order("recorded_at", { ascending: true }),
        supabase
          .from("appointment_services")
          .select("id, name, default_duration_minutes, is_active")
          .order("name", { ascending: true }),
        supabase
          .from("clinic_hours")
          .select("weekday, is_open, opens_at, closes_at")
          .order("weekday", { ascending: true }),
        supabase
          .from("care_team_availability")
          .select("id, profile_id, weekday, starts_at, ends_at, is_active")
          .order("weekday", { ascending: true })
          .order("starts_at", { ascending: true }),
        supabase
          .from("care_team_availability_overrides")
          .select(
            "id, profile_id, availability_date, starts_at, ends_at, availability_kind, note"
          )
          .gte("availability_date", addCalendarDays(anchorDate, -14))
          .lte("availability_date", addCalendarDays(anchorDate, 45))
          .order("availability_date", { ascending: true })
          .order("starts_at", { ascending: true }),
      ]);

    const firstError = [
      appointmentsResult.error,
      statusEventsResult.error,
      servicesResult.error,
      hoursResult.error,
      availabilityResult.error,
      overridesResult.error,
    ].find(Boolean);

    if (firstError) {
      setCalendarMessage(
        feedbackMessages.error("We could not load the appointment calendar.", firstError.message)
      );
      setIsLoadingCalendar(false);
      return false;
    }

    setAppointments((appointmentsResult.data ?? []) as unknown as Appointment[]);
    setStatusEvents(
      (statusEventsResult.data ?? []) as unknown as AppointmentStatusEvent[]
    );
    setServices((servicesResult.data ?? []) as AppointmentService[]);
    setClinicHours((hoursResult.data ?? []) as ClinicHours[]);
    setAvailability((availabilityResult.data ?? []) as CareTeamAvailability[]);
    setAvailabilityOverrides(
      (overridesResult.data ?? []) as CareTeamAvailabilityOverride[]
    );
    if (!preserveMessage) setCalendarMessage("");
    setIsLoadingCalendar(false);
    return true;
  }, [anchorDate, profile?.id]);

  useEffect(() => {
    if (activeSection === "calendar") void loadCalendar();
  }, [activeSection, loadCalendar]);

  useEffect(() => {
    if (!appointmentDraft.providerProfileId && providers[0]?.id) {
      setAppointmentDraft((current) => ({
        ...current,
        providerProfileId: providers[0].id,
      }));
    }
  }, [appointmentDraft.providerProfileId, providers]);

  useEffect(() => {
    const firstActiveService = services.find((service) => service.is_active);
    if (!appointmentDraft.serviceId && firstActiveService) {
      setAppointmentDraft((current) => ({ ...current, serviceId: firstActiveService.id }));
    }
  }, [appointmentDraft.serviceId, services]);

  const openNewAppointment = useCallback(
    (date = anchorDate, startTime = "09:00") => {
      const defaultProvider = selectedProviderId === "all"
        ? providers[0]?.id ?? ""
        : selectedProviderId;
      const defaultService = services.find((service) => service.is_active)?.id ?? "";
      setAppointmentDraft({
        ...emptyDraft(defaultProvider, defaultService),
        appointmentDate: date,
        startTime,
      });
      setCalendarMessage("");
      setIsBookingPanelOpen(true);
    },
    [anchorDate, providers, selectedProviderId, services]
  );

  const openExistingAppointment = useCallback((appointment: Appointment) => {
    setAppointmentDraft({
      id: appointment.id,
      clientStage: appointment.client_stage_at_booking,
      clientId: appointment.client_id ?? "",
      provisionalClientName: appointment.provisional_client_name ?? "",
      provisionalContactNumber: appointment.provisional_contact_number ?? "",
      bookingSource: appointment.booking_source,
      providerProfileId: appointment.provider_profile_id,
      serviceId: appointment.service_id,
      appointmentMode: appointment.appointment_mode,
      appointmentDate: getPhilippineDateKey(appointment.starts_at),
      startTime: new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(appointment.starts_at)),
      schedulingNote: appointment.scheduling_note ?? "",
    });
    setCalendarMessage("");
    setIsBookingPanelOpen(true);
  }, []);

  const closeBookingPanel = useCallback(() => {
    if (!isSavingCalendar) setIsBookingPanelOpen(false);
  }, [isSavingCalendar]);

  const clearCalendarMessage = useCallback(() => setCalendarMessage(""), []);

  const refreshAfterMutation = useCallback(
    async (successMessage: string) => {
      const refreshed = await loadCalendar({ preserveMessage: true });
      setCalendarMessage(
        refreshed
          ? successMessage
          : feedbackMessages.warning(
              `${successMessage} The calendar could not refresh automatically. Reopen the Calendar workspace before making another change.`
            )
      );
    },
    [loadCalendar]
  );

  const saveAppointment = useCallback(async () => {
    const draft = appointmentDraft;
    const service = services.find((item) => item.id === draft.serviceId);
    if (!service || !draft.providerProfileId || !draft.appointmentDate || !draft.startTime) {
      setCalendarMessage(feedbackMessages.warning("Complete the service, clinician, date, and time."));
      return false;
    }
    if (draft.clientStage === "existing" && !draft.clientId) {
      setCalendarMessage(feedbackMessages.warning("Choose an existing client."));
      return false;
    }
    if (draft.clientStage === "new" && draft.provisionalClientName.trim().length < 2) {
      setCalendarMessage(feedbackMessages.warning("Enter the first-timer's name."));
      return false;
    }
    if (
      draft.clientStage === "new" &&
      draft.provisionalContactNumber.trim() &&
      draft.provisionalContactNumber.trim().length < 7
    ) {
      setCalendarMessage(feedbackMessages.warning("Enter a valid contact number or leave it blank."));
      return false;
    }

    setIsSavingCalendar(true);
    setCalendarMessage(feedbackMessages.loading("Saving appointment"));
    const start = new Date(toPhilippineIso(draft.appointmentDate, draft.startTime));
    const end = new Date(start.getTime() + service.default_duration_minutes * 60_000);
    const payload = {
      client_id: draft.clientStage === "existing" ? draft.clientId : null,
      client_stage_at_booking: draft.clientStage,
      provisional_client_name:
        draft.clientStage === "new" ? draft.provisionalClientName.trim() : null,
      provisional_contact_number:
        draft.clientStage === "new"
          ? draft.provisionalContactNumber.trim() || null
          : null,
      booking_source: draft.bookingSource,
      provider_profile_id: draft.providerProfileId,
      service_id: draft.serviceId,
      appointment_mode: draft.appointmentMode,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      scheduling_note: draft.schedulingNote.trim() || null,
    };

    const result = draft.id
      ? await supabase.from("appointments").update(payload).eq("id", draft.id)
      : await supabase.from("appointments").insert(payload);

    if (result.error) {
      setCalendarMessage(
        feedbackMessages.saveFailed("appointment", result.error.message)
      );
      setIsSavingCalendar(false);
      return false;
    }

    await refreshAfterMutation(feedbackMessages.saved("Appointment"));
    setIsBookingPanelOpen(false);
    setIsSavingCalendar(false);
    return true;
  }, [appointmentDraft, refreshAfterMutation, services]);

  const updateAppointmentStatus = useCallback(
    async (appointment: Appointment, nextStatus: AppointmentStatus, cancellationReason = "") => {
      setIsSavingCalendar(true);
      setCalendarMessage(feedbackMessages.loading("Updating appointment"));
      const { error } = await supabase
        .from("appointments")
        .update({
          status: nextStatus,
          cancellation_reason:
            nextStatus === "cancelled" ? cancellationReason.trim() : null,
        })
        .eq("id", appointment.id);

      if (error) {
        setCalendarMessage(feedbackMessages.saveFailed("appointment", error.message));
        setIsSavingCalendar(false);
        return false;
      }

      await refreshAfterMutation(feedbackMessages.saved("Appointment status"));
      setIsSavingCalendar(false);
      return true;
    },
    [refreshAfterMutation]
  );

  const removeAppointment = useCallback(
    async (appointment: Appointment, reason: string) => {
      const trimmedReason = reason.trim();
      if (trimmedReason.length < 2) {
        setCalendarMessage(
          feedbackMessages.warning("Enter a reason for removing the appointment.")
        );
        return false;
      }

      setIsSavingCalendar(true);
      setCalendarMessage(feedbackMessages.loading("Removing appointment"));
      const { error } = await supabase
        .from("appointments")
        .update({
          removed_at: new Date().toISOString(),
          removal_reason: trimmedReason,
        })
        .eq("id", appointment.id);

      if (error) {
        setCalendarMessage(
          feedbackMessages.error("We could not remove the appointment.", error.message)
        );
        setIsSavingCalendar(false);
        return false;
      }

      await refreshAfterMutation(
        feedbackMessages.success("Appointment removed from the calendar.")
      );
      setIsSavingCalendar(false);
      return true;
    },
    [refreshAfterMutation]
  );

  const beginAppointmentIntake = useCallback(
    async (appointment: Appointment) => {
      setIsSavingCalendar(true);
      setCalendarMessage(feedbackMessages.loading("Beginning intake"));
      const { data, error } = await supabase.rpc("hpc_begin_appointment_intake", {
        target_appointment_id: appointment.id,
      });

      if (error || typeof data !== "string") {
        setCalendarMessage(
          feedbackMessages.error(
            "We could not begin intake.",
            error?.message ?? "The new client record was not returned."
          )
        );
        setIsSavingCalendar(false);
        return;
      }

      await loadClients();
      setSelectedClientId(data);
      setActiveClientTab("overview");
      setClientMessage(
        feedbackMessages.success("Intake started. The new client record is ready.")
      );
      setActiveSection("clients");
      setIsSavingCalendar(false);
    },
    [
      loadClients,
      setActiveClientTab,
      setActiveSection,
      setClientMessage,
      setSelectedClientId,
    ]
  );

  const addAvailability = useCallback(
    async (weekday: number, startsAt: string, endsAt: string) => {
      if (!profile?.id) return;
      setIsSavingCalendar(true);
      const { error } = await supabase.from("care_team_availability").insert({
        profile_id: profile.id,
        weekday,
        starts_at: startsAt,
        ends_at: endsAt,
      });
      setCalendarMessage(
        error
          ? feedbackMessages.saveFailed("availability", error.message)
          : feedbackMessages.saved("Availability")
      );
      if (!error) {
        await refreshAfterMutation(feedbackMessages.saved("Availability"));
      }
      setIsSavingCalendar(false);
    },
    [profile?.id, refreshAfterMutation]
  );

  const removeAvailability = useCallback(
    async (id: string) => {
      setIsSavingCalendar(true);
      const { error } = await supabase
        .from("care_team_availability")
        .delete()
        .eq("id", id);
      setCalendarMessage(
        error
          ? feedbackMessages.error("We could not remove the availability.", error.message)
          : feedbackMessages.success("Availability removed.")
      );
      if (!error) {
        await refreshAfterMutation(feedbackMessages.success("Availability removed."));
      }
      setIsSavingCalendar(false);
    },
    [refreshAfterMutation]
  );

  const addAvailabilityOverride = useCallback(
    async (
      availabilityDate: string,
      startsAt: string,
      endsAt: string,
      availabilityKind: "available" | "unavailable",
      note: string
    ) => {
      if (!profile?.id) return;
      const conflictsWithExisting = availabilityOverrides.some(
        (entry) =>
          entry.profile_id === profile.id &&
          entry.availability_date === availabilityDate &&
          timeRangesOverlap(startsAt, endsAt, entry.starts_at, entry.ends_at)
      );
      if (conflictsWithExisting) {
        setCalendarMessage(
          feedbackMessages.warning(
            "This time conflicts with an existing available or unavailable block."
          )
        );
        return;
      }
      setIsSavingCalendar(true);
      const { error } = await supabase.from("care_team_availability_overrides").insert({
        profile_id: profile.id,
        availability_date: availabilityDate,
        starts_at: startsAt,
        ends_at: endsAt,
        availability_kind: availabilityKind,
        note: note.trim() || null,
      });
      setCalendarMessage(
        error
          ? feedbackMessages.saveFailed("availability exception", error.message)
          : feedbackMessages.saved("Availability exception")
      );
      if (!error) {
        await refreshAfterMutation(
          feedbackMessages.saved("Availability exception")
        );
      }
      setIsSavingCalendar(false);
    },
    [availabilityOverrides, profile?.id, refreshAfterMutation]
  );

  const removeAvailabilityOverride = useCallback(
    async (id: string) => {
      setIsSavingCalendar(true);
      const { error } = await supabase
        .from("care_team_availability_overrides")
        .delete()
        .eq("id", id);
      setCalendarMessage(
        error
          ? feedbackMessages.error("We could not remove the exception.", error.message)
          : feedbackMessages.success("Availability exception removed.")
      );
      if (!error) {
        await refreshAfterMutation(
          feedbackMessages.success("Availability exception removed.")
        );
      }
      setIsSavingCalendar(false);
    },
    [refreshAfterMutation]
  );

  const saveClinicHours = useCallback(
    async (hours: ClinicHours[]) => {
      setIsSavingCalendar(true);
      try {
        for (const day of hours) {
          const { error } = await supabase
            .from("clinic_hours")
            .update({
              is_open: day.is_open,
              opens_at: day.is_open ? day.opens_at : null,
              closes_at: day.is_open ? day.closes_at : null,
            })
            .eq("weekday", day.weekday);
          if (error) throw error;
        }
        await refreshAfterMutation(feedbackMessages.saved("Clinic hours"));
      } catch (error) {
        setCalendarMessage(
          feedbackMessages.saveFailed("clinic hours", getErrorDetail(error))
        );
      } finally {
        setIsSavingCalendar(false);
      }
    },
    [refreshAfterMutation]
  );

  const saveService = useCallback(
    async (service: Pick<AppointmentService, "id" | "name" | "default_duration_minutes" | "is_active">) => {
      setIsSavingCalendar(true);
      const payload = {
        name: service.name.trim(),
        default_duration_minutes: service.default_duration_minutes,
        is_active: service.is_active,
      };
      const result = service.id
        ? await supabase.from("appointment_services").update(payload).eq("id", service.id)
        : await supabase.from("appointment_services").insert(payload);
      setCalendarMessage(
        result.error
          ? feedbackMessages.saveFailed("appointment service", result.error.message)
          : feedbackMessages.saved("Appointment service")
      );
      if (!result.error) {
        await refreshAfterMutation(feedbackMessages.saved("Appointment service"));
      }
      setIsSavingCalendar(false);
    },
    [refreshAfterMutation]
  );

  const getAvailableStatusTransitions = useCallback(
    (appointment: Appointment) => {
      // First-timer intake must run through the transactional Begin Intake RPC,
      // while existing clients skip the provisional intake status entirely.
      const transitions = statusTransitions[appointment.status].filter(
        (status) => status !== "intake_in_progress"
      );
      if (mayManageAppointments) return transitions;
      if (mayUpdateOwnStatus && appointment.provider_profile_id === profile?.id) {
        return transitions.filter((status) => status === "in_session" || status === "completed");
      }
      return [];
    },
    [mayManageAppointments, mayUpdateOwnStatus, profile?.id]
  );

  return {
    appointments,
    statusEvents,
    filteredAppointments,
    services,
    clinicHours,
    availability,
    availabilityOverrides,
    providers,
    activeClients,
    profile,
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
    isLoadingCalendar,
    isSavingCalendar,
    calendarMessage,
    mayManageAppointments,
    mayManageConfiguration,
    mayManageOwnAvailability,
    mayViewTeamAvailability,
    openNewAppointment,
    openExistingAppointment,
    closeBookingPanel,
    clearCalendarMessage,
    saveAppointment,
    updateAppointmentStatus,
    removeAppointment,
    beginAppointmentIntake,
    addAvailability,
    removeAvailability,
    addAvailabilityOverride,
    removeAvailabilityOverride,
    saveClinicHours,
    saveService,
    getAvailableStatusTransitions,
    loadCalendar,
  };
}

export type CalendarController = ReturnType<typeof useCalendarController>;
