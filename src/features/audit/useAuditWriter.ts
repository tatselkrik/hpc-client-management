import { useCallback } from "react";

import type {
  AuditLogFilterRange,
  Section,
  WriteAuditLog,
} from "../../appShared";
import { supabase } from "../../lib/supabase";

type UseAuditWriterOptions = {
  activeSection: Section;
  auditLogFilter: AuditLogFilterRange;
  canManageCareTeam: boolean;
  loadAuditLogs: (range?: AuditLogFilterRange) => Promise<void>;
};

export function useAuditWriter({
  activeSection,
  auditLogFilter,
  canManageCareTeam,
  loadAuditLogs,
}: UseAuditWriterOptions) {
  const writeAuditLog = useCallback<WriteAuditLog>(async (
    module,
    action,
    targetType,
    targetId,
    targetLabel,
    details = {}
  ) => {
    await supabase.rpc("log_audit_event", {
      p_module: module,
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId,
      p_target_label: targetLabel,
      p_details: details,
    });

    if (activeSection === "settings" && canManageCareTeam) {
      await loadAuditLogs(auditLogFilter);
    }
  }, [
    activeSection,
    auditLogFilter,
    canManageCareTeam,
    loadAuditLogs,
  ]);

  return writeAuditLog;
}
