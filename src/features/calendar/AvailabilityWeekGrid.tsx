import type { CSSProperties, ReactNode } from "react";
import type {
  CareTeamAvailability,
  CareTeamAvailabilityOverride,
  CareTeamMemberView,
  ClinicHours,
} from "../../appShared";
import { formatCalendarDate, fromDateKey, todayPhilippineDateKey } from "./calendarDate";

export type AvailabilityBlockDetail = {
  id: string;
  providerId: string;
  providerName: string;
  source: "weekly" | "dated";
  note: string | null;
};

export type AvailabilityBlockSelection = {
  id: string;
  date: string;
  startsAt: string;
  endsAt: string;
  kind: "available" | "unavailable";
  entries: AvailabilityBlockDetail[];
};

type AvailabilityWeekGridProps = {
  dates: string[];
  providers: CareTeamMemberView[];
  clinicHours: ClinicHours[];
  availability: CareTeamAvailability[];
  overrides: CareTeamAvailabilityOverride[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  onSelectBlock?: (block: AvailabilityBlockSelection) => void;
  onRemoveOverride?: (id: string) => void;
  isBusy?: boolean;
  showProviderNames?: boolean;
  groupProviderBlocks?: boolean;
};

type TimelineBlock = AvailabilityBlockSelection & {
  sourceClass: "weekly" | "dated" | "mixed";
  laneIndex: number;
  laneCount: number;
};

export const clinicianDisplayName = (provider: CareTeamMemberView) => {
  const representativeName = provider.hpc_representative_name?.trim();
  const accountName = provider.full_name.trim();
  if (!representativeName) return accountName || "Clinician";
  if (!accountName || accountName.toLowerCase() === representativeName.toLowerCase()) {
    return representativeName;
  }
  return `${representativeName} (${accountName})`;
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
};

const minuteLabel = (minute: number) => {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
};

const assignOverlapLanes = (blocks: Omit<TimelineBlock, "laneIndex" | "laneCount">[]) => {
  const sorted = [...blocks].sort(
    (left, right) =>
      timeToMinutes(left.startsAt) - timeToMinutes(right.startsAt) ||
      timeToMinutes(left.endsAt) - timeToMinutes(right.endsAt)
  );
  const laneEnds: number[] = [];
  const withLanes = sorted.map((block) => {
    const startsAt = timeToMinutes(block.startsAt);
    let laneIndex = laneEnds.findIndex((laneEnd) => laneEnd <= startsAt);
    if (laneIndex < 0) {
      laneIndex = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[laneIndex] = timeToMinutes(block.endsAt);
    return { ...block, laneIndex, laneCount: 1 };
  });
  const laneCount = Math.max(1, laneEnds.length);
  return withLanes.map((block) => ({ ...block, laneCount }));
};

export function AvailabilityWeekGrid({
  dates,
  providers,
  clinicHours,
  availability,
  overrides,
  selectedDate,
  onSelectDate,
  onSelectBlock,
  onRemoveOverride,
  isBusy = false,
  showProviderNames = false,
  groupProviderBlocks = false,
}: AvailabilityWeekGridProps) {
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const rawBlocks: AvailabilityBlockSelection[] = [];

  dates.forEach((date) => {
    const weekday = fromDateKey(date).getDay();
    availability
      .filter(
        (entry) =>
          entry.weekday === weekday &&
          entry.is_active &&
          providerById.has(entry.profile_id)
      )
      .forEach((entry) => {
        const provider = providerById.get(entry.profile_id)!;
        rawBlocks.push({
          id: `weekly-${date}-${entry.id}`,
          date,
          startsAt: entry.starts_at,
          endsAt: entry.ends_at,
          kind: "available",
          entries: [{
            id: entry.id,
            providerId: entry.profile_id,
            providerName: clinicianDisplayName(provider),
            source: "weekly",
            note: null,
          }],
        });
      });
  });

  overrides
    .filter(
      (entry) => dates.includes(entry.availability_date) && providerById.has(entry.profile_id)
    )
    .forEach((entry) => {
      const provider = providerById.get(entry.profile_id)!;
      rawBlocks.push({
        id: entry.id,
        date: entry.availability_date,
        startsAt: entry.starts_at,
        endsAt: entry.ends_at,
        kind: entry.availability_kind,
        entries: [{
          id: entry.id,
          providerId: entry.profile_id,
          providerName: clinicianDisplayName(provider),
          source: "dated",
          note: entry.note,
        }],
      });
    });

  const displayBlocksByDate = new Map<string, TimelineBlock[]>();
  dates.forEach((date) => {
    const dayRawBlocks = rawBlocks.filter((block) => block.date === date);
    const dayBlocks = groupProviderBlocks
      ? Array.from(
          dayRawBlocks.reduce((groups, block) => {
            const groupKey = [block.date, block.startsAt, block.endsAt, block.kind].join("|");
            const current = groups.get(groupKey);
            if (current) {
              current.entries.push(...block.entries);
            } else {
              groups.set(groupKey, { ...block, id: `group-${groupKey}` });
            }
            return groups;
          }, new Map<string, AvailabilityBlockSelection>()).values()
        )
      : dayRawBlocks;

    const withSource = dayBlocks.map((block) => {
      const sources = new Set(block.entries.map((entry) => entry.source));
      return {
        ...block,
        entries: [...block.entries].sort((left, right) =>
          left.providerName.localeCompare(right.providerName)
        ),
        sourceClass: sources.size > 1
          ? "mixed" as const
          : block.entries[0]?.source ?? "dated" as const,
      };
    });
    displayBlocksByDate.set(date, assignOverlapLanes(withSource));
  });

  const blocks = Array.from(displayBlocksByDate.values()).flat();
  const openMinutes = clinicHours
    .filter((day) => day.is_open && day.opens_at)
    .map((day) => timeToMinutes(day.opens_at!));
  const closeMinutes = clinicHours
    .filter((day) => day.is_open && day.closes_at)
    .map((day) => timeToMinutes(day.closes_at!));
  const blockStarts = blocks.map((block) => timeToMinutes(block.startsAt));
  const blockEnds = blocks.map((block) => timeToMinutes(block.endsAt));
  const timelineStart = Math.max(
    0,
    Math.floor(Math.min(8 * 60, ...openMinutes, ...blockStarts) / 60) * 60
  );
  const timelineEnd = Math.min(
    24 * 60,
    Math.ceil(Math.max(18 * 60, ...closeMinutes, ...blockEnds) / 60) * 60
  );
  const timelineSpan = Math.max(60, timelineEnd - timelineStart);
  const hourMarkers = Array.from(
    { length: Math.floor(timelineSpan / 60) + 1 },
    (_, index) => timelineStart + index * 60
  );

  const blockStyle = (block: TimelineBlock): CSSProperties => {
    const start = Math.max(timelineStart, timeToMinutes(block.startsAt));
    const end = Math.min(timelineEnd, timeToMinutes(block.endsAt));
    const horizontalInset = 3;
    return {
      top: `${((start - timelineStart) / timelineSpan) * 100}%`,
      height: `${Math.max(2.4, ((end - start) / timelineSpan) * 100)}%`,
      left: `calc(${(block.laneIndex / block.laneCount) * 100}% + ${horizontalInset}px)`,
      width: `calc(${100 / block.laneCount}% - ${horizontalInset * 2}px)`,
    };
  };

  const blockContents = (block: TimelineBlock): ReactNode => {
    const sourceLabel = block.entries.every((entry) => entry.source === "weekly")
      ? "Regular hours"
      : block.entries.every((entry) => entry.source === "dated")
        ? block.kind === "unavailable" ? "Unavailable" : "Dated availability"
        : "Regular and dated";
    return (
      <>
        <strong>{block.startsAt.slice(0, 5)}–{block.endsAt.slice(0, 5)}</strong>
        {groupProviderBlocks ? (
          <span>{block.entries.length} clinician{block.entries.length === 1 ? "" : "s"}</span>
        ) : showProviderNames ? (
          <span>{block.entries[0]?.providerName}</span>
        ) : null}
        <small>{sourceLabel}</small>
        {!groupProviderBlocks && block.entries[0]?.note ? (
          <small>{block.entries[0].note}</small>
        ) : null}
      </>
    );
  };

  const blockTitle = (block: TimelineBlock) =>
    `${block.entries.map((entry) => entry.providerName).join(", ")}: ${block.startsAt.slice(0, 5)}–${block.endsAt.slice(0, 5)}`;

  return (
    <div className="availability-week-scroll">
      <div
        className="availability-week-grid"
        style={{
          gridTemplateColumns: `58px repeat(${Math.max(1, dates.length)}, minmax(142px, 1fr))`,
        }}
      >
        <div className="availability-week-corner" aria-hidden="true" />
        {dates.map((date) => (
          <button
            key={date}
            type="button"
            className={`availability-day-header${date === todayPhilippineDateKey() ? " today" : ""}${date === selectedDate ? " selected" : ""}`}
            onClick={() => onSelectDate?.(date)}
            disabled={!onSelectDate}
          >
            <span>{formatCalendarDate(date, { weekday: "short" })}</span>
            <strong>{formatCalendarDate(date, { month: "short", day: "numeric" })}</strong>
            {onSelectDate ? <small>Set time</small> : null}
          </button>
        ))}

        <div className="availability-time-rail">
          {hourMarkers.map((minute) => (
            <span
              key={minute}
              style={{ top: `${((minute - timelineStart) / timelineSpan) * 100}%` }}
            >
              {minuteLabel(minute)}
            </span>
          ))}
        </div>

        {dates.map((date) => {
          const dayBlocks = displayBlocksByDate.get(date) ?? [];
          return (
            <div key={date} className="availability-day-lane">
              {hourMarkers.map((minute) => (
                <span
                  key={minute}
                  className="availability-hour-line"
                  style={{ top: `${((minute - timelineStart) / timelineSpan) * 100}%` }}
                />
              ))}
              {dayBlocks.map((block) =>
                onSelectBlock ? (
                  <button
                    key={block.id}
                    type="button"
                    className={`availability-time-block is-clickable ${block.kind} ${block.sourceClass}`}
                    style={blockStyle(block)}
                    title={`${blockTitle(block)} · Open details`}
                    aria-label={`${blockTitle(block)}. Open availability details.`}
                    onClick={() => onSelectBlock(block)}
                  >
                    {blockContents(block)}
                  </button>
                ) : (
                  <article
                    key={block.id}
                    className={`availability-time-block ${block.kind} ${block.sourceClass}`}
                    style={blockStyle(block)}
                    title={blockTitle(block)}
                  >
                    {blockContents(block)}
                    {block.entries[0]?.source === "dated" && onRemoveOverride ? (
                      <button
                        type="button"
                        aria-label={`Remove ${block.kind} block on ${formatCalendarDate(date)}`}
                        disabled={isBusy}
                        onClick={() => onRemoveOverride(block.entries[0].id)}
                      >
                        ×
                      </button>
                    ) : null}
                  </article>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
