import { StatusMessage } from "../../components/StatusMessage";
import { SectionHeader } from "../../components/SectionHeader";
import type { ChildForm, ClientForm, ClientStatus } from "../../appShared";
import {
  CHILD_SEX_OPTIONS,
  CLIENT_STATUS_OPTIONS,
  COUNSELLING_REASON_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  parseSiblingOrder,
  PARTNER_EMPLOYMENT_STATUS_OPTIONS,
  SEX_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from "../../appShared";

type ClientOverviewTabProps = {
  clientForm: ClientForm;
  categoryOptions: string[];
  hpcRepresentativeOptions: string[];
  isHpcRepresentativeLocked: boolean;
  lockedHpcRepresentativeName: string;
  childrenForms: ChildForm[];
  clientMessage: string;
  loading: boolean;
  selectedClientId: string | null;
  isClientOverviewDirty: boolean;
  updateClientForm: <K extends keyof ClientForm>(
    field: K,
    value: ClientForm[K]
  ) => void;
  updateSiblingOrderPart: (
    part: "position" | "total",
    rawValue: string
  ) => void;
  toggleCounsellingReason: (reason: string) => void;
  addChildRow: () => void;
  updateChildRow: <K extends keyof ChildForm>(
    index: number,
    field: K,
    value: ChildForm[K]
  ) => void;
  removeChildRow: (index: number) => void;
  handleSaveClientOverview: () => void;
};

export function ClientOverviewTab({
  clientForm,
  categoryOptions,
  hpcRepresentativeOptions,
  isHpcRepresentativeLocked,
  lockedHpcRepresentativeName,
  childrenForms,
  clientMessage,
  loading,
  selectedClientId,
  isClientOverviewDirty,
  updateClientForm,
  updateSiblingOrderPart,
  toggleCounsellingReason,
  addChildRow,
  updateChildRow,
  removeChildRow,
  handleSaveClientOverview,
}: ClientOverviewTabProps) {
  const { position: siblingOrderPosition, total: siblingOrderTotal } =
    parseSiblingOrder(clientForm.sibling_order);
  const sexSelectValue =
    clientForm.sex === "" || SEX_OPTIONS.includes(clientForm.sex)
      ? clientForm.sex
      : "Other";
  const showSexOtherInput = sexSelectValue === "Other";
  const categorySelectValue = categoryOptions.includes(clientForm.category_path)
    ? clientForm.category_path
    : "";
  const normalizedLockedHpcRepresentativeName = lockedHpcRepresentativeName.trim();
  const effectiveHpcRepresentativeOptions =
    isHpcRepresentativeLocked &&
    normalizedLockedHpcRepresentativeName &&
    !hpcRepresentativeOptions.includes(normalizedLockedHpcRepresentativeName)
      ? [normalizedLockedHpcRepresentativeName, ...hpcRepresentativeOptions]
      : hpcRepresentativeOptions;
  const hpcRepresentativeSelectValue =
    isHpcRepresentativeLocked && normalizedLockedHpcRepresentativeName
      ? normalizedLockedHpcRepresentativeName
      : clientForm.hpc_representative;

  return (
<div className="panel">
      <SectionHeader className="section-header" title="Client Overview" />

      <StatusMessage message={clientMessage} />

      {isClientOverviewDirty && (
        <div className="overview-unsaved-banner" role="status">
          <div>
            <strong>Unsaved overview changes</strong>
            <span>Save before switching clients, tabs, or leaving the app.</span>
          </div>
          <button
            className="small-button"
            type="button"
            onClick={handleSaveClientOverview}
            disabled={loading || !selectedClientId}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      <div className="form-section">
        <h4>Intake Source</h4>
        <div className="form-grid">
          <label className="form-label">
            Where did you hear HPC?
            <select
              className="search-input"
              value={clientForm.intake_source}
              onChange={(e) => {
                const value = e.target.value;
                updateClientForm("intake_source", value);
                if (value !== "Others") {
                  updateClientForm("intake_source_other", "");
                }
              }}
            >
              <option value="">Select source</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Referral">Referral</option>
              <option value="Online">Online</option>
              <option value="Others">Others</option>
            </select>
          </label>

          {clientForm.intake_source === "Others" && (
            <label className="form-label">
              If Others, specify
              <input
                className="search-input"
                type="text"
                value={clientForm.intake_source_other}
                onChange={(e) =>
                  updateClientForm("intake_source_other", e.target.value)
                }
              />
            </label>
          )}
        </div>
      </div>

      <div className="form-section">
        <h4>Basic Client Information</h4>
        <div className="form-grid">
          <label className="form-label">
            <span className="required-label">
              Client's Name <span className="required-marker" aria-hidden="true">*</span>
            </span>
            <input
              className="search-input"
              type="text"
              value={clientForm.client_name}
              onChange={(e) => updateClientForm("client_name", e.target.value)}
              required
              aria-required="true"
            />
          </label>

          <label className="form-label">
            <span className="required-label">
              Age <span className="required-marker" aria-hidden="true">*</span>
            </span>
            <input
              className="search-input"
              type="number"
              min="1"
              value={clientForm.age}
              onChange={(e) => updateClientForm("age", e.target.value)}
              required
              aria-required="true"
            />
          </label>

          <label className="form-label">
            <span className="required-label">
              Sex <span className="required-marker" aria-hidden="true">*</span>
            </span>
            <select
              className="search-input"
              value={sexSelectValue}
              required
              aria-required="true"
              onChange={(e) => {
                const value = e.target.value;

                if (value === "Other") {
                  updateClientForm("sex", "Other");
                  return;
                }

                updateClientForm("sex", value);
              }}
            >
              <option value="">Select sex</option>
              {SEX_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {showSexOtherInput && (
            <label className="form-label">
              Sex (Other)
              <input
                className="search-input"
                type="text"
                value={SEX_OPTIONS.includes(clientForm.sex) ? "" : clientForm.sex}
                onChange={(e) => updateClientForm("sex", e.target.value)}
              />
            </label>
          )}

          <label className="form-label">
            Date of Birth
            <input
              className="search-input"
              type="date"
              value={clientForm.dob}
              onChange={(e) => updateClientForm("dob", e.target.value)}
            />
          </label>

          <label className="form-label form-label-full">
            Complete Address
            <input
              className="search-input"
              type="text"
              value={clientForm.complete_address}
              onChange={(e) =>
                updateClientForm("complete_address", e.target.value)
              }
            />
          </label>

          <label className="form-label">
            Mobile Number
            <input
              className="search-input"
              type="text"
              value={clientForm.mobile_number}
              onChange={(e) =>
                updateClientForm("mobile_number", e.target.value)
              }
            />
          </label>

          <label className="form-label">
            Email
            <input
              className="search-input"
              type="email"
              value={clientForm.email}
              onChange={(e) => updateClientForm("email", e.target.value)}
            />
          </label>

          <label className="form-label sibling-order-label">
            Sibling Order
            <div className="fraction-input-group">
              <input
                className="search-input fraction-input"
                type="text"
                inputMode="numeric"
                value={siblingOrderPosition}
                onChange={(e) =>
                  updateSiblingOrderPart("position", e.target.value)
                }
              />

              <span className="fraction-separator" aria-hidden="true">
                /
              </span>

              <input
                className="search-input fraction-input"
                type="text"
                inputMode="numeric"
                value={siblingOrderTotal}
                onChange={(e) => updateSiblingOrderPart("total", e.target.value)}
              />
            </div>

            <small className="field-hint">
              Example: 1/3 = eldest of three, 3/3 = youngest of three.
            </small>
          </label>

          <label className="form-label sexual-orientation-label">
            Sexual Orientation
            <select
              className="search-input"
              value={clientForm.sexual_orientation}
              onChange={(e) => {
                const value = e.target.value;
                updateClientForm("sexual_orientation", value);
                if (value !== "Other") {
                  updateClientForm("sexual_orientation_other", "");
                }
              }}
            >
              <option value="">Select sexual orientation</option>
              {SEXUAL_ORIENTATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {clientForm.sexual_orientation === "Other" && (
            <label className="form-label">
              Sexual Orientation (Other)
              <input
                className="search-input"
                type="text"
                value={clientForm.sexual_orientation_other}
                onChange={(e) =>
                  updateClientForm("sexual_orientation_other", e.target.value)
                }
              />
            </label>
          )}

          <label className="form-label">
            Marital Status
            <select
              className="search-input"
              value={clientForm.marital_status}
              onChange={(e) => {
                const value = e.target.value;
                updateClientForm("marital_status", value);
                if (value !== "Other") {
                  updateClientForm("marital_status_other", "");
                }
              }}
            >
              <option value="">Select marital status</option>
              {MARITAL_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {clientForm.marital_status === "Other" && (
            <label className="form-label">
              Marital Status (Other)
              <input
                className="search-input"
                type="text"
                value={clientForm.marital_status_other}
                onChange={(e) =>
                  updateClientForm("marital_status_other", e.target.value)
                }
              />
            </label>
          )}

          <label className="form-label">
            Educational Attainment
            <input
              className="search-input"
              type="text"
              value={clientForm.educational_attainment}
              onChange={(e) =>
                updateClientForm("educational_attainment", e.target.value)
              }
            />
          </label>

          <label className="form-label">
            Employment Status
            <select
              className="search-input"
              value={clientForm.employment_status}
              onChange={(e) => {
                const value = e.target.value;
                updateClientForm("employment_status", value);
                if (value !== "Other") {
                  updateClientForm("employment_status_other", "");
                }
              }}
            >
              <option value="">Select employment status</option>
              {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {clientForm.employment_status === "Other" && (
            <label className="form-label">
              Employment Status (Other)
              <input
                className="search-input"
                type="text"
                value={clientForm.employment_status_other}
                onChange={(e) =>
                  updateClientForm("employment_status_other", e.target.value)
                }
              />
            </label>
          )}

          <label className="form-label">
            Occupation
            <input
              className="search-input"
              type="text"
              value={clientForm.occupation}
              onChange={(e) => updateClientForm("occupation", e.target.value)}
            />
          </label>

          <label className="form-label">
            Employer/School
            <input
              className="search-input"
              type="text"
              value={clientForm.employer_school}
              onChange={(e) =>
                updateClientForm("employer_school", e.target.value)
              }
            />
          </label>

          <label className="form-label form-label-full">
            Employer/School Address
            <input
              className="search-input"
              type="text"
              value={clientForm.employer_school_address}
              onChange={(e) =>
                updateClientForm("employer_school_address", e.target.value)
              }
            />
          </label>
        </div>
      </div>

      <div className="form-section">
        <h4>Partner Information</h4>
        <div className="form-grid">
          <label className="form-label">
            Partner's Name
            <input
              className="search-input"
              type="text"
              value={clientForm.partner_name}
              onChange={(e) => updateClientForm("partner_name", e.target.value)}
            />
          </label>

          <label className="form-label">
            Partner Age
            <input
              className="search-input"
              type="number"
              value={clientForm.partner_age}
              onChange={(e) => updateClientForm("partner_age", e.target.value)}
            />
          </label>

          <label className="form-label">
            Partner DOB
            <input
              className="search-input"
              type="date"
              value={clientForm.partner_dob}
              onChange={(e) => updateClientForm("partner_dob", e.target.value)}
            />
          </label>

          <label className="form-label">
            Partner Sexual Orientation
            <select
              className="search-input"
              value={clientForm.partner_sexual_orientation}
              onChange={(e) => {
                const value = e.target.value;
                updateClientForm("partner_sexual_orientation", value);
                if (value !== "Other") {
                  updateClientForm("partner_sexual_orientation_other", "");
                }
              }}
            >
              <option value="">Select partner sexual orientation</option>
              {SEXUAL_ORIENTATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {clientForm.partner_sexual_orientation === "Other" && (
            <label className="form-label">
              Partner Sexual Orientation (Other)
              <input
                className="search-input"
                type="text"
                value={clientForm.partner_sexual_orientation_other}
                onChange={(e) =>
                  updateClientForm(
                    "partner_sexual_orientation_other",
                    e.target.value
                  )
                }
              />
            </label>
          )}

          <label className="form-label">
            Number of Years Together
            <input
              className="search-input"
              type="number"
              value={clientForm.years_together}
              onChange={(e) =>
                updateClientForm("years_together", e.target.value)
              }
            />
          </label>

          <label className="form-label">
            Partner Educational Attainment
            <input
              className="search-input"
              type="text"
              value={clientForm.partner_educational_attainment}
              onChange={(e) =>
                updateClientForm(
                  "partner_educational_attainment",
                  e.target.value
                )
              }
            />
          </label>

          <label className="form-label">
            Partner Employment Status
            <select
              className="search-input"
              value={clientForm.partner_employment_status}
              onChange={(e) => {
                const value = e.target.value;
                updateClientForm("partner_employment_status", value);
                if (value !== "Other") {
                  updateClientForm("partner_employment_status_other", "");
                }
              }}
            >
              <option value="">Select partner employment status</option>
              {PARTNER_EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {clientForm.partner_employment_status === "Other" && (
            <label className="form-label">
              Partner Employment Status (Other)
              <input
                className="search-input"
                type="text"
                value={clientForm.partner_employment_status_other}
                onChange={(e) =>
                  updateClientForm(
                    "partner_employment_status_other",
                    e.target.value
                  )
                }
              />
            </label>
          )}

          <label className="form-label">
            Partner Occupation
            <input
              className="search-input"
              type="text"
              value={clientForm.partner_occupation}
              onChange={(e) =>
                updateClientForm("partner_occupation", e.target.value)
              }
            />
          </label>

          <label className="form-label">
            Partner Employer/School
            <input
              className="search-input"
              type="text"
              value={clientForm.partner_employer_school}
              onChange={(e) =>
                updateClientForm("partner_employer_school", e.target.value)
              }
            />
          </label>

          <label className="form-label form-label-full">
            Partner Employer/School Address
            <input
              className="search-input"
              type="text"
              value={clientForm.partner_employer_school_address}
              onChange={(e) =>
                updateClientForm(
                  "partner_employer_school_address",
                  e.target.value
                )
              }
            />
          </label>
        </div>
      </div>

      <div className="form-section">
        <SectionHeader
          className="section-header"
          title="Children"
          titleAs="h4"
          actions={
            <button className="small-button" onClick={addChildRow} type="button">
              + Add Child
            </button>
          }
        />

        {childrenForms.length === 0 ? (
          <p>No children added yet.</p>
        ) : (
          <div className="children-list">
            {childrenForms.map((child, index) => (
              <div key={index} className="child-card">
                <SectionHeader
                  className="section-header"
                  title={<>Child {index + 1}</>}
                  titleAs="h4"
                  actions={
                    <button
                      className="small-button"
                      type="button"
                      onClick={() => removeChildRow(index)}
                    >
                      Remove
                    </button>
                  }
                />

                <div className="form-grid">
                  <label className="form-label">
                    Name
                    <input
                      className="search-input"
                      type="text"
                      value={child.child_name}
                      onChange={(e) =>
                        updateChildRow(index, "child_name", e.target.value)
                      }
                    />
                  </label>

                  <label className="form-label">
                    Age
                    <input
                      className="search-input"
                      type="number"
                      value={child.child_age}
                      onChange={(e) =>
                        updateChildRow(index, "child_age", e.target.value)
                      }
                    />
                  </label>

                  <label className="form-label">
                    Birth Date
                    <input
                      className="search-input"
                      type="date"
                      value={child.child_birth_date}
                      onChange={(e) =>
                        updateChildRow(index, "child_birth_date", e.target.value)
                      }
                    />
                  </label>

                  <label className="form-label">
                    Sex
                    <select
                      className="search-input"
                      value={child.child_sex}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateChildRow(index, "child_sex", value);
                        if (value !== "Other") {
                          updateChildRow(index, "child_sex_other", "");
                        }
                      }}
                    >
                      <option value="">Select sex</option>
                      {CHILD_SEX_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  {child.child_sex === "Other" && (
                    <label className="form-label">
                      Sex (Other)
                      <input
                        className="search-input"
                        type="text"
                        value={child.child_sex_other}
                        onChange={(e) =>
                          updateChildRow(index, "child_sex_other", e.target.value)
                        }
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-section">
        <h4>Presenting Background</h4>
        <div className="form-grid">
          <label className="form-label form-label-full">
            <span className="required-label">
              Pre-existing Psychiatric Diagnosis <span className="required-marker" aria-hidden="true">*</span>
            </span>
            <select
              className="search-input"
              value={clientForm.pre_existing_psychiatric_diagnosis}
              required
              aria-required="true"
              onChange={(e) => {
                const value = e.target.value;
                updateClientForm(
                  "pre_existing_psychiatric_diagnosis",
                  value
                );

                if (value !== "Yes") {
                  updateClientForm("pre_existing_psychiatric_diagnosis_details", "");
                }
              }}
            >
              <option value="">Select yes or no</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>

          {clientForm.pre_existing_psychiatric_diagnosis === "Yes" && (
            <label className="form-label form-label-full">
              If yes, specify diagnosis or background
              <textarea
                className="search-input textarea-input"
                value={clientForm.pre_existing_psychiatric_diagnosis_details}
                rows={3}
                onChange={(e) =>
                  updateClientForm(
                    "pre_existing_psychiatric_diagnosis_details",
                    e.target.value
                  )
                }
              />
            </label>
          )}

          <div className="form-label form-label-full">
            <span className="required-label">
              Reason/s for Counseling <span className="required-marker" aria-hidden="true">*</span>
            </span>
            <div className="checkbox-group">
              {COUNSELLING_REASON_OPTIONS.map((reason) => {
                const checked = clientForm.counselling_reasons.includes(reason);

                return (
                  <label key={reason} className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCounsellingReason(reason)}
                    />
                    <span>{reason}</span>
                  </label>
                );
              })}
            </div>
            <span className="required-help-text">
              Select at least one counseling reason before saving.
            </span>
          </div>

          <label className="form-label form-label-full">
            Other / Comments
            <textarea
              className="search-input textarea-input"
              value={clientForm.counselling_reason_text}
              onChange={(e) =>
                updateClientForm("counselling_reason_text", e.target.value)
              }
              rows={5}
            />
          </label>
        </div>
      </div>

      <div className="form-section">
        <h4>Emergency Contact</h4>
        <div className="form-grid">
          <label className="form-label">
            Contact Person
            <input
              className="search-input"
              type="text"
              value={clientForm.emergency_contact_person}
              onChange={(e) =>
                updateClientForm("emergency_contact_person", e.target.value)
              }
            />
          </label>

          <label className="form-label">
            Relationship
            <input
              className="search-input"
              type="text"
              value={clientForm.emergency_contact_relationship}
              onChange={(e) =>
                updateClientForm("emergency_contact_relationship", e.target.value)
              }
            />
          </label>

          <label className="form-label form-label-full">
            Address
            <input
              className="search-input"
              type="text"
              value={clientForm.emergency_contact_address}
              onChange={(e) =>
                updateClientForm("emergency_contact_address", e.target.value)
              }
            />
          </label>

          <label className="form-label">
            Contact Number
            <input
              className="search-input"
              type="text"
              value={clientForm.emergency_contact_number}
              onChange={(e) =>
                updateClientForm("emergency_contact_number", e.target.value)
              }
            />
          </label>
        </div>
      </div>

      <div className="form-section">
        <h4>Intake Metadata</h4>
        <div className="form-grid">
          <label className="form-label">
            Client Status
            <select
              className="search-input"
              value={clientForm.client_status}
              onChange={(e) =>
                updateClientForm("client_status", e.target.value as ClientStatus)
              }
            >
              {CLIENT_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="form-label">
            Category
            <select
              className="search-input"
              value={categorySelectValue}
              onChange={(e) => updateClientForm("category_path", e.target.value)}
            >
              <option value="">Uncategorized</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="form-label">
            <span className="required-label">
              Intake Date <span className="required-marker" aria-hidden="true">*</span>
            </span>
            <input
              className="search-input"
              type="date"
              value={clientForm.intake_date}
              onChange={(e) => updateClientForm("intake_date", e.target.value)}
              required
              aria-required="true"
            />
          </label>

          <label className="form-label">
            <span className="required-label">
              HPC Representative <span className="required-marker" aria-hidden="true">*</span>
            </span>
            <select
              className="search-input"
              value={hpcRepresentativeSelectValue}
              required
              aria-required="true"
              disabled={isHpcRepresentativeLocked}
              aria-describedby={
                isHpcRepresentativeLocked ? "hpc-representative-lock-note" : undefined
              }
              onChange={(e) => {
                updateClientForm("hpc_representative", e.target.value);
                updateClientForm("hpc_representative_other", "");
              }}
            >
              <option value="">Select representative</option>
              {effectiveHpcRepresentativeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {isHpcRepresentativeLocked ? (
              <small id="hpc-representative-lock-note" className="field-hint">
                Locked to your assigned HPC Representative in Care Team.
              </small>
            ) : null}
          </label>

          <label className="form-label">
            Time Started
            <input
              className="search-input"
              type="time"
              value={clientForm.time_started}
              onChange={(e) => updateClientForm("time_started", e.target.value)}
            />
          </label>

          <label className="form-label">
            Time Ended
            <input
              className="search-input"
              type="time"
              value={clientForm.time_ended}
              onChange={(e) => updateClientForm("time_ended", e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="overview-actions sticky-overview-actions">
        <div className="overview-action-feedback">
          <StatusMessage
            className="overview-bottom-feedback"
            message={clientMessage}
          />
          <div className="overview-save-status">
            {isClientOverviewDirty ? "Unsaved changes" : "All changes saved"}
          </div>
        </div>
        <button
          className="small-button"
          onClick={handleSaveClientOverview}
          disabled={loading || !selectedClientId}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
