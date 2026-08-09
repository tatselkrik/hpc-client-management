import type { WriteAuditLog } from "../../appShared";

export type YesNoValue = "yes" | "no" | null;

export type CssrsBehaviorValue = {
  lifetime: YesNoValue;
  recent: YesNoValue;
};

export type CssrsDemeanorSelectionMap = Record<string, boolean>;
export type CssrsDemeanorOtherTextMap = Record<string, string>;
export type CssrsProtectiveFactorTextMap = Record<string, string>;

export const CSSRS_IDEATION_ITEMS = [
  {
    id: "q1",
    number: 1,
    title: "Wish to be dead",
    prompt:
      "Have you wished you were dead or wished you could go to sleep and not wake up?",
    toneClass: "tone-low",
  },
  {
    id: "q2",
    number: 2,
    title: "Suicidal Thoughts",
    prompt: "Have you been thinking about how you might do this?",
    toneClass: "tone-low-mid",
  },
  {
    id: "q3",
    number: 3,
    title: "Suicidal Thoughts with Wethod (without specific Plan or Intent to Act)",
    prompt:
      "Have you been thinking about how you might do this?",
    toneClass: "tone-mid",
  },
  {
    id: "q4",
    number: 4,
    title: "Suicidal Intent (without specific plan)",
    prompt:
      "Have you had these thoughts and had some intention of acting on them?",
    toneClass: "tone-high",
  },
  {
    id: "q5",
    number: 5,
    title: "Suicidal Intent with Specific Plan",
    prompt:
      "Have you started to work out or worked out the details of how to kill yourself? Do you intend to carry out this plan?",
    toneClass: "tone-highest",
  },
] as const;

export const CSSRS_DEMEANOR_GROUPS = [
  {
    title: "Emotional State",
    items: [
      "numb",
      "irritable",
      "depressed",
      "angry",
      "anxious",
      "scared",
      "others ________",
    ],
  },
  {
    title: "Cognitive State",
    items: [
      "hopeless about future",
      "inflexible thinking",
      "auditory, visual, tactile hallucinations",
      "poor judgment",
      "blaming self",
      "confused",
      "unrealistic",
      "others ________",
    ],
  },
  {
    title: "Behavioral State",
    items: [
      "inactive/lazy",
      "abnormal movement (e.g. tic)",
      "agitated",
      "threatening",
      "impulsive",
      "risk-taking",
      "others ________",
    ],
  },
] as const;

export const CSSRS_RISK_FACTORS = [
  {
    label: "Ideation",
    description:
      "Expressed or communicated ideation\nThreatening to hurt or kill him/herself or talking of wanting to hurt or kill him/herself\nLooking for ways to kill him/herself by seeking acess to firearms, available pills or other means\nTalking or writing about death, dying, or suicide when these actions are out of the ordinary",
  },
  {
    label: "Substance Abuse",
    description: "Increased substance (alcohol or drug) use",
  },
  {
    label: "Purposelessness",
    description: "No reasons for living\nNo sense of purpose in life",
  },
  {
    label: "Anxiety",
    description: "Anxiety, agitation, unable to sleep or sleeping all the time",
  },
  {
    label: "Trapped",
    description: "Feeling trapped — like there's no way out",
  },
  {
    label: "Hopelessness",
    description: "Hopelessness",
  },
  {
    label: "Withdrawal",
    description: "Withdrawing from friends, family, and society",
  },
  {
    label: "Anger",
    description: "Rage, uncontrolled anger, seeking revenge",
  },
  {
    label: "Recklessness",
    description:
      "Acting reckless or engaging in risky activities, seemingly without thinking",
  },
  {
    label: "Mood changes",
    description: "Dramatic mood changes",
  },
] as const;

export const CSSRS_INTERVENTION_ROWS = [
  {
    level: "Mild",
    descriptor: "Close the gate",
    toneClass: "cssrs-intervention-row-mild",
    student: [
      "Perform an advanced assessment",
      "Do safety planning",
      "Follow-up periodically",
    ],
    guardian: ["Notify parents/guardian of the risk level"],
    professional: ["Can opt not yet to refer"],
  },
  {
    level: "Moderate",
    descriptor: "Open the gate",
    toneClass: "cssrs-intervention-row-moderate",
    student: [
      "Perform an advanced assessment",
      "Do safety planning",
      "Follow-up closely",
    ],
    guardian: [
      "Notify parents/guardian of the risk level",
      "Recommend removal of means",
      "Recommend non-emergency referral to professional",
    ],
    professional: ["Assist non-emergency referral with written or oral endorsement"],
  },
  {
    level: "Severe",
    descriptor: "Open the gate and bring them through",
    toneClass: "cssrs-intervention-row-severe",
    student: [
      "Perform an advanced assessment",
      "Do safety planning",
      "Ensure close watch for safety",
    ],
    guardian: [
      "Notify/guardian of risk level",
      "Recommend removal of means and 24/7 watch",
      "Recommend emergency referral to professional/hospital",
    ],
    professional: ["Assist emergency referral with oral endorsement"],
  },
] as const;

