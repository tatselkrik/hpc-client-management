import { supabase } from "./supabase";
import { assertClinicalSession } from "./clinicalSession";

export async function recordExportPreparation(format: string, clientCount: number, generation: number) {
  assertClinicalSession(generation);
  const { error } = await supabase.rpc("log_audit_event", {
    p_module: "Analytics", p_action: "Export Prepared", p_target_type: "dataset",
    p_target_id: null, p_target_label: format,
    p_details: { format, client_count: clientCount, confidential: true },
  });
  if (error) throw new Error("The export could not be audited. Please try again before saving.");
  assertClinicalSession(generation);
}
