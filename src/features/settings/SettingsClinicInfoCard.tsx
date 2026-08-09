import type { Dispatch, SetStateAction } from "react";

import type { ClinicInfo } from "../../appShared";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusMessage } from "../../components/StatusMessage";

type SettingsClinicInfoCardProps = {
  clinicInfo: ClinicInfo;
  clinicInfoDraft: ClinicInfo;
  setClinicInfoDraft: Dispatch<SetStateAction<ClinicInfo>>;
  clinicInfoStatus: string;
  canManageClinicInfo: boolean;
  isClinicInfoEditing: boolean;
  isClinicInfoSaving: boolean;
  handleStartClinicInfoEdit: () => void;
  handleCancelClinicInfoEdit: () => void;
  handleSaveClinicInfo: () => void | Promise<void>;
};

export function SettingsClinicInfoCard({
  clinicInfo,
  clinicInfoDraft,
  setClinicInfoDraft,
  clinicInfoStatus,
  canManageClinicInfo,
  isClinicInfoEditing,
  isClinicInfoSaving,
  handleStartClinicInfoEdit,
  handleCancelClinicInfoEdit,
  handleSaveClinicInfo,
}: SettingsClinicInfoCardProps) {
  const updateDraft = (field: keyof ClinicInfo, value: string) => {
    setClinicInfoDraft((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="settings-module-card settings-clinic-info-card">
      <SectionHeader
        className="settings-module-header"
        kicker="Clinic Info"
        title="Contact details"
        titleClassName="settings-module-title"
        actions={
          canManageClinicInfo && !isClinicInfoEditing ? (
            <button
              type="button"
              className="small-button settings-announcement-secondary-button"
              onClick={handleStartClinicInfoEdit}
            >
              Edit details
            </button>
          ) : undefined
        }
      />

      <p className="settings-module-copy">
        Contact information shown to the care team. Admin and Staff can keep these details current.
      </p>

      {isClinicInfoEditing ? (
        <div className="settings-clinic-info-form">
          <div className="settings-clinic-info-fields">
            <label className="settings-clinic-info-field">
              <span>Mobile</span>
              <input
                className="search-input"
                value={clinicInfoDraft.mobile_number}
                maxLength={80}
                onChange={(event) => updateDraft("mobile_number", event.target.value)}
                autoComplete="tel"
              />
            </label>

            <label className="settings-clinic-info-field">
              <span>Landline</span>
              <input
                className="search-input"
                value={clinicInfoDraft.landline_number}
                maxLength={80}
                onChange={(event) => updateDraft("landline_number", event.target.value)}
                autoComplete="tel"
              />
            </label>

            <label className="settings-clinic-info-field settings-clinic-info-field-wide">
              <span>Email</span>
              <input
                className="search-input"
                type="email"
                value={clinicInfoDraft.email}
                maxLength={254}
                onChange={(event) => updateDraft("email", event.target.value)}
                autoComplete="email"
              />
            </label>

            <label className="settings-clinic-info-field settings-clinic-info-field-wide">
              <span>Location</span>
              <textarea
                className="textarea-input settings-clinic-address-input"
                value={clinicInfoDraft.address}
                maxLength={500}
                rows={3}
                onChange={(event) => updateDraft("address", event.target.value)}
                autoComplete="street-address"
              />
            </label>
          </div>

          <div className="settings-clinic-info-actions">
            <button
              type="button"
              className="small-button settings-announcement-secondary-button"
              onClick={handleCancelClinicInfoEdit}
              disabled={isClinicInfoSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="small-button"
              onClick={() => void handleSaveClinicInfo()}
              disabled={isClinicInfoSaving}
            >
              {isClinicInfoSaving ? "Saving…" : "Save clinic info"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="settings-contact-grid">
            <div className="settings-contact-card">
              <span className="client-meta-label">Mobile</span>
              <h3 className="settings-clinic-value">{clinicInfo.mobile_number || "Not set"}</h3>
            </div>

            <div className="settings-contact-card">
              <span className="client-meta-label">Landline</span>
              <h3 className="settings-clinic-value">{clinicInfo.landline_number || "Not set"}</h3>
            </div>

            <div className="settings-contact-card settings-contact-card-email">
              <span className="client-meta-label">Email</span>
              <h3 className="settings-clinic-value settings-email-value">
                {clinicInfo.email || "Not set"}
              </h3>
            </div>
          </div>

          <div className="settings-address-card">
            <span className="client-meta-label">Location</span>
            <h3 className="settings-clinic-value settings-address-value">
              {clinicInfo.address || "Not set"}
            </h3>
          </div>
        </>
      )}

      <StatusMessage className="settings-clinic-info-status" message={clinicInfoStatus} />
    </section>
  );
}
