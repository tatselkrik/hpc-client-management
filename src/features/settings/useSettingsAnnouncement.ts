import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import type { DashboardAnnouncement, WriteAuditLog } from "../../appShared";
import {
  DASHBOARD_ANNOUNCEMENT_DISMISS_KEY,
  DASHBOARD_ANNOUNCEMENT_SELECT,
  emptyDashboardAnnouncement,
  normalizeDashboardAnnouncement,
  readStoredDismissedAnnouncementKey,
} from "../../appShared";

type UseSettingsAnnouncementOptions = {
  canManageDashboardAnnouncements: boolean;
  setLoading: (value: boolean) => void;
  writeAuditLog: WriteAuditLog;
};

export function useSettingsAnnouncement({
  canManageDashboardAnnouncements,
  setLoading,
  writeAuditLog,
}: UseSettingsAnnouncementOptions) {
  const [dashboardAnnouncement, setDashboardAnnouncement] =
    useState<DashboardAnnouncement>(emptyDashboardAnnouncement);
  const [dashboardAnnouncementStatus, setDashboardAnnouncementStatus] = useState("");
  const [dismissedAnnouncementKey, setDismissedAnnouncementKey] = useState(() =>
    readStoredDismissedAnnouncementKey()
  );

  const resetDismissedAnnouncement = useCallback(() => {
    setDismissedAnnouncementKey("");

    if (typeof window === "undefined") return;

    try {
      window.localStorage.removeItem(DASHBOARD_ANNOUNCEMENT_DISMISS_KEY);
    } catch {
      // Ignore local dismissal reset errors.
    }
  }, []);


  const writeAnnouncementAuditLog = useCallback(
    async (
      action: string,
      targetId: string | null,
      targetLabel: string | null,
      details: Record<string, unknown>
    ) => {
      await writeAuditLog(
        "Clinic Banner",
        action,
        "dashboard_announcement",
        targetId,
        targetLabel,
        details
      );
    },
    [writeAuditLog]
  );

  const loadDashboardAnnouncement = useCallback(async () => {
    const { data, error } = await supabase
      .from("dashboard_announcements")
      .select(DASHBOARD_ANNOUNCEMENT_SELECT)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setDashboardAnnouncementStatus(feedbackMessages.loadFailed("dashboard announcement", error.message));
      return;
    }

    setDashboardAnnouncement(normalizeDashboardAnnouncement(data));
  }, []);

  const handleClearDashboardAnnouncement = useCallback(async () => {
    if (!canManageDashboardAnnouncements) {
      setDashboardAnnouncementStatus(feedbackMessages.permissionDenied("Only active care team accounts can manage dashboard announcements."));
      return;
    }

    if (!dashboardAnnouncement.id) {
      setDashboardAnnouncement(emptyDashboardAnnouncement());
      resetDismissedAnnouncement();
      setDashboardAnnouncementStatus("Announcement draft cleared.");
      return;
    }

    setLoading(true);
    setDashboardAnnouncementStatus(feedbackMessages.loading("Disabling dashboard announcement"));

    try {
      const { error } = await supabase
        .from("dashboard_announcements")
        .update({ is_active: false })
        .eq("id", dashboardAnnouncement.id);

      if (error) {
        setDashboardAnnouncementStatus(feedbackMessages.error("We could not disable the dashboard announcement.", error.message));
        return;
      }

      const clearedAnnouncementId = dashboardAnnouncement.id;
      setDashboardAnnouncement(emptyDashboardAnnouncement());
      resetDismissedAnnouncement();

      await writeAnnouncementAuditLog(
        "Cleared",
        clearedAnnouncementId,
        "Clinic notice banner",
        {
          summary: "Cleared the shared clinic dashboard banner.",
        }
      );

      setDashboardAnnouncementStatus("Announcement disabled from the shared Dashboard.");
    } catch (error) {
      const message = getErrorDetail(error);
      setDashboardAnnouncementStatus(feedbackMessages.error("We could not disable the dashboard announcement.", message));
    } finally {
      setLoading(false);
    }
  }, [
    canManageDashboardAnnouncements,
    dashboardAnnouncement.id,
    resetDismissedAnnouncement,
    setLoading,
    writeAnnouncementAuditLog,
  ]);

  const handleSaveDashboardAnnouncement = useCallback(async () => {
    if (!canManageDashboardAnnouncements) {
      setDashboardAnnouncementStatus(feedbackMessages.permissionDenied("Only active care team accounts can manage dashboard announcements."));
      return;
    }

    const trimmedMessage = dashboardAnnouncement.message.trim();

    if (!trimmedMessage) {
      await handleClearDashboardAnnouncement();
      return;
    }

    setLoading(true);
    setDashboardAnnouncementStatus(feedbackMessages.loading("Publishing dashboard announcement"));

    const basePayload = {
      message: trimmedMessage,
      priority: dashboardAnnouncement.priority,
      expiry_date: dashboardAnnouncement.expiry_date || null,
      show_until_dismissed: dashboardAnnouncement.show_until_dismissed,
      is_active: true,
    };

    try {
      let savedAnnouncement: DashboardAnnouncement;

      if (dashboardAnnouncement.id) {
        const result = await supabase
          .from("dashboard_announcements")
          .update(basePayload)
          .eq("id", dashboardAnnouncement.id)
          .select(DASHBOARD_ANNOUNCEMENT_SELECT)
          .single();

        if (result.error) {
          setDashboardAnnouncementStatus(feedbackMessages.error("We could not publish the dashboard announcement.", result.error.message));
          return;
        }

        savedAnnouncement = normalizeDashboardAnnouncement(result.data);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const result = await supabase
          .from("dashboard_announcements")
          .insert({
            ...basePayload,
            created_by: user?.id ?? null,
          })
          .select(DASHBOARD_ANNOUNCEMENT_SELECT)
          .single();

        if (result.error) {
          setDashboardAnnouncementStatus(feedbackMessages.error("We could not publish the dashboard announcement.", result.error.message));
          return;
        }

        savedAnnouncement = normalizeDashboardAnnouncement(result.data);
      }

      setDashboardAnnouncement(savedAnnouncement);
      resetDismissedAnnouncement();

      await writeAnnouncementAuditLog(
        "Published",
        savedAnnouncement.id || null,
        `${savedAnnouncement.priority} notice`,
        {
          summary: "Saved the clinic dashboard banner.",
          priority: savedAnnouncement.priority,
        }
      );

      setDashboardAnnouncementStatus("Announcement published to the shared Dashboard.");
    } catch (error) {
      const message = getErrorDetail(error);
      setDashboardAnnouncementStatus(feedbackMessages.error("We could not publish the dashboard announcement.", message));
    } finally {
      setLoading(false);
    }
  }, [
    canManageDashboardAnnouncements,
    dashboardAnnouncement,
    handleClearDashboardAnnouncement,
    resetDismissedAnnouncement,
    setLoading,
    writeAnnouncementAuditLog,
  ]);

  const handleDismissDashboardAnnouncement = useCallback(
    (announcementSignature: string) => {
      if (!announcementSignature) return;

      setDismissedAnnouncementKey(announcementSignature);

      if (typeof window === "undefined") return;

      try {
        window.localStorage.setItem(
          DASHBOARD_ANNOUNCEMENT_DISMISS_KEY,
          announcementSignature
        );
      } catch {
        // Ignore local dismissal errors.
      }
    },
    []
  );

  return {
    dashboardAnnouncement,
    setDashboardAnnouncement,
    dashboardAnnouncementStatus,
    setDashboardAnnouncementStatus,
    dismissedAnnouncementKey,
    loadDashboardAnnouncement,
    handleSaveDashboardAnnouncement,
    handleClearDashboardAnnouncement,
    handleDismissDashboardAnnouncement,
  };
}
