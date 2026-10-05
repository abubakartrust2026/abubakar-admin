// Escapes regex metacharacters in user-supplied search input before it is
// used to build a $regex query, preventing both regex-injection and
// catastrophic-backtracking (ReDoS) via a crafted search string.
export const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
