import { useMemo } from "react";
import { useClinicClock } from "../../lib/useClinicClock";

import type { DashboardAnnouncement } from "../../appShared";

type UseDashboardAnnouncementViewOptions = {
  dashboardAnnouncement: DashboardAnnouncement;
  dismissedAnnouncementKey: string;
};

export function useDashboardAnnouncementView({
  dashboardAnnouncement,
  dismissedAnnouncementKey,
}: UseDashboardAnnouncementViewOptions) {
  const now = useClinicClock();
  return useMemo(() => {
    const announcementSignature = dashboardAnnouncement.id
      ? `${dashboardAnnouncement.id}:${dashboardAnnouncement.updated_at.trim()}`
      : dashboardAnnouncement.updated_at.trim();

    const isDashboardAnnouncementExpired = (() => {
      if (!dashboardAnnouncement.expiry_date) return false;
      const expiryAt = new Date(`${dashboardAnnouncement.expiry_date}T23:59:59+08:00`);
      return Number.isFinite(expiryAt.getTime()) && expiryAt.getTime() < now;
    })();

    const shouldShowDashboardAnnouncement =
      dashboardAnnouncement.message.trim() !== "" &&
      !isDashboardAnnouncementExpired &&
      (!dashboardAnnouncement.show_until_dismissed ||
        dismissedAnnouncementKey !== announcementSignature);

    const dashboardAnnouncementExpiryLabel = dashboardAnnouncement.expiry_date
      ? new Date(`${dashboardAnnouncement.expiry_date}T00:00:00+08:00`).toLocaleDateString()
      : "No expiry date";

    return {
      announcementSignature,
      isDashboardAnnouncementExpired,
      shouldShowDashboardAnnouncement,
      dashboardAnnouncementExpiryLabel,
    };
  }, [dashboardAnnouncement, dismissedAnnouncementKey, now]);
}
