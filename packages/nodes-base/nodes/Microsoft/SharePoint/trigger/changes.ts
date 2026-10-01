import type { IDataObject } from 'n8n-workflow';

export const TRIGGER_EVENTS = ['changed', 'deleted'] as const;

export type SharePointEvent = (typeof TRIGGER_EVENTS)[number];

/** Which delta feed an entry came from. The two describe themselves differently. */
export type DeltaFeed = 'driveItem' | 'listItem';

/**
 * A folder is never reported, on either feed, and has to be recognised while
 * dead as well as alive. The drive feed keeps the `folder` facet on a
 * tombstone even though a deleted file loses its `file` one; the list feed
 * carries no facets at all and names the content type instead.
 */
function isFolder(entry: IDataObject, feed: DeltaFeed): boolean {
	if (feed === 'driveItem') return entry.folder !== undefined;
	return (entry.contentType as { name?: string } | undefined)?.name === 'Folder';
}

/**
 * Classifies one delta entry, or returns undefined to drop it.
 *
 * Neither feed carries a change type, so `changed` covers created, edited,
 * renamed, moved and metadata-only edits alike.
 */
export function classifyEntry(entry: IDataObject, feed: DeltaFeed): SharePointEvent | undefined {
	if (isFolder(entry, feed)) return undefined;

	// The presence of the key, never its contents: the drive feed sends `{}`
	// and only the list feed sends `{ state: 'deleted' }`, so a test on
	// `deleted.state` would silently miss every delete on the drive feed.
	if (entry.deleted !== undefined) return 'deleted';

	// The drive feed also carries the root and ancestor entries, which have no
	// `file` facet. The list feed carries list items, which have no facet at all.
	return feed === 'listItem' || entry.file !== undefined ? 'changed' : undefined;
}

/** Keeps the last entry per id, as both feeds' Remarks instruct. */
export function collapseById(entries: IDataObject[]): IDataObject[] {
	const byId = new Map<string, IDataObject>();
	const unkeyed: IDataObject[] = [];

	for (const entry of entries) {
		// Every documented entry carries an id. One that does not cannot be
		// collapsed, and dropping it would lose a change, so it passes through.
		if (typeof entry.id === 'string' && entry.id !== '') byId.set(entry.id, entry);
		else unkeyed.push(entry);
	}

	return [...byId.values(), ...unkeyed];
}

/** Collapses a drain, then keeps the entries whose event the user asked for. */
export function selectChanges(
	entries: IDataObject[],
	events: SharePointEvent[],
	feed: DeltaFeed,
): IDataObject[] {
	const wanted = new Set(events);

	return collapseById(entries).filter((entry) => {
		const event = classifyEntry(entry, feed);
		return event !== undefined && wanted.has(event);
	});
}
