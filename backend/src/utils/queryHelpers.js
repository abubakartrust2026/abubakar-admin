// Copy only the listed keys from a request body (guards against mass assignment)
export const pick = (obj, keys) => {
  const out = {};
  keys.forEach((k) => {
    if (obj && obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
};

// Parse & clamp page/limit query params
export const parsePagination = (query, defaultLimit = 10, maxLimit = 500) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};