export const CSSRS_PROTECTIVE_FACTORS = [
  "Reasons for living.",
  "Support of family member/adult.",
  "Support of friends/peers.",
  "Skills, passion and interest.",
] as const;

export const createCssrsIdeationState = () =>
  Object.fromEntries(
    CSSRS_IDEATION_ITEMS.map((item) => [item.id, null as YesNoValue])
  );

export const buildCssrsDemeanorItemKey = (groupTitle: string, index: number, item: string) =>
  `${groupTitle}-${index}-${item}`;

export const buildCssrsNumberedItemKey = (index: number, item: string) =>
  `${index + 1}-${item}`;

export const createCssrsDemeanorSelectionState = (): CssrsDemeanorSelectionMap =>
  Object.fromEntries(
    CSSRS_DEMEANOR_GROUPS.flatMap((group) =>
      group.items.map((item, index) => [
        buildCssrsDemeanorItemKey(group.title, index, item),
        false,
      ] as const)
    )
  );

export const createCssrsDemeanorOtherTextState = (): CssrsDemeanorOtherTextMap =>
  Object.fromEntries(
    CSSRS_DEMEANOR_GROUPS.flatMap((group) =>
      group.items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.toLowerCase().includes("others"))
        .map(({ item, index }) => [
          buildCssrsDemeanorItemKey(group.title, index, item),
          "",
        ] as const)
    )
  );

export const createCssrsProtectiveFactorTextState = (): CssrsProtectiveFactorTextMap =>
  Object.fromEntries(
    CSSRS_PROTECTIVE_FACTORS.map((item, index) => [buildCssrsNumberedItemKey(index, item), ""] as const)
  );


export type CssrsClinicTabProps = {
  clientId: string;
  clientName?: string | null;
  writeAuditLog?: WriteAuditLog;
  onCssrsSaved?: () => void | Promise<void>;
  isReadOnly?: boolean;
  canEditProtectiveFactors?: boolean;
};

export const normalizeCssrsIdeationAnswers = (
  value?: Record<string, unknown> | null
): Record<string, YesNoValue> => {
  const next = createCssrsIdeationState();

  if (!value) return next;

  for (const key of Object.keys(next)) {
    const answer = value[key];
    if (answer === "yes" || answer === "no") {
      next[key] = answer;
    }
  }

  return next;
};

export const normalizeCssrsBehavior = (
  value?: Partial<Record<keyof CssrsBehaviorValue, unknown>> | null
): CssrsBehaviorValue => ({
  lifetime: value?.lifetime === "yes" || value?.lifetime === "no" ? value.lifetime : null,
  recent: value?.recent === "yes" || value?.recent === "no" ? value.recent : null,
});

export const normalizeCssrsDemeanorSelections = (
  value?: Record<string, unknown> | null
): CssrsDemeanorSelectionMap => {
  const next = createCssrsDemeanorSelectionState();

  if (!value) return next;

  for (const key of Object.keys(next)) {
    next[key] = value[key] === true;
  }

  return next;
};

export const normalizeCssrsDemeanorOtherTexts = (
  value?: Record<string, unknown> | null
): CssrsDemeanorOtherTextMap => {
  const next = createCssrsDemeanorOtherTextState();

  if (!value) return next;

  for (const key of Object.keys(next)) {
    next[key] = typeof value[key] === "string" ? String(value[key]).trim() : "";
  }

  return next;
};

export const normalizeCssrsProtectiveFactorTexts = (
  value?: Record<string, unknown> | null
): CssrsProtectiveFactorTextMap => {
  const next = createCssrsProtectiveFactorTextState();

  if (!value) return next;

  for (const key of Object.keys(next)) {
    next[key] = typeof value[key] === "string" ? String(value[key]) : "";
  }

  return next;
};

export const hasCompleteCssrsProtectiveFactorTexts = (
  value?: Record<string, unknown> | CssrsProtectiveFactorTextMap | null
) => {
  const normalized = normalizeCssrsProtectiveFactorTexts(value);

  return Object.values(normalized).every((text) => text.trim().length > 0);
};
