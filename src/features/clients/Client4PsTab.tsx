import { StatusMessage } from "../../components/StatusMessage";
import { SectionHeader } from "../../components/SectionHeader";
import type {
  Client4PsForm,
  FourPsFactorKey,
  FourPsRowKey,
} from "../../appShared";
import { FOUR_PS_FACTORS, FOUR_PS_ROWS } from "../../appShared";

type Client4PsTabProps = {
  client4PsForm: Client4PsForm;
  client4PsNarrativeReport: string;
  client4PsMessage: string;
  loading: boolean;
  isSavingClient4Ps: boolean;
  isGeneratingClient4PsNarrative: boolean;
  selectedClientId: string | null;
  updateClient4PsField: (
    rowKey: FourPsRowKey,
    factorKey: FourPsFactorKey,
    value: string
  ) => void;
  updateClient4PsNarrativeReport: (value: string) => void;
  handleGenerateClient4PsNarrative: () => void;
  handleSaveClient4Ps: () => void;
  isReadOnly?: boolean;
};

export function Client4PsTab({
  client4PsForm,
  client4PsNarrativeReport,
  client4PsMessage,
  loading,
  isSavingClient4Ps,
  isGeneratingClient4PsNarrative,
  selectedClientId,
  updateClient4PsField,
  updateClient4PsNarrativeReport,
  handleGenerateClient4PsNarrative,
  handleSaveClient4Ps,
  isReadOnly = false,
}: Client4PsTabProps) {
  const isDisabled =
    loading || isSavingClient4Ps || isGeneratingClient4PsNarrative || !selectedClientId || isReadOnly;
  const requiredRowsMissing = FOUR_PS_ROWS.filter((row) =>
    FOUR_PS_FACTORS.every(
      (factor) => client4PsForm[row.key][factor.key].trim() === ""
    )
  );
  const hasMissingRequiredRows = requiredRowsMissing.length > 0;
  const requirementCopy = hasMissingRequiredRows
    ? `Required: add at least one entry for ${requiredRowsMissing
        .map((row) => row.label)
        .join(", ")}.`
    : "Required 4Ps rows are complete.";

  return (
    <div className="panel client-4ps-panel">
      <SectionHeader
        className="section-header client-4ps-header"
        title="4Ps Case Conceptualization"
        description="Complete the Biological, Psychological, and Social factors for each 4Ps area."
        descriptionClassName="section-subtitle"
      />

      {isReadOnly ? (
        <p className="dashboard-status-message">
          Your role can view 4Ps and narrative reports, but cannot add or edit them.
        </p>
      ) : null}
      <p
        className={
          hasMissingRequiredRows
            ? "client-4ps-requirement-note warning"
            : "client-4ps-requirement-note"
        }
      >
        {requirementCopy}
      </p>

      <div className="client-4ps-table-wrap">
        <table className="client-4ps-table">
          <thead>
            <tr>
              <th scope="col" className="client-4ps-row-heading">
                4Ps
              </th>
              {FOUR_PS_FACTORS.map((factor) => (
                <th key={factor.key} scope="col">
                  {factor.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {FOUR_PS_ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="client-4ps-row-heading">
                  {row.label}
                </th>

                {FOUR_PS_FACTORS.map((factor) => (
                  <td key={factor.key}>
                    <label className="sr-only" htmlFor={`four-ps-${row.key}-${factor.key}`}>
                      {row.label} {factor.label}
                    </label>
                    <textarea
                      id={`four-ps-${row.key}-${factor.key}`}
                      className="search-input client-4ps-textarea"
                      value={client4PsForm[row.key][factor.key]}
                      onChange={(event) =>
                        updateClient4PsField(
                          row.key,
                          factor.key,
                          event.target.value
                        )
                      }
                      placeholder={`Enter ${row.label.toLowerCase()} ${factor.label.toLowerCase()} factors`}
                      rows={6}
                      disabled={isReadOnly}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="client-4ps-mobile-list">
        {FOUR_PS_ROWS.map((row) => (
          <section className="client-4ps-mobile-card" key={row.key}>
            <h4>{row.label}</h4>

            {FOUR_PS_FACTORS.map((factor) => (
              <label className="form-label" key={factor.key}>
                {factor.label}
                <textarea
                  className="search-input client-4ps-textarea"
                  value={client4PsForm[row.key][factor.key]}
                  onChange={(event) =>
                    updateClient4PsField(row.key, factor.key, event.target.value)
                  }
                  placeholder={`Enter ${factor.label.toLowerCase()} factors`}
                  rows={6}
                  disabled={isReadOnly}
                />
              </label>
            ))}
          </section>
        ))}
      </div>

      <div className="client-4ps-case-actions">
        <StatusMessage
          className="client-4ps-action-status"
          message={client4PsMessage}
        />
        <button
          className="small-button primary-button"
          type="button"
          onClick={handleSaveClient4Ps}
          disabled={isDisabled}
        >
          {isSavingClient4Ps ? "Saving..." : "Save 4Ps"}
        </button>
      </div>

      <section className="client-4ps-narrative-panel">
        <SectionHeader
          className="section-header client-4ps-narrative-header"
          title="Narrative Report"
          titleAs="h4"
        />

        <label className="form-label client-4ps-narrative-field">
          <textarea
            className="search-input client-4ps-narrative-textarea"
            value={client4PsNarrativeReport}
            onChange={(event) => updateClient4PsNarrativeReport(event.target.value)}
            placeholder="Generated or manually written narrative report will appear here."
            rows={12}
            disabled={loading || isSavingClient4Ps || isReadOnly}
          />
        </label>

        <p className="client-4ps-ai-helper">
          Generate an AI draft from the 4Ps table, then review and edit before saving.
        </p>

        <div className="client-4ps-ai-reminder">
          <span>
            Do not include client names or identifying details in the 4Ps fields before generating.
            The generated report is a draft and must be reviewed by the clinician.
          </span>
        </div>

        <div className="client-4ps-bottom-actions">
          <StatusMessage
            className="client-4ps-action-status"
            message={client4PsMessage}
          />
          <div className="client-4ps-button-group">
            <button
              className="small-button"
              type="button"
              onClick={handleGenerateClient4PsNarrative}
              disabled={isDisabled}
            >
              {isGeneratingClient4PsNarrative ? "Generating..." : "Generate Narrative Report"}
            </button>

            <button
              className="small-button primary-button"
              type="button"
              onClick={handleSaveClient4Ps}
              disabled={isDisabled}
            >
              {isSavingClient4Ps ? "Saving..." : "Save 4Ps and Narrative Report"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
