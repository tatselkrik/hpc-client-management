import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "../../components/StatusMessage";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import type {
  Appointment,
  AppointmentService,
  AppointmentStatus,
  AppointmentStatusEvent,
  CalendarView,
  ClientListItem,
  ClinicHours,
} from "../../appShared";
import {
  addCalendarDays,
  appointmentDisplayName,
  appointmentStatusLabel,
  formatCalendarDate,
  formatCalendarRange,
  formatPhilippineClockDate,
  formatPhilippineDateTime,
  formatPhilippineTime,
  getCalendarDates,
  getPhilippineDateKey,
  todayPhilippineDateKey,
} from "./calendarDate";
import {
  AvailabilityWeekGrid,
  clinicianDisplayName,
} from "./AvailabilityWeekGrid";
import type { AvailabilityBlockSelection } from "./AvailabilityWeekGrid";
import type { CalendarController } from "./useCalendarController";

export type CalendarSectionProps = CalendarController;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type CalendarWorkspaceTab =
  | "schedule"
  | "my_availability"
  | "team_availability"
  | "configuration";

type ScheduleWorkspaceMode = "calendar" | "status_board";
type AppointmentActionKind = "cancel" | "remove";

type AppointmentActionRequest = {
  kind: AppointmentActionKind;
  appointment: Appointment;
};

const CLIENT_PICKER_RESULT_LIMIT = 12;

const BOARD_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "arrived",
  "intake_in_progress",
  "in_session",
  "completed",
];

const statusActionLabel = (status: AppointmentStatus) => {
  switch (status) {
    case "confirmed": return "Mark confirmed";
    case "arrived": return "Mark arrived";
    case "in_session": return "Start session";
    case "completed": return "Mark completed";
    case "cancelled": return "Cancel appointment";
    case "no_show": return "Mark no-show";
    case "scheduled": return "Return to scheduled";
    default: return appointmentStatusLabel(status);
  }
};

const eventActorLabel = (event: AppointmentStatusEvent) => {
  if (event.event_source === "migration_snapshot") return "Earlier appointment record";
  return event.recorded_by_profile?.full_name?.trim() || "Clinic account";
};

function PhilippineClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time className="calendar-live-clock" dateTime={now.toISOString()}>
      <span>Philippine time</span>
      <strong>{formatPhilippineTime(now.toISOString())}</strong>
      <small>{formatPhilippineClockDate(now)}</small>
    </time>
  );
}

function AppointmentTimelineDialog({
  appointment,
  events,
  onClose,
}: {
  appointment: Appointment;
  events: AppointmentStatusEvent[];
  onClose: () => void;
}) {
  return (
    <div className="app-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="app-modal calendar-timeline-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-timeline-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="calendar-modal-header">
          <div>
            <span className="workspace-header-eyebrow">Appointment history</span>
            <h3 id="calendar-timeline-title">{appointmentDisplayName(appointment)}</h3>
            <p>{formatPhilippineDateTime(appointment.starts_at)} · {appointment.profiles?.full_name ?? "Assigned clinician"}</p>
          </div>
          <button type="button" className="small-button secondary-button" onClick={onClose}>Close</button>
        </div>
        <ol className="calendar-status-timeline">
          {events.length ? events.map((event) => (
            <li key={event.id} className={`status-${event.next_status}`}>
              <span className="calendar-timeline-marker" aria-hidden="true" />
              <div>
                <strong>{appointmentStatusLabel(event.next_status)}</strong>
                <span>{formatPhilippineDateTime(event.recorded_at)}</span>
                <small>{eventActorLabel(event)}</small>
                {event.event_source === "migration_snapshot" ? (
                  <small>This was the current status when version 0.3.2 was installed; an earlier marking time was not invented.</small>
                ) : null}
              </div>
            </li>
          )) : (
            <li className="calendar-timeline-empty">No recorded status changes are available yet.</li>
          )}
        </ol>
      </section>
    </div>
  );
}

function AppointmentCard({
  appointment,
  canEdit,
  canBeginIntake,
  canRemove,
  isBusy,
  statusEvents,
  transitions,
  onEdit,
  onStatusChange,
  onBeginIntake,
  onRequestCancel,
  onRequestRemove,
  onOpenTimeline,
}: {
  appointment: Appointment;
  canEdit: boolean;
  canBeginIntake: boolean;
  canRemove: boolean;
  isBusy: boolean;
  statusEvents: AppointmentStatusEvent[];
  transitions: AppointmentStatus[];
  onEdit: () => void;
  onStatusChange: (status: AppointmentStatus, cancellationReason?: string) => void;
  onBeginIntake: () => void;
  onRequestCancel: () => void;
  onRequestRemove: () => void;
  onOpenTimeline: () => void;
}) {
  const latestStatusEvent = statusEvents[statusEvents.length - 1];
  const handleStatusChange = (nextStatus: AppointmentStatus) => {
    if (nextStatus === "cancelled") {
      onRequestCancel();
      return;
    }
    onStatusChange(nextStatus);
  };

  return (
    <article className={`calendar-appointment-card status-${appointment.status}`}>
      <div className="calendar-appointment-time">
        {formatPhilippineTime(appointment.starts_at)}–{formatPhilippineTime(appointment.ends_at)}
      </div>
      <strong>{appointmentDisplayName(appointment)}</strong>
      <span>{appointment.appointment_services?.name ?? "Appointment"}</span>
      <span>{appointment.profiles?.full_name ?? "Assigned clinician"}</span>
      <div className="calendar-appointment-meta">
        <span className={`calendar-status-pill status-${appointment.status}`}>
          {appointmentStatusLabel(appointment.status)}
        </span>
        <span>{appointment.appointment_mode === "telecounseling" ? "Telecounseling" : "In person"}</span>
        {appointment.client_stage_at_booking === "new" ? <span>First-timer</span> : null}
      </div>
      {latestStatusEvent ? (
        <p className="calendar-status-timestamp">
          {latestStatusEvent.event_source === "migration_snapshot" ? "Status recorded" : appointmentStatusLabel(latestStatusEvent.next_status)} at {formatPhilippineTime(latestStatusEvent.recorded_at)} · {eventActorLabel(latestStatusEvent)}
        </p>
      ) : null}
      <div className="calendar-card-actions">
        <button type="button" className="small-button secondary-button" onClick={onOpenTimeline}>
          View timeline
        </button>
        {canEdit ? (
            <button type="button" className="small-button secondary-button" onClick={onEdit} disabled={isBusy}>
              Edit
            </button>
        ) : null}
        {canRemove ? (
            <button type="button" className="small-button danger-button" onClick={onRequestRemove} disabled={isBusy}>
              Remove
            </button>
        ) : null}
        {transitions.map((status) => (
          <button
            key={status}
            type="button"
            className={`small-button ${status === "cancelled" ? "danger-button" : "secondary-button"}`}
            onClick={() => handleStatusChange(status)}
            disabled={isBusy}
          >
            {statusActionLabel(status)}
          </button>
        ))}
        {canBeginIntake ? (
            <button type="button" className="small-button" onClick={onBeginIntake} disabled={isBusy}>
              Begin Intake
            </button>
        ) : null}
      </div>
    </article>
  );
}

