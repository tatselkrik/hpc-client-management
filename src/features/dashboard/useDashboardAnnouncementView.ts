import { useMemo } from "react";

import type { DashboardAnnouncement } from "../../appShared";

type UseDashboardAnnouncementViewOptions = {
  dashboardAnnouncement: DashboardAnnouncement;
  dismissedAnnouncementKey: string;
};

export function useDashboardAnnouncementView({
  dashboardAnnouncement,
  dismissedAnnouncementKey,
}: UseDashboardAnnouncementViewOptions) {
  return useMemo(() => {
    const announcementSignature = dashboardAnnouncement.id
      ? `${dashboardAnnouncement.id}:${dashboardAnnouncement.updated_at.trim()}`
      : dashboardAnnouncement.updated_at.trim();

    const isDashboardAnnouncementExpired = (() => {
      if (!dashboardAnnouncement.expiry_date) return false;
      const expiryAt = new Date(`${dashboardAnnouncement.expiry_date}T23:59:59`);
      return Number.isFinite(expiryAt.getTime()) && expiryAt.getTime() < Date.now();
    })();

    const shouldShowDashboardAnnouncement =
      dashboardAnnouncement.message.trim() !== "" &&
      !isDashboardAnnouncementExpired &&
      (!dashboardAnnouncement.show_until_dismissed ||
        dismissedAnnouncementKey !== announcementSignature);

    const dashboardAnnouncementExpiryLabel = dashboardAnnouncement.expiry_date
      ? new Date(`${dashboardAnnouncement.expiry_date}T00:00:00`).toLocaleDateString()
      : "No expiry date";

    return {
      announcementSignature,
      isDashboardAnnouncementExpired,
      shouldShowDashboardAnnouncement,
      dashboardAnnouncementExpiryLabel,
    };
  }, [dashboardAnnouncement, dismissedAnnouncementKey]);
}
