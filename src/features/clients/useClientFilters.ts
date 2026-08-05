import { useMemo } from "react";

import type { ClientListItem, ClientMetadata, ClientStatus, SortMode } from "../../appShared";
import {
  MONTH_OPTIONS,
  formatCategoryPath,
  getClientGroupLabel,
  getClientGroupSortValue,
} from "../../appShared";

export type ClientFilterRow = ClientListItem & ClientMetadata;

export type UseClientFiltersArgs = {
  clientRows: ClientFilterRow[];
  categoryOptions: string[];
  clientSearch: string;
  clientSort: SortMode;
  clientStatusFilter: "all" | ClientStatus;
  clientCategoryFilter: string;
  clientYearFilter: string;
  clientMonthFilter: string;
};

export function useClientFilters({
  clientRows,
  categoryOptions,
  clientSearch,
  clientSort,
  clientStatusFilter,
  clientCategoryFilter,
  clientYearFilter,
  clientMonthFilter,
}: UseClientFiltersArgs) {
  const availableClientCategories = useMemo(
    () =>
      Array.from(
        new Set<string>([
          ...categoryOptions,
          ...clientRows.map((client) => formatCategoryPath(client.category_path)),
        ])
      ).sort((a, b) => a.localeCompare(b)),
    [categoryOptions, clientRows]
  );

  const availableClientYears = useMemo(
    () =>
      Array.from(
        new Set<string>(
          clientRows
            .map((client) => client.intake_year.trim())
            .filter((value) => value !== "")
        )
      ).sort((a, b) => Number(b) - Number(a)),
    [clientRows]
  );

  const availableClientMonths = useMemo(
    () =>
      MONTH_OPTIONS.filter((month) =>
        clientRows.some((client) => client.intake_month === month)
      ),
    [clientRows]
  );

  const filteredClients = useMemo(() => {
    const search = clientSearch.trim().toLowerCase();

    const filtered = clientRows.filter((client) => {
      const reasons = Array.isArray(client.counselling_reasons)
        ? client.counselling_reasons
        : [];
      const searchableText = [
        client.client_name ?? "",
        client.mobile_number ?? "",
        client.email ?? "",
        formatCategoryPath(client.category_path),
        ...reasons,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = search === "" || searchableText.includes(search);
      const matchesStatus =
        clientStatusFilter === "all" || client.status === clientStatusFilter;
      const matchesCategory =
        clientCategoryFilter === "all" ||
        formatCategoryPath(client.category_path) === clientCategoryFilter;
      const matchesYear =
        clientYearFilter === "all" || client.intake_year === clientYearFilter;
      const matchesMonth =
        clientMonthFilter === "all" || client.intake_month === clientMonthFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesYear &&
        matchesMonth
      );
    });

    return [...filtered].sort((a, b) => {
      if (clientSort === "alphabetical") {
        return (a.client_name ?? "").localeCompare(b.client_name ?? "");
      }
      if (clientSort === "last_created") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [
    clientRows,
    clientSearch,
    clientSort,
    clientStatusFilter,
    clientCategoryFilter,
    clientYearFilter,
    clientMonthFilter,
  ]);

  const groupedClients = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        sortValue: number;
        clients: typeof filteredClients;
      }
    >();

    filteredClients.forEach((client) => {
      const label = getClientGroupLabel(client);
      const existing = groups.get(label);

      if (existing) {
        existing.clients.push(client);
        return;
      }

      groups.set(label, {
        label,
        sortValue: getClientGroupSortValue(client),
        clients: [client],
      });
    });

    return [...groups.values()].sort((a, b) => b.sortValue - a.sortValue);
  }, [filteredClients]);

  const filteredClientSummary = useMemo(
    () => ({
      total: filteredClients.length,
      active: filteredClients.filter((client) => client.status === "Active").length,
      terminated: filteredClients.filter((client) => client.status === "Terminated").length,
    }),
    [filteredClients]
  );

  return {
    availableClientCategories,
    availableClientYears,
    availableClientMonths,
    filteredClients,
    groupedClients,
    filteredClientSummary,
  };
}
