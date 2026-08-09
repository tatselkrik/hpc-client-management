import type { Dispatch, SetStateAction } from "react";
import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import type { ChildForm, ClientForm, ClientTab } from "../../appShared";
import {
  getTodayDateInputValue,
  normalizeHpcRepresentativeName,
  toNullableInt,
  toNullableText,
} from "../../appShared";

type WriteAuditLog = (
  module: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  targetLabel: string | null,
  details?: Record<string, unknown>
) => Promise<void>;

type UseClientSaveParams = {
  selectedClientId: string;
  clientForm: ClientForm;
  childrenForms: ChildForm[];
  canCreateClientRecords: boolean;
  shouldLockClientRepresentativeToAssigned: boolean;
  assignedHpcRepresentativeName: string;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setClientMessage: Dispatch<SetStateAction<string>>;
  loadClients: () => Promise<void>;
  loadClientDetails: (clientId: string) => Promise<void>;
  setSelectedClientId: Dispatch<SetStateAction<string>>;
  setActiveClientTab: Dispatch<SetStateAction<ClientTab>>;
  writeAuditLog: WriteAuditLog;
};


const validateRequiredClientOverviewFields = (clientForm: ClientForm) => {
  const missingFields: string[] = [];

  if (!clientForm.client_name.trim()) {
    missingFields.push("Name");
  }

  const ageValue = Number(clientForm.age);
  if (!clientForm.age.trim() || !Number.isFinite(ageValue) || ageValue <= 0) {
    missingFields.push("Age");
  }

  if (!clientForm.sex.trim()) {
    missingFields.push("Sex");
  }

  if (!clientForm.pre_existing_psychiatric_diagnosis.trim()) {
    missingFields.push("Pre-existing Psychiatric Diagnosis");
  }

  if (clientForm.counselling_reasons.length === 0) {
    missingFields.push("at least one Reason/s for Counseling");
  }

  if (!clientForm.intake_date) {
    missingFields.push("Intake Date");
  }

  if (!clientForm.hpc_representative.trim()) {
    missingFields.push("HPC Representative");
  }

  return missingFields;
};

