import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusMessage } from "../../components/StatusMessage";
import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";

import type {
  CssrsClinicTabProps,
  YesNoValue,
  CssrsBehaviorValue,
  CssrsDemeanorSelectionMap,
  CssrsDemeanorOtherTextMap,
  CssrsProtectiveFactorTextMap,
} from "../../appShared";

type CssrsFormSnapshotState = {
  ideationAnswers: Record<string, YesNoValue>;
  behavior: CssrsBehaviorValue;
  demeanorSelections: CssrsDemeanorSelectionMap;
  demeanorOtherTexts: CssrsDemeanorOtherTextMap;
  protectiveFactorTexts: CssrsProtectiveFactorTextMap;
};

const sortRecord = <T,>(record: Record<string, T>) =>
  Object.fromEntries(
    Object.entries(record).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey)
    )
  ) as Record<string, T>;

const serializeCssrsFormState = ({
  ideationAnswers,
  behavior,
  demeanorSelections,
  demeanorOtherTexts,
  protectiveFactorTexts,
}: CssrsFormSnapshotState) =>
  JSON.stringify({
    ideationAnswers: sortRecord(ideationAnswers),
    behavior,
    demeanorSelections: sortRecord(demeanorSelections),
    demeanorOtherTexts: sortRecord(demeanorOtherTexts),
    protectiveFactorTexts: sortRecord(protectiveFactorTexts),
  });

const createEmptyCssrsFormSnapshotState = (): CssrsFormSnapshotState => ({
  ideationAnswers: createCssrsIdeationState(),
  behavior: {
    lifetime: null,
    recent: null,
  },
  demeanorSelections: createCssrsDemeanorSelectionState(),
  demeanorOtherTexts: createCssrsDemeanorOtherTextState(),
  protectiveFactorTexts: createCssrsProtectiveFactorTextState(),
});

import {
  CSSRS_IDEATION_ITEMS,
  CSSRS_DEMEANOR_GROUPS,
  CSSRS_RISK_FACTORS,
  CSSRS_INTERVENTION_ROWS,
  CSSRS_PROTECTIVE_FACTORS,
  createCssrsIdeationState,
  buildCssrsDemeanorItemKey,
  createCssrsDemeanorSelectionState,
  createCssrsDemeanorOtherTextState,
  createCssrsProtectiveFactorTextState,
  normalizeCssrsIdeationAnswers,
  normalizeCssrsBehavior,
  normalizeCssrsDemeanorSelections,
  normalizeCssrsDemeanorOtherTexts,
  normalizeCssrsProtectiveFactorTexts,
} from "../../appShared";

