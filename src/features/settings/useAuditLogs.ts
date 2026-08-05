import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import type { AuditLogEntry, AuditLogFilterRange, Section } from "../../appShared";
import {
  AUDIT_LOG_PAGE_SIZE,
  getAuditFilterStartIso,
} from "../../appShared";

type UseAuditLogsOptions = {
  activeSection: Section;
  canManageCareTeam: boolean;
  userEmail: string | null;
};

export function useAuditLogs({
  activeSection,
  canManageCareTeam,
  userEmail,
}: UseAuditLogsOptions) {
  const [auditLogEntries, setAuditLogEntries] = useState<AuditLogEntry[]>([]);
  const [auditLogFilter, setAuditLogFilter] = useState<AuditLogFilterRange>("today");
  const [auditLogStatus, setAuditLogStatus] = useState("");
  const [isAuditLogLoading, setIsAuditLogLoading] = useState(false);

  const loadAuditLogs = useCallback(
    async (range: AuditLogFilterRange = auditLogFilter) => {
      setIsAuditLogLoading(true);
      setAuditLogStatus(feedbackMessages.loading("Loading activity log"));

      try {
        let query = supabase
          .from("audit_logs")
          .select(
            "id, created_at, actor_name, actor_email, module, action, target_type, target_id, target_label, details"
          )
          .order("created_at", { ascending: false })
          .range(0, AUDIT_LOG_PAGE_SIZE - 1);

        const rangeStart = getAuditFilterStartIso(range);

        if (rangeStart) {
          query = query.gte("created_at", rangeStart);
        }

        const { data, error } = await query;

        if (error) {
          setAuditLogEntries([]);
          setAuditLogStatus(feedbackMessages.loadFailed("activity log", error.message));
          return;
        }

        setAuditLogEntries((data as AuditLogEntry[] | null) ?? []);
        setAuditLogStatus("");
      } catch (error) {
        const message = getErrorDetail(error);
        setAuditLogEntries([]);
        setAuditLogStatus(feedbackMessages.loadFailed("activity log", message));
      } finally {
        setIsAuditLogLoading(false);
      }
    },
    [auditLogFilter]
  );

  const resetAuditLogs = useCallback(() => {
    setAuditLogEntries([]);
    setAuditLogStatus("");
    setAuditLogFilter("today");
    setIsAuditLogLoading(false);
  }, []);

  useEffect(() => {
    if (!userEmail || activeSection !== "settings" || !canManageCareTeam) {
      return;
    }

    void loadAuditLogs(auditLogFilter);
  }, [activeSection, auditLogFilter, canManageCareTeam, loadAuditLogs, userEmail]);

  return {
    auditLogEntries,
    auditLogFilter,
    setAuditLogFilter,
    auditLogStatus,
    isAuditLogLoading,
    loadAuditLogs,
    resetAuditLogs,
  };
}
