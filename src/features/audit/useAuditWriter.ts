import { useCallback } from "react";

import type {
  AuditLogFilterRange,
  Profile,
  Section,
  WriteAuditLog,
} from "../../appShared";
import { supabase } from "../../lib/supabase";

type UseAuditWriterOptions = {
  activeSection: Section;
  auditLogFilter: AuditLogFilterRange;
  canManageCareTeam: boolean;
  loadAuditLogs: (range?: AuditLogFilterRange) => Promise<void>;
  profile: Profile | null;
  userEmail: string | null;
};

export function useAuditWriter({
  activeSection,
  auditLogFilter,
  canManageCareTeam,
  loadAuditLogs,
  profile,
  userEmail,
}: UseAuditWriterOptions) {
  const writeAuditLog = useCallback<WriteAuditLog>(async (
    module,
    action,
    targetType,
    targetId,
    targetLabel,
    details = {}
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("audit_logs").insert({
      actor_user_id: user.id,
      actor_email: user.email ?? userEmail ?? null,
      actor_name: profile?.full_name ?? null,
      module,
      action,
      target_type: targetType,
      target_id: targetId,
      target_label: targetLabel,
      details,
    });

    if (activeSection === "settings" && canManageCareTeam) {
      await loadAuditLogs(auditLogFilter);
    }
  }, [
    activeSection,
    auditLogFilter,
    canManageCareTeam,
    loadAuditLogs,
    profile?.full_name,
    userEmail,
  ]);

  return writeAuditLog;
}