function ExistingClientPicker({
  clients,
  selectedClientId,
  onSelect,
}: {
  clients: ClientListItem[];
  selectedClientId: string;
  onSelect: (clientId: string) => void;
}) {
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const [query, setQuery] = useState("");
  const [isChoosing, setIsChoosing] = useState(!selectedClientId);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingClients = useMemo(
    () => clients.filter((client) => {
      if (!normalizedQuery) return true;
      return [client.client_name, client.intake_date, client.category_path]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(normalizedQuery));
    }),
    [clients, normalizedQuery]
  );
  const visibleClients = matchingClients.slice(0, CLIENT_PICKER_RESULT_LIMIT);

  useEffect(() => {
    setQuery("");
    setIsChoosing(!selectedClientId);
  }, [selectedClientId]);

  return (
    <div className="form-label calendar-form-span-2 calendar-client-picker">
      <span>Client</span>
      {selectedClient && !isChoosing ? (
        <div className="calendar-selected-client">
          <div>
            <strong>{selectedClient.client_name ?? "Unnamed client"}</strong>
            <small>
              {selectedClient.intake_date
                ? `Intake ${formatCalendarDate(selectedClient.intake_date, { month: "short", day: "numeric", year: "numeric" })}`
                : "Existing active client"}
            </small>
          </div>
          <button type="button" className="small-button secondary-button" onClick={() => setIsChoosing(true)}>
            Change client
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search active clients by name"
            aria-label="Search active clients"
            autoComplete="off"
          />
          <div className="calendar-client-results" role="listbox" aria-label="Matching active clients">
            {visibleClients.length ? visibleClients.map((client) => (
              <button
                key={client.id}
                type="button"
                role="option"
                aria-selected={client.id === selectedClientId}
                onClick={() => onSelect(client.id)}
              >
                <strong>{client.client_name ?? "Unnamed client"}</strong>
                <span>
                  {client.intake_date
                    ? `Intake ${formatCalendarDate(client.intake_date, { month: "short", day: "numeric", year: "numeric" })}`
                    : "Existing active client"}
                </span>
              </button>
            )) : (
              <p>No matching active clients for this clinician.</p>
            )}
          </div>
          <small className="calendar-client-result-count" aria-live="polite">
            {matchingClients.length > CLIENT_PICKER_RESULT_LIMIT
              ? `Showing the first ${CLIENT_PICKER_RESULT_LIMIT} of ${matchingClients.length} matches. Type more of the name to narrow the list.`
              : `${matchingClients.length} matching active client${matchingClients.length === 1 ? "" : "s"}.`}
          </small>
        </>
      )}
      <small>Clients are matched to the clinician’s HPC Representative assignment.</small>
    </div>
  );
}

