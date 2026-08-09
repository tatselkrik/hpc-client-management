import type {
  Client4PsForm,
  ClientListItem,
  ClientMetadata,
  ClientStatus,
} from "./clientTypes";
import type {
  CssrsBehaviorValue,
  CssrsDemeanorSelectionMap,
  CssrsProtectiveFactorTextMap,
  YesNoValue,
} from "../features/cssrs/cssrsDomain";

export type IntakeTimelineGrouping = "month" | "year";
export type IntakeMonthRange = "6M" | "12M" | "THIS_YEAR" | "ALL";
export type IntakeYearRange = "3Y" | "5Y" | "THIS_YEAR" | "ALL";
export type AnalyticsDateRange = "LAST_30_DAYS" | "LAST_90_DAYS" | "THIS_YEAR" | "CUSTOM" | "ALL";
export type AnalyticsDateBasis = "intake" | "created";
export type AnalyticsStatusFilter = "all" | ClientStatus;
export type AnalyticsCategoryFilter = string;
export type AnalyticsCssrsRiskFilter =
  | "all"
  | "pending"
  | "completed"
  | "elevated"
  | "recent_behavior"
  | "severity_4_5";

export type AnalyticsDrilldownClient = {
  id: string;
  client_name: string | null;
  status: ClientStatus;
  category_path: string;
  intake_date: string | null;
  counselling_reasons: string[];
  cssrs_risk_label: string;
};

export type AnalyticsDataQualityItem = {
  label: string;
  value: number;
  denominator?: number;
  helpText: string;
  clients?: AnalyticsDrilldownClient[];
};

export type AnalyticsOperationalMetric = {
  label: string;
  value: string;
  helpText: string;
  clients?: AnalyticsDrilldownClient[];
};

export type AnalyticsClientDrilldownGroup = {
  title: string;
  emptyLabel: string;
  clients: AnalyticsDrilldownClient[];
};

export type AnalyticsFilterOption = { value: string; label: string };

export type AnalyticsClientInsight = {
  id: string;
  client_name: string | null;
  age: number | null;
  sex: string | null;
  intake_source?: string | null;
  sibling_order?: string | null;
  sexual_orientation?: string | null;
  marital_status?: string | null;
  educational_attainment?: string | null;
  employment_status?: string | null;
  occupation?: string | null;
  partner_age?: number | null;
  partner_sexual_orientation?: string | null;
  years_together?: number | null;
  partner_educational_attainment?: string | null;
  partner_employment_status?: string | null;
  pre_existing_psychiatric_diagnosis: string | null;
  pre_existing_psychiatric_diagnosis_details?: string | null;
  hpc_representative: string | null;
  intake_date: string | null;
  client_status: ClientStatus | null;
  category_path: string | null;
  created_at: string;
  updated_at: string;
  counselling_reasons: string[] | null;
};

export type AnalyticsClientRow = ClientListItem &
  ClientMetadata & {
    client_name: string | null;
    created_at: string;
    updated_at: string;
    intake_date: string | null;
    counselling_reasons: string[];
  };

export type AnalyticsActivityRecord = {
  id: string;
  client_id: string | null;
  created_at: string;
};

export type AnalyticsCssrsInsight = {
  client_id: string;
  positive_severity: number | null;
  behavior: CssrsBehaviorValue;
  ideation_answers: Record<string, YesNoValue>;
  demeanor_selections: CssrsDemeanorSelectionMap;
  protective_factor_texts: CssrsProtectiveFactorTextMap;
  updated_at: string;
};

export type AnalyticsClient4PsInsight = {
  client_id: string;
  form: Client4PsForm;
  narrative_report: string | null;
  created_at: string;
  updated_at: string;
};
