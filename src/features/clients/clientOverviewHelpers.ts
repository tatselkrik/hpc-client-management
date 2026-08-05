export const serializeClientOverviewState = (
  clientForm: unknown,
  childrenForms: unknown
) =>
  JSON.stringify({
    clientForm,
    childrenForms,
  });

export const formatClientSummaryDate = (value: string | null | undefined) => {
  if (!value) return "Not set";

  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return "Not set";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
