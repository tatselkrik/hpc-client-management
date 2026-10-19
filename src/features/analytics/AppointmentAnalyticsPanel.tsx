import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { fetchSupabasePages } from "../../lib/supabasePagination";
import type { AppointmentClientStage, AppointmentMode, AppointmentStatus } from "../../appShared";
import { buildAppointmentExportSnapshot, type AppointmentExportSnapshot } from "./analyticsExportHelpers";

type AppointmentAnalyticsRow = {
  status: AppointmentStatus;
  client_stage_at_booking: AppointmentClientStage;
  appointment_mode: AppointmentMode;
};

export function AppointmentAnalyticsPanel({ onSnapshot }: {
  onSnapshot?: (snapshot: AppointmentExportSnapshot | null) => void;
}) {
  const [rows, setRows] = useState<AppointmentAnalyticsRow[]>([]);
  const [message, setMessage] = useState("Loading appointment operations…");

  useEffect(() => {
    let isMounted = true;
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    onSnapshot?.(null);

    void fetchSupabasePages(() => supabase
      .from("appointments")
      .select("status, client_stage_at_booking, appointment_mode")
      .is("removed_at", null)
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString())
      .order("starts_at", { ascending: true })
      .order("id", { ascending: true }))
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setMessage(`Appointment operations are unavailable. ${error.message}`);
          onSnapshot?.(null);
          return;
        }
        setRows((data ?? []) as AppointmentAnalyticsRow[]);
        onSnapshot?.(buildAppointmentExportSnapshot(
          (data ?? []) as AppointmentAnalyticsRow[], start.toISOString(), end.toISOString()
        ));
        setMessage("");
      })
      .catch(() => {
        if (!isMounted) return;
        setMessage("Appointment operations are unavailable. Please try again.");
        onSnapshot?.(null);
      });

    return () => {
      isMounted = false;
    };
  }, [onSnapshot]);

  const metrics = useMemo(() => {
    const completed = rows.filter((row) => row.status === "completed").length;
    const cancelled = rows.filter((row) => row.status === "cancelled").length;
    const noShows = rows.filter((row) => row.status === "no_show").length;
    const firstTimers = rows.filter((row) => row.client_stage_at_booking === "new").length;
    const telecounseling = rows.filter((row) => row.appointment_mode === "telecounseling").length;
    const resolved = completed + cancelled + noShows;

    return [
      { label: "Appointments", value: rows.length, detail: "scheduled to start in the past 30 days" },
      { label: "Completed", value: completed, detail: resolved ? `${((completed / resolved) * 100).toFixed(1)}% of resolved visits` : "No resolved visits yet" },
      { label: "Cancelled", value: cancelled, detail: `${noShows} no-show${noShows === 1 ? "" : "s"}` },
      { label: "First-timers", value: firstTimers, detail: "booked as new clients" },
      { label: "Telecounseling", value: telecounseling, detail: "session mode only" },
    ];
  }, [rows]);

  return (
    <section className="panel appointment-analytics-panel" aria-labelledby="appointment-analytics-title">
      <div className="appointment-analytics-heading">
        <div>
          <span className="workspace-header-eyebrow">Clinic operations</span>
          <h3 id="appointment-analytics-title">Appointment activity</h3>
          <p>Operational scheduling results for the last 30 days, limited to the appointments your role can access.</p>
        </div>
      </div>
      {message ? <p className="analytics-status-message">{message}</p> : (
        <div className="appointment-analytics-grid">
          {metrics.map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value.toLocaleString()}</strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