function BookingPanel(props: CalendarSectionProps) {
  const {
    activeClients,
    appointmentDraft,
    calendarMessage,
    closeBookingPanel,
    isSavingCalendar,
    providers,
    saveAppointment,
    services,
    setAppointmentDraft,
  } = props;
  const selectedProvider = providers.find(
    (provider) => provider.id === appointmentDraft.providerProfileId
  );
  const eligibleExistingClients = activeClients.filter(
    (client) =>
      !selectedProvider?.hpc_representative_name ||
      client.hpc_representative?.trim().toLowerCase() ===
        selectedProvider.hpc_representative_name.trim().toLowerCase()
  );

  return (
    <div className="app-modal-overlay" role="presentation" onMouseDown={closeBookingPanel}>
      <section
        className="app-modal calendar-booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-booking-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="calendar-modal-header">
          <div>
            <span className="workspace-header-eyebrow">Staff scheduling</span>
            <h3 id="calendar-booking-title">
              {appointmentDraft.id ? "Update appointment" : "Book appointment"}
            </h3>
          </div>
          <button type="button" className="small-button secondary-button" onClick={closeBookingPanel} disabled={isSavingCalendar}>
            Close
          </button>
        </div>

        <div className="calendar-form-grid">
          <fieldset className="calendar-client-stage-fieldset">
            <legend>Client type</legend>
            <label>
              <input
                type="radio"
                name="client-stage"
                value="existing"
                checked={appointmentDraft.clientStage === "existing"}
                disabled={Boolean(appointmentDraft.id)}
                onChange={() => setAppointmentDraft((current) => ({
                  ...current,
                  clientStage: "existing",
                  provisionalClientName: "",
                  provisionalContactNumber: "",
                }))}
              />
              Existing client
            </label>
            <label>
              <input
                type="radio"
                name="client-stage"
                value="new"
                checked={appointmentDraft.clientStage === "new"}
                disabled={Boolean(appointmentDraft.id)}
                onChange={() => setAppointmentDraft((current) => ({
                  ...current,
                  clientStage: "new",
                  clientId: "",
                }))}
              />
              New / first-timer
            </label>
          </fieldset>

          {appointmentDraft.clientStage === "existing" ? (
            <ExistingClientPicker
              key={appointmentDraft.providerProfileId}
              clients={eligibleExistingClients}
              selectedClientId={appointmentDraft.clientId}
              onSelect={(clientId) => setAppointmentDraft((current) => ({ ...current, clientId }))}
            />
          ) : (
            <>
              <label className="form-label">
                First-timer name
                <input
                  value={appointmentDraft.provisionalClientName}
                  onChange={(event) => setAppointmentDraft((current) => ({ ...current, provisionalClientName: event.target.value }))}
                  placeholder="Name used for scheduling"
                />
              </label>
              <label className="form-label">
                Contact number (optional)
                <input
                  value={appointmentDraft.provisionalContactNumber}
                  onChange={(event) => setAppointmentDraft((current) => ({ ...current, provisionalContactNumber: event.target.value }))}
                  placeholder="Phone number"
                />
              </label>
              <p className="calendar-form-note calendar-form-span-2">
                This creates only a provisional appointment. The client record is created after arrival, when staff begins the intake interview.
              </p>
            </>
          )}

          <label className="form-label">
            Psychologist / counselor
            <select
              value={appointmentDraft.providerProfileId}
              onChange={(event) => setAppointmentDraft((current) => ({
                ...current,
                providerProfileId: event.target.value,
                clientId: current.clientStage === "existing" ? "" : current.clientId,
              }))}
            >
              <option value="">Select clinician</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>{clinicianDisplayName(provider)}</option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Service
            <select
              value={appointmentDraft.serviceId}
              onChange={(event) => setAppointmentDraft((current) => ({ ...current, serviceId: event.target.value }))}
            >
              <option value="">Select service</option>
              {services.filter((service) => service.is_active).map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.default_duration_minutes} min
                </option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Date
            <input
              type="date"
              value={appointmentDraft.appointmentDate}
              onChange={(event) => setAppointmentDraft((current) => ({ ...current, appointmentDate: event.target.value }))}
            />
          </label>
          <label className="form-label">
            Start time
            <input
              type="time"
              step="300"
              value={appointmentDraft.startTime}
              onChange={(event) => setAppointmentDraft((current) => ({ ...current, startTime: event.target.value }))}
            />
          </label>
          <label className="form-label">
            Booking source
            <select
              value={appointmentDraft.bookingSource}
              onChange={(event) => setAppointmentDraft((current) => ({ ...current, bookingSource: event.target.value as "phone" | "walk_in" }))}
            >
              <option value="phone">Phone call</option>
              <option value="walk_in">Walk-in</option>
            </select>
          </label>
          <label className="form-label">
            Session mode
            <select
              value={appointmentDraft.appointmentMode}
              onChange={(event) => setAppointmentDraft((current) => ({ ...current, appointmentMode: event.target.value as "in_person" | "telecounseling" }))}
            >
              <option value="in_person">In person</option>
              <option value="telecounseling">Telecounseling</option>
            </select>
          </label>
          <label className="form-label calendar-form-span-2">
            Scheduling note (optional)
            <textarea
              className="textarea-input"
              rows={3}
              value={appointmentDraft.schedulingNote}
              onChange={(event) => setAppointmentDraft((current) => ({ ...current, schedulingNote: event.target.value }))}
              placeholder="Operational scheduling information only — do not enter clinical notes or diagnoses."
            />
          </label>
        </div>

        <StatusMessage className="calendar-modal-status" message={calendarMessage} />
        <div className="calendar-modal-actions">
          <button type="button" className="small-button secondary-button" onClick={closeBookingPanel} disabled={isSavingCalendar}>Cancel</button>
          <button type="button" className="primary-button" onClick={() => void saveAppointment()} disabled={isSavingCalendar}>
            {isSavingCalendar ? "Saving…" : appointmentDraft.id ? "Save changes" : "Book appointment"}
          </button>
        </div>
      </section>
    </div>
  );
}

