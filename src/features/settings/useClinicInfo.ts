import { useCallback, useEffect, useState } from "react";

import type { ClinicInfo, Profile, Section, WriteAuditLog } from "../../appShared";
import { DEFAULT_CLINIC_INFO as DEFAULT_PUBLIC_CLINIC_INFO } from "../../appShared";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import { supabase } from "../../lib/supabase";

type UseClinicInfoOptions = {
  activeSection: Section;
  canManageClinicInfo: boolean;
  profile: Profile | null;
  writeAuditLog: WriteAuditLog;
};

const DEFAULT_CLINIC_INFO: ClinicInfo = {
  id: 1,
  mobile_number: DEFAULT_PUBLIC_CLINIC_INFO.mobile_number,
  landline_number: DEFAULT_PUBLIC_CLINIC_INFO.landline_number,
  email: DEFAULT_PUBLIC_CLINIC_INFO.email,
  address: DEFAULT_PUBLIC_CLINIC_INFO.address,
};

const normalizeClinicInfo = (value: Partial<ClinicInfo>): ClinicInfo => ({
  id: 1,
  mobile_number: String(value.mobile_number ?? "").trim(),
  landline_number: String(value.landline_number ?? "").trim(),
  email: String(value.email ?? "").trim().toLowerCase(),
  address: String(value.address ?? "").trim(),
  updated_at: value.updated_at ?? null,
});

const validateClinicInfo = (value: ClinicInfo) => {
  if (!value.mobile_number && !value.landline_number) {
    return "Enter at least one clinic contact number.";
  }
  if (!value.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    return "Enter a valid clinic email address.";
  }
  if (!value.address) return "Enter the clinic location.";
  if (value.mobile_number.length > 80 || value.landline_number.length > 80) {
    return "Clinic phone numbers must be 80 characters or fewer.";
  }
  if (value.address.length > 500) return "Clinic location must be 500 characters or fewer.";
  return "";
};

export function useClinicInfo({
  activeSection,
  canManageClinicInfo,
  profile,
  writeAuditLog,
}: UseClinicInfoOptions) {
  const [clinicInfo, setClinicInfo] = useState<ClinicInfo>(DEFAULT_CLINIC_INFO);
  const [clinicInfoDraft, setClinicInfoDraft] = useState<ClinicInfo>(DEFAULT_CLINIC_INFO);
  const [clinicInfoStatus, setClinicInfoStatus] = useState("");
  const [isClinicInfoEditing, setIsClinicInfoEditing] = useState(false);
  const [isClinicInfoSaving, setIsClinicInfoSaving] = useState(false);

  const loadClinicInfo = useCallback(async () => {
    const { data, error } = await supabase
      .from("clinic_settings")
      .select("id, mobile_number, landline_number, email, address, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      setClinicInfoStatus(feedbackMessages.loadFailed("clinic information", error.message));
      return;
    }

    const nextValue = normalizeClinicInfo(data ?? DEFAULT_CLINIC_INFO);
    setClinicInfo(nextValue);
    setClinicInfoDraft(nextValue);
    setClinicInfoStatus("");
  }, []);

  useEffect(() => {
    if (activeSection === "settings") void loadClinicInfo();
  }, [activeSection, loadClinicInfo]);

  const handleStartClinicInfoEdit = () => {
    if (!canManageClinicInfo) return;
    setClinicInfoDraft(clinicInfo);
    setClinicInfoStatus("");
    setIsClinicInfoEditing(true);
  };

  const handleCancelClinicInfoEdit = () => {
    setClinicInfoDraft(clinicInfo);
    setClinicInfoStatus("");
    setIsClinicInfoEditing(false);
  };

  const handleSaveClinicInfo = async () => {
    if (!canManageClinicInfo) {
      setClinicInfoStatus(
        feedbackMessages.permissionDenied("Only Admin or Staff can update clinic information."),
      );
      return;
    }

    const normalizedDraft = normalizeClinicInfo(clinicInfoDraft);
    const validationMessage = validateClinicInfo(normalizedDraft);

    if (validationMessage) {
      setClinicInfoStatus(feedbackMessages.error("We could not save clinic information.", validationMessage));
      return;
    }

    setIsClinicInfoSaving(true);
    setClinicInfoStatus(feedbackMessages.loading("Saving clinic information"));

    try {
      const { data, error } = await supabase
        .from("clinic_settings")
        .upsert(
          {
            id: 1,
            mobile_number: normalizedDraft.mobile_number,
            landline_number: normalizedDraft.landline_number,
            email: normalizedDraft.email,
            address: normalizedDraft.address,
            updated_by: profile?.id ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select("id, mobile_number, landline_number, email, address, updated_at")
        .single();

      if (error) throw error;

      const savedValue = normalizeClinicInfo(data);
      setClinicInfo(savedValue);
      setClinicInfoDraft(savedValue);
      setIsClinicInfoEditing(false);
      setClinicInfoStatus("Clinic information saved.");

      await writeAuditLog(
        "Settings",
        "Updated Clinic Information",
        "clinic_settings",
        "1",
        "Clinic Info",
        { contact_fields_updated: true },
      );
    } catch (error) {
      setClinicInfoStatus(
        feedbackMessages.error(
          "We could not save clinic information.",
          getErrorDetail(error),
        ),
      );
    } finally {
      setIsClinicInfoSaving(false);
    }
  };

  return {
    clinicInfo,
    clinicInfoDraft,
    setClinicInfoDraft,
    clinicInfoStatus,
    isClinicInfoEditing,
    isClinicInfoSaving,
    handleStartClinicInfoEdit,
    handleCancelClinicInfoEdit,
    handleSaveClinicInfo,
  };
}
