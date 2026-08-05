import { SectionHeader } from "../../components/SectionHeader";
import { CLINIC_CLINIC_INFO } from "../../appShared";

export function SettingsClinicInfoCard() {
  return (
    <section className="settings-module-card settings-clinic-info-card">
      <SectionHeader className="settings-module-header" kicker="Clinic Info" />

      <div className="settings-contact-grid">
        <div className="settings-contact-card">
          <span className="client-meta-label">Mobile</span>
          <h3 className="settings-clinic-value">
            {CLINIC_CLINIC_INFO.mobile_number}
          </h3>
        </div>

        <div className="settings-contact-card">
          <span className="client-meta-label">Landline</span>
          <h3 className="settings-clinic-value">
            {CLINIC_CLINIC_INFO.landline_number}
          </h3>
        </div>

        <div className="settings-contact-card settings-contact-card-email">
          <span className="client-meta-label">Email</span>
          <h3 className="settings-clinic-value settings-email-value">
            {CLINIC_CLINIC_INFO.email}
          </h3>
        </div>
      </div>

      <div className="settings-address-card">
        <span className="client-meta-label">Address</span>
        <h3 className="settings-clinic-value settings-address-value">
          {CLINIC_CLINIC_INFO.address}
        </h3>
      </div>
    </section>
  );
}
