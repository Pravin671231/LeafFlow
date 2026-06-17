export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(
  query: { page?: unknown; limit?: unknown },
  defaultLimit = 20
): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || defaultLimit);
  return { page, limit, skip: (page - 1) * limit };
}
