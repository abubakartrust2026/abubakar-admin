// Escape user input before using it inside a MongoDB $regex (prevents regex injection / ReDoS)
export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Parse & clamp page/limit query params
export const parsePagination = (query, defaultLimit = 10, maxLimit = 500) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};