function AppointmentActionDialog({
  request,
  isBusy,
  message,
  onCancel,
  onComplete,
  onConfirm,
}: {
  request: AppointmentActionRequest;
  isBusy: boolean;
  message: string;
  onCancel: () => void;
  onComplete: () => void;
  onConfirm: (reason: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const isRemoval = request.kind === "remove";
  const title = isRemoval ? "Remove appointment?" : "Cancel appointment?";

  const submit = async () => {
    if (reason.trim().length < 2) {
      setValidationMessage(
        isRemoval
          ? "Enter a reason for removing the appointment."
          : "Enter a reason for cancelling the appointment."
      );
      return;
    }
    setValidationMessage("");
    const succeeded = await onConfirm(reason);
    if (succeeded) onComplete();
  };

  return (
    <div className="app-modal-overlay" role="presentation" onMouseDown={() => !isBusy && onCancel()}>
      <section
        className="app-modal calendar-appointment-action-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-appointment-action-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="calendar-appointment-action-heading">
          <span className={`calendar-action-icon ${isRemoval ? "remove" : "cancel"}`} aria-hidden="true">
            {isRemoval ? "−" : "!"}
          </span>
          <div>
            <span className="workspace-header-eyebrow">Appointment action</span>
            <h3 id="calendar-appointment-action-title">{title}</h3>
          </div>
        </div>

        <div className="calendar-action-appointment-summary">
          <strong>{appointmentDisplayName(request.appointment)}</strong>
          <span>{formatPhilippineDateTime(request.appointment.starts_at)}</span>
          <span>{request.appointment.profiles?.full_name ?? "Assigned clinician"}</span>
        </div>

        <p className="calendar-action-explanation">
          {isRemoval
            ? "This hides the appointment from the active calendar. Its recoverable record and audit history are kept."
            : "The appointment remains on the calendar with a Cancelled status and its history is kept."}
        </p>

        <label className="form-label">
          <span>Reason <span aria-hidden="true">*</span></span>
          <textarea
            className="textarea-input"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={isRemoval ? "Why should this appointment be removed?" : "Why is this appointment being cancelled?"}
            disabled={isBusy}
            autoFocus
          />
        </label>

        <StatusMessage className="calendar-modal-status" message={validationMessage || message} />

        <div className="calendar-modal-actions">
          <button type="button" className="small-button secondary-button" onClick={onCancel} disabled={isBusy}>
            Keep appointment
          </button>
          <button type="button" className="small-button danger-button" onClick={() => void submit()} disabled={isBusy}>
            {isBusy ? (isRemoval ? "Removing…" : "Cancelling…") : (isRemoval ? "Remove appointment" : "Cancel appointment")}
          </button>
        </div>
      </section>
    </div>
  );
}

function AvailabilityWeekNavigation({
  dates,
  onMove,
  onToday,
}: {
  dates: string[];
  onMove: (direction: -1 | 1) => void;
  onToday: () => void;
}) {
  return (
    <div className="calendar-toolbar availability-toolbar">
      <div className="calendar-date-navigation">
        <button type="button" className="small-button secondary-button" onClick={() => onMove(-1)} aria-label="Previous availability week">‹</button>
        <button type="button" className="small-button secondary-button" onClick={onToday}>Today</button>
        <button type="button" className="small-button secondary-button" onClick={() => onMove(1)} aria-label="Next availability week">›</button>
        <strong>{formatCalendarRange(dates)}</strong>
      </div>
      <div className="availability-legend" aria-label="Availability legend">
        <span className="available">Available</span>
        <span className="unavailable">Unavailable</span>
        <span className="weekly">Regular weekly hours</span>
      </div>
    </div>
  );
}

function AvailabilityWorkspace(props: CalendarSectionProps) {
  const weekDates = useMemo(
    () => getCalendarDates(props.anchorDate, "week"),
    [props.anchorDate]
  );
  const [selectedDate, setSelectedDate] = useState(weekDates[0]);
  const [startsAt, setStartsAt] = useState("09:00");
  const [endsAt, setEndsAt] = useState("17:00");
  const [availabilityKind, setAvailabilityKind] = useState<"available" | "unavailable">("available");
  const [note, setNote] = useState("");
  const [weekday, setWeekday] = useState(1);
  const [weeklyStartsAt, setWeeklyStartsAt] = useState("09:00");
  const [weeklyEndsAt, setWeeklyEndsAt] = useState("17:00");
  const ownProviders = props.providers.filter((provider) => provider.id === props.profile?.id);
  const ownAvailability = props.availability.filter((entry) => entry.profile_id === props.profile?.id);
  const ownOverrides = props.availabilityOverrides.filter((entry) => entry.profile_id === props.profile?.id);
  const hasConflict = ownOverrides.some(
    (entry) =>
      entry.availability_date === selectedDate &&
      startsAt < entry.ends_at.slice(0, 5) &&
      endsAt > entry.starts_at.slice(0, 5)
  );

  useEffect(() => {
    if (!weekDates.includes(selectedDate)) setSelectedDate(weekDates[0]);
  }, [selectedDate, weekDates]);

  const moveWeek = (direction: -1 | 1) =>
    props.setAnchorDate((current) => addCalendarDays(current, direction * 7));

  return (
    <div className="calendar-availability-layout">
      <section className="panel calendar-availability-panel">
        <div className="calendar-panel-heading availability-heading">
          <div>
            <h3>My availability</h3>
            <p>Choose a dated time block in the week below. Staff will see the same view when booking.</p>
          </div>
        </div>
        <AvailabilityWeekNavigation
          dates={weekDates}
          onMove={moveWeek}
          onToday={() => props.setAnchorDate(todayPhilippineDateKey())}
        />
        {ownProviders.length ? (
          <AvailabilityWeekGrid
            dates={weekDates}
            providers={ownProviders}
            clinicHours={props.clinicHours}
            availability={ownAvailability}
            overrides={ownOverrides}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onRemoveOverride={(id) => void props.removeAvailabilityOverride(id)}
            isBusy={props.isSavingCalendar}
          />
        ) : (
          <p className="calendar-empty-copy">Your clinician assignment is still loading. If this remains empty, ask an Admin to verify your HPC Representative name.</p>
        )}

        <div className="calendar-inline-form availability-dated-form">
          <label className="form-label">Date<input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
          <label className="form-label">Type<select value={availabilityKind} onChange={(event) => setAvailabilityKind(event.target.value as "available" | "unavailable")}><option value="available">Available</option><option value="unavailable">Unavailable</option></select></label>
          <label className="form-label">From<input type="time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
          <label className="form-label">To<input type="time" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
          <label className="form-label availability-note-field">Note<input value={note} maxLength={240} onChange={(event) => setNote(event.target.value)} placeholder="Optional operational note" /></label>
          <button
            type="button"
            className="primary-button"
            disabled={props.isSavingCalendar || endsAt <= startsAt || hasConflict}
            onClick={() => void props.addAvailabilityOverride(selectedDate, startsAt, endsAt, availabilityKind, note)}
          >
            Add dated block
          </button>
          {hasConflict ? <p className="availability-conflict-message">This time overlaps an existing available or unavailable block. Adjust or remove the existing block first.</p> : null}
        </div>
      </section>

      <section className="panel calendar-settings-panel calendar-weekly-template-panel">
        <div className="calendar-panel-heading">
          <div><h3>Regular weekly hours</h3><p>Use this as the repeating baseline. Dated blocks above can add availability or mark time off.</p></div>
        </div>
        <div className="calendar-inline-form">
          <label className="form-label">Day<select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))}>{WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <label className="form-label">From<input type="time" value={weeklyStartsAt} onChange={(event) => setWeeklyStartsAt(event.target.value)} /></label>
          <label className="form-label">To<input type="time" value={weeklyEndsAt} onChange={(event) => setWeeklyEndsAt(event.target.value)} /></label>
          <button type="button" className="primary-button" disabled={props.isSavingCalendar || weeklyEndsAt <= weeklyStartsAt} onClick={() => void props.addAvailability(weekday, weeklyStartsAt, weeklyEndsAt)}>Add regular hours</button>
        </div>
        <div className="calendar-setting-list">
          {ownAvailability.length === 0 ? <p className="calendar-empty-copy">No regular weekly hours yet. Add dated availability above or create a repeating baseline.</p> : ownAvailability.map((entry) => (
            <div key={entry.id} className="calendar-setting-row">
              <div><strong>{WEEKDAYS[entry.weekday]}</strong><span>{entry.starts_at.slice(0, 5)}–{entry.ends_at.slice(0, 5)}</span></div>
              <button type="button" className="small-button danger-button" disabled={props.isSavingCalendar} onClick={() => void props.removeAvailability(entry.id)}>Remove</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AvailabilityDetailsDialog({
  block,
  onClose,
}: {
  block: AvailabilityBlockSelection;
  onClose: () => void;
}) {
  const timeLabel = `${formatPhilippineTime(`2000-01-01T${block.startsAt.slice(0, 5)}:00+08:00`)}–${formatPhilippineTime(`2000-01-01T${block.endsAt.slice(0, 5)}:00+08:00`)}`;
  return (
    <div className="app-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="app-modal availability-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="availability-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="calendar-modal-header">
          <div>
            <span className="workspace-header-eyebrow">Team availability</span>
            <h3 id="availability-details-title">{formatCalendarDate(block.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h3>
            <p>{timeLabel} · {block.kind === "unavailable" ? "Unavailable" : "Available"}</p>
          </div>
          <button type="button" className="small-button secondary-button" onClick={onClose}>Close</button>
        </div>
        <div className="availability-details-list">
          {block.entries.map((entry) => (
            <article key={`${entry.providerId}-${entry.id}`}>
              <div>
                <strong>{entry.providerName}</strong>
                <span>{entry.source === "weekly" ? "Regular weekly hours" : "Dated availability change"}</span>
              </div>
              <span className={`availability-detail-kind ${block.kind}`}>
                {block.kind === "unavailable" ? "Unavailable" : "Available"}
              </span>
              {entry.note ? <p>{entry.note}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function TeamAvailabilityWorkspace(props: CalendarSectionProps) {
  const [providerFilter, setProviderFilter] = useState("all");
  const [selectedBlock, setSelectedBlock] = useState<AvailabilityBlockSelection | null>(null);
  const weekDates = useMemo(
    () => getCalendarDates(props.anchorDate, "week"),
    [props.anchorDate]
  );
  const visibleProviders = providerFilter === "all"
    ? props.providers
    : props.providers.filter((provider) => provider.id === providerFilter);
  const moveWeek = (direction: -1 | 1) =>
    props.setAnchorDate((current) => addCalendarDays(current, direction * 7));

  return (
    <>
    <section className="panel calendar-availability-panel">
      <div className="calendar-panel-heading availability-heading">
        <div><h3>Team availability</h3><p>Read-only weekly view of clinicians’ regular hours and dated changes.</p></div>
        <label className="form-label availability-provider-filter">
          Clinician
          <select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}>
            <option value="all">All clinicians</option>
            {props.providers.map((provider) => <option key={provider.id} value={provider.id}>{clinicianDisplayName(provider)}</option>)}
          </select>
        </label>
      </div>
      <AvailabilityWeekNavigation
        dates={weekDates}
        onMove={moveWeek}
        onToday={() => props.setAnchorDate(todayPhilippineDateKey())}
      />
      {visibleProviders.length ? (
        <AvailabilityWeekGrid
          dates={weekDates}
          providers={visibleProviders}
          clinicHours={props.clinicHours}
          availability={props.availability}
          overrides={props.availabilityOverrides}
          showProviderNames
          groupProviderBlocks={providerFilter === "all"}
          onSelectBlock={setSelectedBlock}
        />
      ) : <p className="calendar-empty-copy">No active HPC Representative is available to display.</p>}
    </section>
    {selectedBlock ? (
      <AvailabilityDetailsDialog block={selectedBlock} onClose={() => setSelectedBlock(null)} />
    ) : null}
    </>
  );
}

function ServiceEditor({ service, isBusy, onSave }: { service: AppointmentService; isBusy: boolean; onSave: CalendarSectionProps["saveService"] }) {
  const [draft, setDraft] = useState(service);
  useEffect(() => setDraft(service), [service]);
  return (
    <div className="calendar-service-row">
      <input aria-label="Service name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
      <input aria-label="Duration in minutes" type="number" min={15} max={480} step={5} value={draft.default_duration_minutes} onChange={(event) => setDraft((current) => ({ ...current, default_duration_minutes: Number(event.target.value) }))} />
      <label className="calendar-active-toggle"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft((current) => ({ ...current, is_active: event.target.checked }))} /> Active</label>
      <button type="button" className="small-button secondary-button" disabled={isBusy || !draft.name.trim()} onClick={() => void onSave(draft)}>Save</button>
    </div>
  );
}

function ConfigurationWorkspace(props: CalendarSectionProps) {
  const [hoursDraft, setHoursDraft] = useState<ClinicHours[]>(props.clinicHours);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState(60);
  useEffect(() => setHoursDraft(props.clinicHours), [props.clinicHours]);

  return (
    <div className="calendar-settings-grid">
      <section className="panel calendar-settings-panel">
        <div className="calendar-panel-heading"><div><h3>Clinic hours</h3><p>Appointments must fit entirely within these Philippine-time operating hours.</p></div><button type="button" className="primary-button" disabled={props.isSavingCalendar} onClick={() => void props.saveClinicHours(hoursDraft)}>Save clinic hours</button></div>
        <div className="calendar-hours-list">
          {hoursDraft.map((day) => (
            <div key={day.weekday} className="calendar-hours-row">
              <label className="calendar-active-toggle"><input type="checkbox" checked={day.is_open} onChange={(event) => setHoursDraft((current) => current.map((item) => item.weekday === day.weekday ? { ...item, is_open: event.target.checked, opens_at: event.target.checked ? item.opens_at ?? "08:00" : null, closes_at: event.target.checked ? item.closes_at ?? "18:00" : null } : item))} /> {WEEKDAYS[day.weekday]}</label>
              <input type="time" aria-label={`${WEEKDAYS[day.weekday]} opening time`} disabled={!day.is_open} value={day.opens_at?.slice(0, 5) ?? ""} onChange={(event) => setHoursDraft((current) => current.map((item) => item.weekday === day.weekday ? { ...item, opens_at: event.target.value } : item))} />
              <span>to</span>
              <input type="time" aria-label={`${WEEKDAYS[day.weekday]} closing time`} disabled={!day.is_open} value={day.closes_at?.slice(0, 5) ?? ""} onChange={(event) => setHoursDraft((current) => current.map((item) => item.weekday === day.weekday ? { ...item, closes_at: event.target.value } : item))} />
            </div>
          ))}
        </div>
      </section>

      <section className="panel calendar-settings-panel">
        <div className="calendar-panel-heading"><div><h3>Services and appointment lengths</h3><p>Staff choose a service; its duration determines the protected calendar slot.</p></div></div>
        <div className="calendar-service-list">
          {props.services.map((service) => <ServiceEditor key={service.id} service={service} isBusy={props.isSavingCalendar} onSave={props.saveService} />)}
        </div>
        <div className="calendar-service-row calendar-service-new">
          <input aria-label="New service name" value={newServiceName} onChange={(event) => setNewServiceName(event.target.value)} placeholder="New service" />
          <input aria-label="New service duration" type="number" min={15} max={480} step={5} value={newServiceDuration} onChange={(event) => setNewServiceDuration(Number(event.target.value))} />
          <span>minutes</span>
          <button type="button" className="primary-button" disabled={props.isSavingCalendar || newServiceName.trim().length < 2} onClick={async () => { await props.saveService({ id: "", name: newServiceName, default_duration_minutes: newServiceDuration, is_active: true }); setNewServiceName(""); }}>Add service</button>
        </div>
      </section>
    </div>
  );
}

export function CalendarSection(props: CalendarSectionProps) {
  const [workspaceTab, setWorkspaceTab] = useState<CalendarWorkspaceTab>("schedule");
  const [scheduleMode, setScheduleMode] = useState<ScheduleWorkspaceMode>("calendar");
  const [timelineAppointment, setTimelineAppointment] = useState<Appointment | null>(null);
  const [appointmentAction, setAppointmentAction] = useState<AppointmentActionRequest | null>(null);
  const statusEventsByAppointment = useMemo(() => {
    const eventsByAppointment = new Map<string, AppointmentStatusEvent[]>();
    props.statusEvents.forEach((event) => {
      const appointmentEvents = eventsByAppointment.get(event.appointment_id) ?? [];
      appointmentEvents.push(event);
      eventsByAppointment.set(event.appointment_id, appointmentEvents);
    });
    return eventsByAppointment;
  }, [props.statusEvents]);
  const groupedAppointments = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    props.visibleDates.forEach((date) => groups.set(date, []));
    props.filteredAppointments.forEach((appointment) => {
      const date = getPhilippineDateKey(appointment.starts_at);
      groups.get(date)?.push(appointment);
    });
    return groups;
  }, [props.filteredAppointments, props.visibleDates]);

  const boardAppointments = useMemo(
    () => props.appointments.filter(
      (appointment) =>
        getPhilippineDateKey(appointment.starts_at) === props.anchorDate &&
        (props.selectedProviderId === "all" ||
          appointment.provider_profile_id === props.selectedProviderId)
    ),
    [props.anchorDate, props.appointments, props.selectedProviderId]
  );
  const boardAppointmentsByStatus = useMemo(() => {
    const groups = new Map<AppointmentStatus, Appointment[]>();
    [...BOARD_STATUSES, "cancelled" as const, "no_show" as const].forEach(
      (status) => groups.set(status, [])
    );
    boardAppointments.forEach((appointment) => groups.get(appointment.status)?.push(appointment));
    return groups;
  }, [boardAppointments]);

  const shiftDays = scheduleMode === "status_board" || props.calendarView === "day" ? 1 : 7;
  const moveCalendar = (direction: -1 | 1) => props.setAnchorDate((current) => addCalendarDays(current, direction * shiftDays));

  useEffect(() => {
    if (workspaceTab === "my_availability" && !props.mayManageOwnAvailability) {
      setWorkspaceTab("schedule");
    } else if (workspaceTab === "team_availability" && !props.mayViewTeamAvailability) {
      setWorkspaceTab("schedule");
    } else if (workspaceTab === "configuration" && !props.mayManageConfiguration) {
      setWorkspaceTab("schedule");
    }
  }, [
    props.mayManageConfiguration,
    props.mayManageOwnAvailability,
    props.mayViewTeamAvailability,
    workspaceTab,
  ]);

  const renderAppointment = (appointment: Appointment) => {
    const transitions = props.getAvailableStatusTransitions(appointment);
    const canEdit = props.mayManageAppointments &&
      ["scheduled", "confirmed"].includes(appointment.status) &&
      appointment.intake_linked_at === null;
    const canBeginIntake = props.mayManageAppointments &&
      appointment.client_stage_at_booking === "new" &&
      appointment.client_id === null &&
      appointment.status === "arrived";
    const canRemove = props.mayManageAppointments &&
      appointment.intake_linked_at === null &&
      !["intake_in_progress", "in_session", "completed"].includes(appointment.status);
    return (
      <AppointmentCard
        key={appointment.id}
        appointment={appointment}
        canEdit={canEdit}
        canBeginIntake={canBeginIntake}
        canRemove={canRemove}
        isBusy={props.isSavingCalendar}
        statusEvents={statusEventsByAppointment.get(appointment.id) ?? []}
        transitions={transitions}
        onEdit={() => props.openExistingAppointment(appointment)}
        onStatusChange={(status, reason) => void props.updateAppointmentStatus(appointment, status, reason)}
        onBeginIntake={() => void props.beginAppointmentIntake(appointment)}
        onRequestCancel={() => {
          props.clearCalendarMessage();
          setAppointmentAction({ kind: "cancel", appointment });
        }}
        onRequestRemove={() => {
          props.clearCalendarMessage();
          setAppointmentAction({ kind: "remove", appointment });
        }}
        onOpenTimeline={() => setTimelineAppointment(appointment)}
      />
    );
  };

  const displayedAppointments = scheduleMode === "status_board"
    ? boardAppointments
    : props.filteredAppointments;
  const displayedDateRange = scheduleMode === "status_board"
    ? formatCalendarDate(props.anchorDate, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : formatCalendarRange(props.visibleDates);
  const closedAppointments = [
    ...(boardAppointmentsByStatus.get("cancelled") ?? []),
    ...(boardAppointmentsByStatus.get("no_show") ?? []),
  ];

  return (
    <div className="page-content calendar-page">
      <WorkspaceHeader
        eyebrow="Clinic operations"
        title="Appointment Calendar"
        description="Schedule clinic visits from staff calls and walk-ins, using each clinician’s availability. Times are shown in Philippine time."
        actions={(
          <div className="calendar-header-actions">
            <PhilippineClock />
            {props.mayManageAppointments ? <button type="button" className="primary-button" onClick={() => props.openNewAppointment()}>Book appointment</button> : null}
          </div>
        )}
        meta={<><strong>{displayedAppointments.length} appointment{displayedAppointments.length === 1 ? "" : "s"}</strong><span>{displayedDateRange}</span></>}
      />

      {props.calendarMessage && !props.isBookingPanelOpen && !appointmentAction && !timelineAppointment ? (
        <div className="calendar-feedback-toast">
          <StatusMessage className="calendar-status-message" message={props.calendarMessage} />
          <button type="button" onClick={props.clearCalendarMessage} aria-label="Dismiss calendar message">×</button>
        </div>
      ) : null}

      <div className="calendar-workspace-tabs" role="tablist" aria-label="Calendar workspace">
        <button type="button" className={workspaceTab === "schedule" ? "active" : ""} onClick={() => setWorkspaceTab("schedule")}>Schedule</button>
        {props.mayManageOwnAvailability ? <button type="button" className={workspaceTab === "my_availability" ? "active" : ""} onClick={() => setWorkspaceTab("my_availability")}>My availability</button> : null}
        {props.mayViewTeamAvailability ? <button type="button" className={workspaceTab === "team_availability" ? "active" : ""} onClick={() => setWorkspaceTab("team_availability")}>Team availability</button> : null}
        {props.mayManageConfiguration ? <button type="button" className={workspaceTab === "configuration" ? "active" : ""} onClick={() => setWorkspaceTab("configuration")}>Clinic setup</button> : null}
      </div>

      {workspaceTab === "my_availability" && props.mayManageOwnAvailability ? <AvailabilityWorkspace {...props} /> : null}
      {workspaceTab === "team_availability" && props.mayViewTeamAvailability ? <TeamAvailabilityWorkspace {...props} /> : null}
      {workspaceTab === "configuration" && props.mayManageConfiguration ? <ConfigurationWorkspace {...props} /> : null}
      {workspaceTab === "schedule" ? (
        <section className="panel calendar-schedule-panel">
          <div className="calendar-schedule-mode-tabs" role="tablist" aria-label="Schedule display">
            <button type="button" className={scheduleMode === "calendar" ? "active" : ""} onClick={() => setScheduleMode("calendar")}>Calendar</button>
            <button type="button" className={scheduleMode === "status_board" ? "active" : ""} onClick={() => setScheduleMode("status_board")}>Status board</button>
          </div>
          <div className="calendar-toolbar">
            <div className="calendar-date-navigation">
              <button type="button" className="small-button secondary-button" onClick={() => moveCalendar(-1)} aria-label="Previous date range">‹</button>
              <button type="button" className="small-button secondary-button" onClick={() => props.setAnchorDate(todayPhilippineDateKey())}>Today</button>
              <button type="button" className="small-button secondary-button" onClick={() => moveCalendar(1)} aria-label="Next date range">›</button>
              <strong>{scheduleMode === "status_board" ? displayedDateRange : formatCalendarRange(props.visibleDates)}</strong>
            </div>
            <div className="calendar-toolbar-controls">
              {props.providers.length > 1 && props.mayManageAppointments ? (
                <select className="compact-select" aria-label="Filter by clinician" value={props.selectedProviderId} onChange={(event) => props.setSelectedProviderId(event.target.value)}>
                  <option value="all">All clinicians</option>
                  {props.providers.map((provider) => <option key={provider.id} value={provider.id}>{clinicianDisplayName(provider)}</option>)}
                </select>
              ) : null}
              {scheduleMode === "calendar" ? (
                <div className="calendar-view-switch" aria-label="Calendar view">
                  {(["week", "day", "agenda"] as CalendarView[]).map((view) => <button key={view} type="button" className={props.calendarView === view ? "active" : ""} onClick={() => props.setCalendarView(view)}>{view.charAt(0).toUpperCase() + view.slice(1)}</button>)}
                </div>
              ) : null}
            </div>
          </div>

          {props.isLoadingCalendar ? <p className="calendar-empty-copy">Loading schedule…</p> : scheduleMode === "status_board" ? (
            <div className="calendar-status-board-wrap">
              <div className="calendar-status-board" aria-label="Daily appointment status board">
                {BOARD_STATUSES.map((status) => {
                  const statusAppointments = boardAppointmentsByStatus.get(status) ?? [];
                  return (
                    <section key={status} className={`calendar-board-column status-${status}`}>
                      <div className="calendar-board-column-heading">
                        <span>{appointmentStatusLabel(status)}</span>
                        <strong>{statusAppointments.length}</strong>
                      </div>
                      <div className="calendar-board-column-cards">
                        {statusAppointments.length
                          ? statusAppointments.map(renderAppointment)
                          : <p>No appointments</p>}
                      </div>
                    </section>
                  );
                })}
              </div>
              <details className="calendar-closed-appointments">
                <summary>Cancelled and no-show appointments <span>{closedAppointments.length}</span></summary>
                <div>
                  {closedAppointments.length
                    ? closedAppointments.map(renderAppointment)
                    : <p className="calendar-empty-copy">No cancelled or no-show appointments for this day.</p>}
                </div>
              </details>
            </div>
          ) : props.calendarView === "agenda" ? (
            <div className="calendar-agenda-list">
              {props.visibleDates.map((date) => {
                const dayAppointments = groupedAppointments.get(date) ?? [];
                return <section key={date} className="calendar-agenda-day"><h3>{formatCalendarDate(date, { weekday: "long", month: "long", day: "numeric" })}</h3>{dayAppointments.length ? dayAppointments.map(renderAppointment) : <p>No appointments.</p>}</section>;
              })}
            </div>
          ) : (
            <div className={`calendar-grid calendar-grid-${props.calendarView}`}>
              {props.visibleDates.map((date) => {
                const dayAppointments = groupedAppointments.get(date) ?? [];
                return (
                  <section key={date} className={`calendar-day-column${date === todayPhilippineDateKey() ? " today" : ""}`}>
                    <div className="calendar-day-heading"><span>{formatCalendarDate(date, { weekday: "short" })}</span><strong>{formatCalendarDate(date, { month: "short", day: "numeric" })}</strong>{props.mayManageAppointments ? <button type="button" aria-label={`Book on ${formatCalendarDate(date)}`} onClick={() => props.openNewAppointment(date)}>+</button> : null}</div>
                    <div className="calendar-day-appointments">{dayAppointments.length ? dayAppointments.map(renderAppointment) : <p className="calendar-empty-day">Available</p>}</div>
                  </section>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {props.isBookingPanelOpen ? <BookingPanel {...props} /> : null}
      {appointmentAction ? (
        <AppointmentActionDialog
          key={`${appointmentAction.kind}-${appointmentAction.appointment.id}`}
          request={appointmentAction}
          isBusy={props.isSavingCalendar}
          message={props.calendarMessage}
          onCancel={() => {
            props.clearCalendarMessage();
            setAppointmentAction(null);
          }}
          onComplete={() => setAppointmentAction(null)}
          onConfirm={(reason) => appointmentAction.kind === "remove"
            ? props.removeAppointment(appointmentAction.appointment, reason)
            : props.updateAppointmentStatus(appointmentAction.appointment, "cancelled", reason)}
        />
      ) : null}
      {timelineAppointment ? (
        <AppointmentTimelineDialog
          appointment={timelineAppointment}
          events={statusEventsByAppointment.get(timelineAppointment.id) ?? []}
          onClose={() => setTimelineAppointment(null)}
        />
      ) : null}
    </div>
  );
}
