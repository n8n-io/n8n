/** v1's Simplify $select list — the exact trimmed fields v2 keeps returning; Get Many reuses it. */
export const LIST_SIMPLIFY_SELECT =
	'id,name,displayName,description,createdDateTime,lastModifiedDateTime,webUrl';

/** Shape shared by every Graph collection reply a listSearch method here consumes. */
export type GraphSearchReply<T> = { '@odata.nextLink'?: string; value?: T[] };
