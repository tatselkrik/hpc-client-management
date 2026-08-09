import type {
  Client4PsForm,
  FourPsRowKey,
} from "../../appShared";
import {
  FOUR_PS_FACTORS,
  FOUR_PS_ROWS,
} from "../../appShared";

export const CLIENT_4PS_NARRATIVE_PROMPT_VERSION = "4ps-narrative-v3";

export const getClient4PsRowFilledFieldCount = (
  form: Client4PsForm,
  rowKey: FourPsRowKey
) =>
  FOUR_PS_FACTORS.reduce(
    (factorTotal, factor) =>
      factorTotal + (form[rowKey][factor.key].trim() ? 1 : 0),
    0
  );

export const getClient4PsFilledFieldCount = (form: Client4PsForm) =>
  FOUR_PS_ROWS.reduce(
    (rowTotal, row) => rowTotal + getClient4PsRowFilledFieldCount(form, row.key),
    0
  );

export const getClient4PsMissingRequiredRowLabels = (form: Client4PsForm) =>
  FOUR_PS_ROWS.filter((row) => getClient4PsRowFilledFieldCount(form, row.key) === 0)
    .map((row) => row.label);

export const hasCompleteClient4PsRows = (form: Client4PsForm) =>
  getClient4PsMissingRequiredRowLabels(form).length === 0;

export const stripNarrativeReportHeading = (value: string) =>
  value
    .trim()
    .replace(/^#{1,6}\s*Narrative Report\s*\n+/i, "")
    .replace(/^\*\*Narrative Report\*\*\s*\n+/i, "")
    .replace(/^Narrative Report\s*\n+/i, "")
    .trim();
