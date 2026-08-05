import { useCallback, type Dispatch, type SetStateAction } from "react";

import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import type { ChildForm, ClientForm, ClientListItem } from "../../appShared";
import {
  getCurrentTimeInputValue,
  getTodayDateInputValue,
  normalizeClientMetadata,
  normalizeDate,
  normalizeTime,
} from "../../appShared";
import { serializeClientOverviewState } from "./clientOverviewHelpers";


const normalizePreExistingDiagnosisAnswer = (
  value: string | null | undefined
): "Yes" | "No" | "" => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!normalized) return "";
  if (["yes", "y", "true", "diagnosis indicated"].includes(normalized)) return "Yes";
  if (
    ["no", "n", "false", "none", "n/a", "na", "not applicable", "no diagnosis indicated"].includes(
      normalized
    )
  ) {
    return "No";
  }

  return "Yes";
};

const getLegacyPreExistingDiagnosisDetails = (
  value: string | null | undefined,
  details: string | null | undefined
) => {
  const normalizedAnswer = normalizePreExistingDiagnosisAnswer(value);
  const trimmedDetails = typeof details === "string" ? details.trim() : "";
  const trimmedValue = typeof value === "string" ? value.trim() : "";

  if (trimmedDetails) return trimmedDetails;
  if (normalizedAnswer === "Yes" && !["yes", "y", "true", "diagnosis indicated"].includes(trimmedValue.toLowerCase())) {
    return trimmedValue;
  }

  return "";
};


type UseClientDetailsLoaderArgs = {
  clients: ClientListItem[];
  setClientForm: Dispatch<SetStateAction<ClientForm>>;
  setChildrenForms: Dispatch<SetStateAction<ChildForm[]>>;
  setClientOverviewBaselineSnapshot: Dispatch<SetStateAction<string>>;
  setClientMessage: Dispatch<SetStateAction<string>>;
};

export function useClientDetailsLoader({
  clients,
  setClientForm,
  setChildrenForms,
  setClientOverviewBaselineSnapshot,
  setClientMessage,
}: UseClientDetailsLoaderArgs) {
  return useCallback(
    async (
      clientId: string,
      isCurrentRequest: () => boolean = () => true
    ) => {
      if (!clientId) return;

      setClientMessage(feedbackMessages.loading("Loading client"));

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (!isCurrentRequest()) return;

      if (clientError) {
        setClientMessage(feedbackMessages.loadFailed("client record", clientError.message));
        return;
      }

      const { data: childrenData, error: childrenError } = await supabase
        .from("client_children")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });

      if (!isCurrentRequest()) return;

      if (childrenError) {
        setClientMessage(feedbackMessages.loadFailed("client child records", childrenError.message));
        return;
      }

      const matchingClient =
        clients.find((client) => client.id === clientId) ?? {
          id: clientId,
          client_name: clientData.client_name ?? null,
          created_at: clientData.created_at ?? new Date().toISOString(),
          updated_at:
            clientData.updated_at ??
            clientData.created_at ??
            new Date().toISOString(),
          intake_date: clientData.intake_date ?? null,
          client_status: clientData.client_status ?? "Active",
          category_path: clientData.category_path ?? null,
        };

      const clientMetadata = normalizeClientMetadata(matchingClient);

      const nextClientForm: ClientForm = {
        intake_source: clientData.intake_source ?? "",
        intake_source_other: clientData.intake_source_other ?? "",
        client_status: clientMetadata.status,
        category_path: clientMetadata.category_path,

        client_name: clientData.client_name ?? "",
        age: clientData.age?.toString() ?? "",
        sex: clientData.sex ?? "",
        dob: normalizeDate(clientData.dob),
        complete_address: clientData.complete_address ?? "",
        mobile_number: clientData.mobile_number ?? "",
        email: clientData.email ?? "",
        sibling_order: clientData.sibling_order ?? "",
        sexual_orientation: clientData.sexual_orientation ?? "",
        sexual_orientation_other: clientData.sexual_orientation_other ?? "",
        marital_status: clientData.marital_status ?? "",
        marital_status_other: clientData.marital_status_other ?? "",
        educational_attainment: clientData.educational_attainment ?? "",
        employment_status: clientData.employment_status ?? "",
        employment_status_other: clientData.employment_status_other ?? "",
        occupation: clientData.occupation ?? "",
        employer_school: clientData.employer_school ?? "",
        employer_school_address: clientData.employer_school_address ?? "",

        partner_name: clientData.partner_name ?? "",
        partner_age: clientData.partner_age?.toString() ?? "",
        partner_dob: normalizeDate(clientData.partner_dob),
        partner_sexual_orientation:
          clientData.partner_sexual_orientation ?? "",
        partner_sexual_orientation_other:
          clientData.partner_sexual_orientation_other ?? "",
        years_together: clientData.years_together?.toString() ?? "",
        partner_educational_attainment:
          clientData.partner_educational_attainment ?? "",
        partner_employment_status:
          clientData.partner_employment_status ?? "",
        partner_employment_status_other:
          clientData.partner_employment_status_other ?? "",
        partner_occupation: clientData.partner_occupation ?? "",
        partner_employer_school: clientData.partner_employer_school ?? "",
        partner_employer_school_address:
          clientData.partner_employer_school_address ?? "",

        pre_existing_psychiatric_diagnosis: normalizePreExistingDiagnosisAnswer(
          clientData.pre_existing_psychiatric_diagnosis
        ),
        pre_existing_psychiatric_diagnosis_details:
          getLegacyPreExistingDiagnosisDetails(
            clientData.pre_existing_psychiatric_diagnosis,
            clientData.pre_existing_psychiatric_diagnosis_details
          ),
        counselling_reasons: Array.isArray(clientData.counselling_reasons)
          ? clientData.counselling_reasons
          : [],
        counselling_reason_text: clientData.counselling_reason_text ?? "",

        emergency_contact_person: clientData.emergency_contact_person ?? "",
        emergency_contact_relationship:
          clientData.emergency_contact_relationship ?? "",
        emergency_contact_address: clientData.emergency_contact_address ?? "",
        emergency_contact_number: clientData.emergency_contact_number ?? "",

        intake_date:
          normalizeDate(clientData.intake_date) || getTodayDateInputValue(),
        hpc_representative: clientData.hpc_representative ?? "",
        hpc_representative_other:
          clientData.hpc_representative_other ?? "",
        time_started:
          normalizeTime(clientData.time_started) ||
          getCurrentTimeInputValue(),
        time_ended: normalizeTime(clientData.time_ended),
      };

      const nextChildrenForms: ChildForm[] = (childrenData ?? []).map(
        (child) => ({
          id: child.id,
          child_name: child.child_name ?? "",
          child_age: child.child_age?.toString() ?? "",
          child_birth_date: normalizeDate(child.child_birth_date),
          child_sex: child.child_sex ?? "",
          child_sex_other: child.child_sex_other ?? "",
        })
      );

      setClientForm(nextClientForm);
      setChildrenForms(nextChildrenForms);
      setClientOverviewBaselineSnapshot(
        serializeClientOverviewState(nextClientForm, nextChildrenForms)
      );

      setClientMessage("");
    },
    [
      clients,
      setChildrenForms,
      setClientForm,
      setClientMessage,
      setClientOverviewBaselineSnapshot,
    ]
  );
}
