// No client rows, identifiers, free text, exact ages or linked clinical profiles
// leave the app. Suppress the whole distribution if any group has fewer than 5
// clients, avoiding a complementary count that reveals a hidden small group.
export function buildProtectedAnalyticsCsv(headers: string[], rows: Array<Array<string | number>>, escape: (value: string | number) => string, reportingPeriod = "Selected view") {
  const output: Array<Array<string | number>> = [["generated_at", "dimension", "group", "client_count", "privacy_note", "reporting_period"]];
  const generated = rows[0]?.[headers.indexOf("export_generated_at")] ?? new Date().toISOString();
  const note = "Confidential grouped statistics. Small groups are suppressed; this is not a guarantee of anonymity.";
  for (const dimension of ["client_status", "age_band", "sex", "pre_existing_psychiatric_diagnosis_present", "four_ps_complete", "narrative_report_present"]) {
    const index = headers.indexOf(dimension); if (index < 0) continue;
    const groups = new Map<string, number>();
    for (const row of rows) {
      let group = String(row[index] ?? "Not recorded");
      if (dimension === "sex" && !["Male", "Female", "Other"].includes(group)) group = "Other / not recorded";
      if (dimension === "client_status" && !["Active", "Terminated"].includes(group)) group = "Other / not recorded";
      groups.set(group, (groups.get(group) ?? 0) + 1);
    }
    if (!groups.size) output.push([generated,dimension,"No records",0,note]);
    else if ([...groups.values()].some((count) => count < 5)) output.push([generated,dimension,"Small groups suppressed","Suppressed",note]);
    else for (const [group,count] of groups) output.push([generated,dimension,group,count,note]);
  }
  return output.map((row, index) => (index ? [...row, reportingPeriod] : row).map(escape).join(",")).join("\n");
}