export const CssrsClinicTab = ({
  clientId,
  clientName,
  writeAuditLog,
  onCssrsSaved,
  isReadOnly = false,
  canEditProtectiveFactors = !isReadOnly,
}: CssrsClinicTabProps) => {
  const isProtectiveFactorReadOnly = isReadOnly || !canEditProtectiveFactors;
  const [ideationAnswers, setIdeationAnswers] =
    useState<Record<string, YesNoValue>>(createCssrsIdeationState);
  const [behavior, setBehavior] = useState<CssrsBehaviorValue>({
    lifetime: null,
    recent: null,
  });
  const [demeanorSelections, setDemeanorSelections] =
    useState<CssrsDemeanorSelectionMap>(createCssrsDemeanorSelectionState);
  const [demeanorOtherTexts, setDemeanorOtherTexts] =
    useState<CssrsDemeanorOtherTextMap>(createCssrsDemeanorOtherTextState);
  const [protectiveFactorTexts, setProtectiveFactorTexts] =
    useState<CssrsProtectiveFactorTextMap>(createCssrsProtectiveFactorTextState);
  const [cssrsStatus, setCssrsStatus] = useState("");
  const [isCssrsLoading, setIsCssrsLoading] = useState(false);
  const [isCssrsSaving, setIsCssrsSaving] = useState(false);
  const [cssrsBaselineSnapshot, setCssrsBaselineSnapshot] = useState(() =>
    serializeCssrsFormState(createEmptyCssrsFormSnapshotState())
  );

  const applyCssrsFormState = (snapshotState: CssrsFormSnapshotState) => {
    setIdeationAnswers(snapshotState.ideationAnswers);
    setBehavior(snapshotState.behavior);
    setDemeanorSelections(snapshotState.demeanorSelections);
    setDemeanorOtherTexts(snapshotState.demeanorOtherTexts);
    setProtectiveFactorTexts(snapshotState.protectiveFactorTexts);
    setCssrsBaselineSnapshot(serializeCssrsFormState(snapshotState));
  };

  const resetCssrsForm = useCallback(() => {
    applyCssrsFormState(createEmptyCssrsFormSnapshotState());
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadCssrsRecord = async () => {
      if (!clientId) {
        resetCssrsForm();
        setCssrsStatus("");
        return;
      }

      setIsCssrsLoading(true);
      setCssrsStatus(feedbackMessages.loading("Loading C-SSRS record"));

      const { data, error } = await supabase
        .from("client_cssrs")
        .select(
          "ideation_answers, behavior, demeanor_selections, demeanor_other_texts, protective_factor_texts"
        )
        .eq("client_id", clientId)
        .maybeSingle();

      if (isCancelled) return;

      if (error) {
        resetCssrsForm();
        setCssrsStatus(feedbackMessages.loadFailed("C-SSRS record", error.message));
        setIsCssrsLoading(false);
        return;
      }

      if (!data) {
        resetCssrsForm();
        setCssrsStatus("");
        setIsCssrsLoading(false);
        return;
      }

      applyCssrsFormState({
        ideationAnswers: normalizeCssrsIdeationAnswers(
          data.ideation_answers as Record<string, unknown> | null | undefined
        ),
        behavior: normalizeCssrsBehavior(
          data.behavior as Partial<Record<keyof CssrsBehaviorValue, unknown>> | null | undefined
        ),
        demeanorSelections: normalizeCssrsDemeanorSelections(
          data.demeanor_selections as Record<string, unknown> | null | undefined
        ),
        demeanorOtherTexts: normalizeCssrsDemeanorOtherTexts(
          data.demeanor_other_texts as Record<string, unknown> | null | undefined
        ),
        protectiveFactorTexts: normalizeCssrsProtectiveFactorTexts(
          data.protective_factor_texts as Record<string, unknown> | null | undefined
        ),
      });
      setCssrsStatus("");
      setIsCssrsLoading(false);
    };

    void loadCssrsRecord();

    return () => {
      isCancelled = true;
    };
  }, [clientId, resetCssrsForm]);

  const positiveSeverity = useMemo(() => {
    const matched = CSSRS_IDEATION_ITEMS
      .filter((item) => ideationAnswers[item.id] === "yes")
      .map((item) => item.number);

    if (matched.length === 0) return null;
    return Math.max(...matched);
  }, [ideationAnswers]);

  const currentCssrsSnapshot = useMemo(
    () =>
      serializeCssrsFormState({
        ideationAnswers,
        behavior,
        demeanorSelections,
        demeanorOtherTexts,
        protectiveFactorTexts,
      }),
    [
      ideationAnswers,
      behavior,
      demeanorSelections,
      demeanorOtherTexts,
      protectiveFactorTexts,
    ]
  );

  const isCssrsDirty =
    Boolean(clientId) &&
    !isCssrsLoading &&
    cssrsBaselineSnapshot !== currentCssrsSnapshot;

  const setIdeation = (id: string, value: YesNoValue) => {
    if (isReadOnly) return;

    setIdeationAnswers((current) => ({
      ...current,
      [id]: current[id] === value ? null : value,
    }));
  };

  const setBehaviorValue = (key: keyof CssrsBehaviorValue, value: YesNoValue) => {
    if (isReadOnly) return;

    setBehavior((current) => ({
      ...current,
      [key]: current[key] === value ? null : value,
    }));
  };

  const toggleDemeanorSelection = (key: string) => {
    if (isReadOnly) return;

    setDemeanorSelections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const setDemeanorOtherText = (key: string, value: string) => {
    if (isReadOnly) return;

    setDemeanorOtherTexts((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const setProtectiveFactorText = (key: string, value: string) => {
    if (isProtectiveFactorReadOnly) return;

    setProtectiveFactorTexts((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSaveCssrs = async () => {
    if (isReadOnly) {
      setCssrsStatus(feedbackMessages.permissionDenied("Your role can view C-SSRS, but cannot add or edit it."));
      return;
    }

    if (!clientId) return;

    const levelOneItem = CSSRS_IDEATION_ITEMS.find((item) => item.number === 1);
    const hasLevelOneAnswer = levelOneItem
      ? ideationAnswers[levelOneItem.id] === "yes" ||
        ideationAnswers[levelOneItem.id] === "no"
      : false;
    const hasMentalStatusSelection = Object.values(demeanorSelections).some(Boolean);
    const missingRequiredFields = [
      !hasLevelOneAnswer ? "Level 1 yes/no answer" : "",
      !hasMentalStatusSelection ? "at least one Mental Status Interview item" : "",
    ].filter(Boolean);

    if (missingRequiredFields.length > 0) {
      setCssrsStatus(
        `Complete required C-SSRS fields before saving: ${missingRequiredFields.join(", ")}.`
      );
      return;
    }

    setIsCssrsSaving(true);
    setCssrsStatus(feedbackMessages.loading("Saving C-SSRS record"));

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setCssrsStatus(feedbackMessages.saveFailed("C-SSRS record", userError.message));
      setIsCssrsSaving(false);
      return;
    }

    const cssrsPayload: Record<string, unknown> = {
      client_id: clientId,
      ideation_answers: ideationAnswers,
      behavior,
      demeanor_selections: demeanorSelections,
      demeanor_other_texts: demeanorOtherTexts,
      positive_severity: positiveSeverity,
      created_by: user?.id ?? null,
    };

    if (canEditProtectiveFactors) {
      cssrsPayload.protective_factor_texts = protectiveFactorTexts;
    }

    const { error } = await supabase
      .from("client_cssrs")
      .upsert(cssrsPayload, { onConflict: "client_id" });

    if (error) {
      setCssrsStatus(feedbackMessages.saveFailed("C-SSRS record", error.message));
      setIsCssrsSaving(false);
      return;
    }

    await writeAuditLog?.(
      "C-SSRS",
      "Saved",
      "client_cssrs",
      clientId,
      clientName || "C-SSRS record",
      {
        summary: "Saved C-SSRS risk assessment.",
        client_id: clientId,
        client_name: clientName ?? null,
        positive_severity: positiveSeverity,
        behavior,
      }
    );

    await onCssrsSaved?.();

    setCssrsBaselineSnapshot(
      serializeCssrsFormState({
        ideationAnswers,
        behavior,
        demeanorSelections,
        demeanorOtherTexts,
        protectiveFactorTexts,
      })
    );
    setCssrsStatus(
      canEditProtectiveFactors
        ? feedbackMessages.saved("C-SSRS record")
        : "C-SSRS record saved. Protective Factor entries remain locked for your role."
    );
    setIsCssrsSaving(false);
  };

  return (
    <div className="panel cssrs-tab-panel">
      <div className="cssrs-sheet">
        {isReadOnly ? (
          <p className="dashboard-status-message">
            Your role can view C-SSRS records, but cannot add or edit them.
          </p>
        ) : isProtectiveFactorReadOnly ? (
          <p className="dashboard-status-message">
            Your role can edit C-SSRS through the Mental Status Interview section,
            but Protective Factor entries are locked.
          </p>
        ) : null}

        <section className="cssrs-title-card">
          <h3>COLUMBIA SUICIDE SEVERITY RATING SCALE (C-SSRS)</h3>

          <div className="cssrs-severity-badge">
            <span>Most severe marked</span>
            <strong>{positiveSeverity ? `Level ${positiveSeverity}` : "None yet"}</strong>
          </div>
        </section>

        {isCssrsDirty && !isReadOnly ? (
          <div className="cssrs-unsaved-banner" role="status">
            <div>
              <strong>Unsaved C-SSRS changes</strong>
              <span>Save before switching clients, tabs, or leaving the app.</span>
            </div>
            <button
              className="small-button"
              type="button"
              onClick={handleSaveCssrs}
              disabled={!clientId || isCssrsLoading || isCssrsSaving || isReadOnly}
            >
              {isCssrsSaving ? "Saving…" : "Save C-SSRS"}
            </button>
          </div>
        ) : null}

        <section className="cssrs-question-card">
          <div className="cssrs-question-header cssrs-question-header-merged">
            <h4 className="cssrs-question-heading cssrs-question-heading-merged cssrs-underlined-heading">
              Suicide ideation definitions and questions
              <span className="required-inline-note">Level 1 required</span>
            </h4>

            <div className="cssrs-past-month-label">Past Month</div>
            <div className="cssrs-grid-check cssrs-grid-check-head">YES</div>
            <div className="cssrs-grid-check cssrs-grid-check-head">NO</div>
          </div>

          <div className="cssrs-grid-table">

            {CSSRS_IDEATION_ITEMS.map((item) => (
              <div className="cssrs-grid-chunk" key={item.id}>
                <div className="cssrs-grid-row">
                  <div className="cssrs-grid-main">
                    <div className="cssrs-question-number">{item.number}.</div>

                    <div className="cssrs-question-copy">
                      <p className="cssrs-question-title">
                        {item.title}
                        {item.number === 1 ? (
                          <span className="required-marker" aria-hidden="true">*</span>
                        ) : null}
                      </p>
                      <p className="cssrs-question-prompt">{item.prompt}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`cssrs-check-cell ${item.toneClass} ${
                      ideationAnswers[item.id] === "yes" ? "is-selected" : ""
                    }`}
                    onClick={() => setIdeation(item.id, "yes")}
                    aria-pressed={ideationAnswers[item.id] === "yes"}
                    disabled={isReadOnly}
                  >
                    {ideationAnswers[item.id] === "yes" ? "✓" : ""}
                  </button>

                  <button
                    type="button"
                    className={`cssrs-check-cell ${
                      ideationAnswers[item.id] === "no"
                        ? "is-selected is-neutral"
                        : "is-neutral"
                    }`}
                    onClick={() => setIdeation(item.id, "no")}
                    aria-pressed={ideationAnswers[item.id] === "no"}
                    disabled={isReadOnly}
                  >
                    {ideationAnswers[item.id] === "no" ? "✓" : ""}
                  </button>
                </div>

                {item.id === "q2" ? (
                  <div className="cssrs-grid-note cssrs-grid-note-emphasis">
                    If YES to question 2, ask questions 3, 4 and 5. If NO to question
                    2, proceed to Behavior.
                  </div>
                ) : null}
              </div>
            ))}

            <div className="cssrs-grid-row cssrs-behavior-row">
              <div className="cssrs-grid-main cssrs-grid-main-behavior">
                <div className="cssrs-behavior-primary">
                  <div className="cssrs-question-number">6.</div>

                  <div className="cssrs-question-copy">
                    <p className="cssrs-question-title">
                      Suicidal Behavior (Check all that apply)
                    </p>
                    <p className="cssrs-question-prompt">
                      Have you done anything, started to do anything, or prepared to
                      do anything to end your life?
                    </p>
                  </div>
                </div>

                <div className="cssrs-grid-note cssrs-grid-note-inline">
                  <strong>If yes, ask:</strong>&nbsp; How long ago did you do any of
                  these?
                </div>
              </div>

              <div className="cssrs-stacked-checks">
                <div className="cssrs-check-group">
                  <span>Lifetime</span>

                  <div className="cssrs-pill-group">
                    <button
                      type="button"
                      className={`cssrs-mini-pill ${
                        behavior.lifetime === "yes" ? "is-active tone-high" : ""
                      }`}
                      onClick={() => setBehaviorValue("lifetime", "yes")}
                      disabled={isReadOnly}
                    >
                      YES
                    </button>

                    <button
                      type="button"
                      className={`cssrs-mini-pill ${
                        behavior.lifetime === "no"
                          ? "is-active is-neutral"
                          : "is-neutral"
                      }`}
                      onClick={() => setBehaviorValue("lifetime", "no")}
                      disabled={isReadOnly}
                    >
                      NO
                    </button>
                  </div>
                </div>

                <div className="cssrs-check-group cssrs-check-group-recent">
                  <span>Past 3 months</span>

                  <div className="cssrs-pill-group">
                    <button
                      type="button"
                      className={`cssrs-mini-pill ${
                        behavior.recent === "yes" ? "is-active tone-high" : ""
                      }`}
                      onClick={() => setBehaviorValue("recent", "yes")}
                      disabled={isReadOnly}
                    >
                      YES
                    </button>

                    <button
                      type="button"
                      className={`cssrs-mini-pill ${
                        behavior.recent === "no" ? "is-active is-neutral" : "is-neutral"
                      }`}
                      onClick={() => setBehaviorValue("recent", "no")}
                      disabled={isReadOnly}
                    >
                      NO
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="cssrs-secondary-stack">
          <article className="cssrs-card">
            <SectionHeader
              className="cssrs-card-header"
              title={
                <>
                  Mental Status Interview
                  <span className="required-inline-note">At least one required</span>
                </>
              }
              titleAs="h4"
              titleClassName="cssrs-underlined-heading"
            />

            <div className="cssrs-demeanor-columns">
              {CSSRS_DEMEANOR_GROUPS.map((group) => (
                <div className="cssrs-demeanor-column" key={group.title}>
                  <h5>{group.title}</h5>

                  <div className="cssrs-demeanor-list">
                    {group.items.map((item, index) => {
                      const selectionKey = buildCssrsDemeanorItemKey(group.title, index, item);
                      const isChecked = Boolean(demeanorSelections[selectionKey]);
                      const isOtherOption = item.toLowerCase().includes("others");

                      return (
                        <div
                          className={`cssrs-demeanor-option-wrap ${
                            isChecked ? "is-checked" : ""
                          }`}
                          key={selectionKey}
                        >
                          <label
                            className={`cssrs-demeanor-option ${
                              isChecked ? "is-checked" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="cssrs-demeanor-checkbox"
                              checked={isChecked}
                              onChange={() => toggleDemeanorSelection(selectionKey)}
                              disabled={isReadOnly}
                            />
                            <span>{isOtherOption ? "Others" : item}</span>
                          </label>

                          {isOtherOption && isChecked ? (
                            <input
                              type="text"
                              className="cssrs-demeanor-other-input"
                              value={demeanorOtherTexts[selectionKey] ?? ""}
                              onChange={(e) =>
                                setDemeanorOtherText(selectionKey, e.target.value)
                              }
                              placeholder="Please specify"
                              disabled={isReadOnly}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="cssrs-card">
            <SectionHeader
              className="cssrs-card-header"
              title="Risk Factors"
              titleAs="h4"
              titleClassName="cssrs-underlined-heading"
            />

            <div className="cssrs-risk-list">
              {CSSRS_RISK_FACTORS.map((factor) => (
                <div className="cssrs-risk-row" key={factor.label}>
                  <div className="cssrs-risk-label">{factor.label}</div>
                  <div className="cssrs-risk-description">{factor.description}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="cssrs-card">
            <SectionHeader
              className="cssrs-card-header"
              title="Intervention/Action"
              titleAs="h4"
              titleClassName="cssrs-underlined-heading"
            />

            <div className="cssrs-intervention-table">
              <div className="cssrs-intervention-row cssrs-intervention-subhead">
                <div className="cssrs-intervention-cell cssrs-intervention-subhead-cell">
                  Level
                </div>
                <div className="cssrs-intervention-cell cssrs-intervention-subhead-cell">
                  To be done by non mental health professional
                </div>
                <div className="cssrs-intervention-cell cssrs-intervention-subhead-cell">
                  To be done by guardian
                </div>
                <div className="cssrs-intervention-cell cssrs-intervention-subhead-cell">
                  To be done by mental health professional
                </div>
              </div>

              {CSSRS_INTERVENTION_ROWS.map((row) => (
                <div
                  className={`cssrs-intervention-row ${row.toneClass}`}
                  key={row.level}
                >
                  <div className="cssrs-intervention-cell">
                    <div className="cssrs-intervention-level">
                      <strong>{row.level}</strong>
                      <span>{row.descriptor}</span>
                    </div>
                  </div>

                  <div className="cssrs-intervention-cell">
                    {row.student.map((line) => (
                      <div key={line} className="cssrs-intervention-line">
                        {line}
                      </div>
                    ))}
                  </div>

                  <div className="cssrs-intervention-cell">
                    {row.guardian.map((line) => (
                      <div key={line} className="cssrs-intervention-line">
                        {line}
                      </div>
                    ))}
                  </div>

                  <div className="cssrs-intervention-cell">
                    {row.professional.map((line) => (
                      <div key={line} className="cssrs-intervention-line">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="cssrs-card">
            <SectionHeader
              className="cssrs-card-header"
              title="Protective Factor"
              titleAs="h4"
              titleClassName="cssrs-underlined-heading"
            />

            <div className="cssrs-protective-list">
              {CSSRS_PROTECTIVE_FACTORS.map((factor, index) => {
                const key = `${index + 1}-${factor}`;

                return (
                  <div className="cssrs-protective-item" key={key}>
                    <div className="cssrs-protective-heading">
                      <span className="cssrs-protective-number">{index + 1}.</span>
                      <span className="cssrs-protective-label">{factor}</span>
                    </div>

                    <textarea
                      className="cssrs-protective-textarea"
                      value={protectiveFactorTexts[key] ?? ""}
                      onChange={(e) => setProtectiveFactorText(key, e.target.value)}
                      placeholder=""
                      rows={4}
                      disabled={isProtectiveFactorReadOnly}
                    />
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <div className="cssrs-actions">
          <StatusMessage
            className="cssrs-status-message"
            message={
              cssrsStatus ||
              (isCssrsDirty && !isReadOnly ? feedbackMessages.unsavedChanges : "")
            }
          />

          <button
            className="small-button"
            type="button"
            onClick={handleSaveCssrs}
            disabled={!clientId || isCssrsLoading || isCssrsSaving || isReadOnly}
          >
            {isReadOnly ? "View Only" : isCssrsSaving ? "Saving…" : isCssrsLoading ? "Loading…" : "Save C-SSRS"}
          </button>
        </div>
      </div>
    </div>
  );
};
