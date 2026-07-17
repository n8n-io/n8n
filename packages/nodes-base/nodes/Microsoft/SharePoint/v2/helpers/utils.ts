/** v1's Simplify $select list — the exact trimmed fields v2 keeps returning; Get Many reuses it. */
export const LIST_SIMPLIFY_SELECT =
	'id,name,displayName,description,createdDateTime,lastModifiedDateTime,webUrl';

// Copy of v1's escapeFilterValue — each version keeps its own helpers/, matching the v1/v2 split.
export const escapeODataFilterValue = (value: string) => value.replaceAll("'", "''");

/** Shape shared by every Graph collection reply a listSearch method here consumes. */
export type GraphSearchReply<T> = { '@odata.nextLink'?: string; value?: T[] };
