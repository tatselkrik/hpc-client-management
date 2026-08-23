import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { AppointmentClientStage, AppointmentMode, AppointmentStatus } from "../../appShared";

type AppointmentAnalyticsRow = {
  status: AppointmentStatus;
  client_stage_at_booking: AppointmentClientStage;
  appointment_mode: AppointmentMode;
};

export function AppointmentAnalyticsPanel() {
  const [rows, setRows] = useState<AppointmentAnalyticsRow[]>([]);
  const [message, setMessage] = useState("Loading appointment operations…");

  useEffect(() => {
    let isMounted = true;
    const start = new Date();
    start.setDate(start.getDate() - 30);

    void supabase
      .from("appointments")
      .select("status, client_stage_at_booking, appointment_mode")
      .gte("starts_at", start.toISOString())
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setMessage(`Appointment operations are unavailable. ${error.message}`);
          return;
        }
        setRows((data ?? []) as AppointmentAnalyticsRow[]);
        setMessage("");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const completed = rows.filter((row) => row.status === "completed").length;
    const cancelled = rows.filter((row) => row.status === "cancelled").length;
    const noShows = rows.filter((row) => row.status === "no_show").length;
    const firstTimers = rows.filter((row) => row.client_stage_at_booking === "new").length;
    const telecounseling = rows.filter((row) => row.appointment_mode === "telecounseling").length;
    const resolved = completed + cancelled + noShows;

    return [
      { label: "Appointments", value: rows.length, detail: "booked in the last 30 days" },
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