export function useClientSave({
  selectedClientId,
  clientForm,
  childrenForms,
  canCreateClientRecords,
  shouldLockClientRepresentativeToAssigned,
  assignedHpcRepresentativeName,
  setLoading,
  setClientMessage,
  loadClients,
  loadClientDetails,
  setSelectedClientId,
  setActiveClientTab,
  writeAuditLog,
}: UseClientSaveParams) {
  const getLockedRepresentativeName = () => assignedHpcRepresentativeName.trim();

  const getEffectiveClientForm = () => {
    const lockedRepresentativeName = getLockedRepresentativeName();

    if (!shouldLockClientRepresentativeToAssigned || !lockedRepresentativeName) {
      return clientForm;
    }

    return {
      ...clientForm,
      hpc_representative: lockedRepresentativeName,
      hpc_representative_other: "",
    };
  };

  const handleAddClient = async (initialRepresentativeName = "") => {
    if (!canCreateClientRecords) {
      setClientMessage(
        feedbackMessages.permissionDenied("Your role cannot create client records.")
      );
      return false;
    }

    const lockedRepresentativeName = getLockedRepresentativeName();

    if (shouldLockClientRepresentativeToAssigned && !lockedRepresentativeName) {
      setClientMessage(
        "Your account needs an assigned HPC Representative in Care Team before creating clients."
      );
      return false;
    }

    const selectedRepresentativeName = shouldLockClientRepresentativeToAssigned
      ? lockedRepresentativeName
      : normalizeHpcRepresentativeName(initialRepresentativeName);

    if (!selectedRepresentativeName) {
      setClientMessage("Choose an active HPC Representative before creating a client.");
      return false;
    }

    setLoading(true);
    setClientMessage(feedbackMessages.loading("Creating client"));

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const defaultIntakeDate = getTodayDateInputValue();

    const { data, error } = await supabase
      .from("clients")
      .insert({
        client_name: "New Client",
        created_by: user?.id ?? null,
        intake_date: defaultIntakeDate,
        client_status: "Active",
        category_path: null,
        hpc_representative: selectedRepresentativeName,
        hpc_representative_other: null,
      })
      .select("id")
      .single();

    if (error) {
      setClientMessage(feedbackMessages.createFailed("client", error.message));
      setLoading(false);
      return false;
    }

    await loadClients();
    await writeAuditLog("Clients", "Created", "client", data.id, "New Client", {
      summary: "Created a new client record.",
      hpc_representative: selectedRepresentativeName,
    });
    setSelectedClientId(data.id);
    setActiveClientTab("overview");
    setClientMessage(feedbackMessages.created("client"));
    setLoading(false);
    return true;
  };

  const handleSaveClientOverview = async () => {
    if (!selectedClientId) return;

    const lockedRepresentativeName = getLockedRepresentativeName();

    if (shouldLockClientRepresentativeToAssigned && !lockedRepresentativeName) {
      setClientMessage(
        "Your account needs an assigned HPC Representative in Care Team before saving client overview."
      );
      return;
    }

    const effectiveClientForm = getEffectiveClientForm();
    const missingRequiredFields = validateRequiredClientOverviewFields(effectiveClientForm);

    if (missingRequiredFields.length > 0) {
      setClientMessage(
        feedbackMessages.requiredFields(missingRequiredFields)
      );
      return;
    }

    setLoading(true);
    setClientMessage(feedbackMessages.loading("Saving client overview"));

    const { error: clientError } = await supabase
      .from("clients")
      .update({
        intake_source: toNullableText(effectiveClientForm.intake_source),
        intake_source_other:
          effectiveClientForm.intake_source === "Others"
            ? toNullableText(effectiveClientForm.intake_source_other)
            : null,
        client_name: effectiveClientForm.client_name.trim() || "Unnamed Client",
        age: toNullableInt(effectiveClientForm.age),
        sex: toNullableText(effectiveClientForm.sex),
        dob: effectiveClientForm.dob || null,
        complete_address: toNullableText(effectiveClientForm.complete_address),
        mobile_number: toNullableText(effectiveClientForm.mobile_number),
        email: toNullableText(effectiveClientForm.email),
        sibling_order: toNullableText(effectiveClientForm.sibling_order),
        sexual_orientation: toNullableText(effectiveClientForm.sexual_orientation),
        sexual_orientation_other:
          effectiveClientForm.sexual_orientation === "Other"
            ? toNullableText(effectiveClientForm.sexual_orientation_other)
            : null,
        marital_status: toNullableText(effectiveClientForm.marital_status),
        marital_status_other:
          effectiveClientForm.marital_status === "Other"
            ? toNullableText(effectiveClientForm.marital_status_other)
            : null,
        educational_attainment: toNullableText(effectiveClientForm.educational_attainment),
        employment_status: toNullableText(effectiveClientForm.employment_status),
        employment_status_other:
          effectiveClientForm.employment_status === "Other"
            ? toNullableText(effectiveClientForm.employment_status_other)
            : null,
        occupation: toNullableText(effectiveClientForm.occupation),
        employer_school: toNullableText(effectiveClientForm.employer_school),
        employer_school_address: toNullableText(effectiveClientForm.employer_school_address),
        partner_name: toNullableText(effectiveClientForm.partner_name),
        partner_age: toNullableInt(effectiveClientForm.partner_age),
        partner_dob: effectiveClientForm.partner_dob || null,
        partner_sexual_orientation: toNullableText(
          effectiveClientForm.partner_sexual_orientation
        ),
        partner_sexual_orientation_other:
          effectiveClientForm.partner_sexual_orientation === "Other"
            ? toNullableText(effectiveClientForm.partner_sexual_orientation_other)
            : null,
        years_together: toNullableInt(effectiveClientForm.years_together),
        partner_educational_attainment: toNullableText(
          effectiveClientForm.partner_educational_attainment
        ),
        partner_employment_status: toNullableText(
          effectiveClientForm.partner_employment_status
        ),
        partner_employment_status_other:
          effectiveClientForm.partner_employment_status === "Other"
            ? toNullableText(effectiveClientForm.partner_employment_status_other)
            : null,
        partner_occupation: toNullableText(effectiveClientForm.partner_occupation),
        partner_employer_school: toNullableText(effectiveClientForm.partner_employer_school),
        partner_employer_school_address: toNullableText(
          effectiveClientForm.partner_employer_school_address
        ),
        pre_existing_psychiatric_diagnosis: toNullableText(
          effectiveClientForm.pre_existing_psychiatric_diagnosis
        ),
        pre_existing_psychiatric_diagnosis_details:
          effectiveClientForm.pre_existing_psychiatric_diagnosis === "Yes"
            ? toNullableText(effectiveClientForm.pre_existing_psychiatric_diagnosis_details)
            : null,
        counselling_reasons:
          effectiveClientForm.counselling_reasons.length > 0
            ? effectiveClientForm.counselling_reasons
            : null,
        counselling_reason_text: toNullableText(effectiveClientForm.counselling_reason_text),
        emergency_contact_person: toNullableText(effectiveClientForm.emergency_contact_person),
        emergency_contact_relationship: toNullableText(
          effectiveClientForm.emergency_contact_relationship
        ),
        emergency_contact_address: toNullableText(effectiveClientForm.emergency_contact_address),
        emergency_contact_number: toNullableText(effectiveClientForm.emergency_contact_number),
        intake_date: effectiveClientForm.intake_date || null,
        client_status: effectiveClientForm.client_status,
        category_path: toNullableText(effectiveClientForm.category_path),
        hpc_representative: toNullableText(effectiveClientForm.hpc_representative),
        hpc_representative_other:
          effectiveClientForm.hpc_representative === "Other"
            ? toNullableText(effectiveClientForm.hpc_representative_other)
            : null,
        time_started: effectiveClientForm.time_started || null,
        time_ended: effectiveClientForm.time_ended || null,
      })
      .eq("id", selectedClientId);

    if (clientError) {
      setClientMessage(feedbackMessages.saveFailed("client overview", clientError.message));
      setLoading(false);
      return;
    }

    const { error: deleteChildrenError } = await supabase
      .from("client_children")
      .delete()
      .eq("client_id", selectedClientId);

    if (deleteChildrenError) {
      setClientMessage(feedbackMessages.saveFailed("client child records", deleteChildrenError.message));
      setLoading(false);
      return;
    }

    const childrenToInsert = childrenForms
      .filter(
        (child) =>
          child.child_name.trim() !== "" ||
          child.child_age.trim() !== "" ||
          child.child_birth_date.trim() !== "" ||
          child.child_sex.trim() !== "" ||
          child.child_sex_other.trim() !== ""
      )
      .map((child) => ({
        client_id: selectedClientId,
        child_name: child.child_name.trim() || "Unnamed Child",
        child_age: toNullableInt(child.child_age),
        child_birth_date: child.child_birth_date || null,
        child_sex: toNullableText(child.child_sex),
        child_sex_other:
          child.child_sex === "Other"
            ? toNullableText(child.child_sex_other)
            : null,
      }));

    if (childrenToInsert.length > 0) {
      const { error: insertChildrenError } = await supabase
        .from("client_children")
        .insert(childrenToInsert);

      if (insertChildrenError) {
        setClientMessage(feedbackMessages.saveFailed("client child records", insertChildrenError.message));
        setLoading(false);
        return;
      }
    }

    await loadClients();
    await loadClientDetails(selectedClientId);
    await writeAuditLog(
      "Clients",
      "Updated Overview",
      "client",
      selectedClientId,
      effectiveClientForm.client_name.trim() || "Unnamed Client",
      {
        summary: "Updated client overview/intake details.",
        status: effectiveClientForm.client_status,
        category_path: toNullableText(effectiveClientForm.category_path),
        hpc_representative: toNullableText(effectiveClientForm.hpc_representative),
      }
    );
    setClientMessage(feedbackMessages.saved("client overview"));
    setLoading(false);
  };

  return {
    handleAddClient,
    handleSaveClientOverview,
  };
}
