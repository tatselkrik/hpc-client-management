export const SUPABASE_DEFAULT_PAGE_SIZE = 1000;

export type SupabasePageResponse<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export type SupabaseRangeQuery<T> = {
  range: (
    from: number,
    to: number
  ) => PromiseLike<SupabasePageResponse<T>>;
};

export async function fetchSupabasePages<T>(
  buildQuery: () => SupabaseRangeQuery<T>,
  pageSize = SUPABASE_DEFAULT_PAGE_SIZE
): Promise<SupabasePageResponse<T>> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("Page size must be a positive integer.");
  }
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery().range(from, to);

    if (error) {
      return { data: rows, error };
    }

    const page = data ?? [];
    rows.push(...page);

    // The server may cap responses below the requested page size. Only an
    // empty page proves exhaustion; advance by the actual number received.
    if (page.length === 0) {
      return { data: rows, error: null };
    }

    from += page.length;
  }
}
