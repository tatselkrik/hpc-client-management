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

    if (page.length < pageSize) {
      return { data: rows, error: null };
    }

    from += pageSize;
  }
}
