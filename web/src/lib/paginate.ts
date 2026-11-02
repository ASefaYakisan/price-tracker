export type PageResult<T> = { items: T[]; total: number; limit: number; offset: number };

export const MAX_LIMIT = 200;
export const DEFAULT_LIMIT = 100;

/** Parse `limit` and `offset` query values. Returns an error message for invalid input. */
export function parsePaging(limitRaw: string | null, offsetRaw: string | null): { limit: number; offset: number } | { error: string } {
  const limit = limitRaw === null ? DEFAULT_LIMIT : Number(limitRaw);
  if (limitRaw === "" || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return { error: `limit must be an integer from 1 to ${MAX_LIMIT}` };
  }
  const offset = offsetRaw === null ? 0 : Number(offsetRaw);
  if (offsetRaw === "" || !Number.isInteger(offset) || offset < 0) {
    return { error: "offset must be an integer of 0 or more" };
  }
  return { limit, offset };
}

/** Slice an already filtered list; `total` is the filtered size before slicing. */
export function paginate<T>(all: T[], limit: number, offset: number): PageResult<T> {
  return { items: all.slice(offset, offset + limit), total: all.length, limit, offset };
}
