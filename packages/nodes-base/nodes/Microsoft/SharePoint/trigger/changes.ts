import type { IDataObject } from 'n8n-workflow';

export const TRIGGER_EVENTS = ['changed', 'deleted'] as const;

export type SharePointEvent = (typeof TRIGGER_EVENTS)[number];

/**
 * Classifies one delta entry, or returns undefined to drop it.
 *
 * The feed carries no change type, so `changed` covers created, edited,
 * renamed, moved and metadata-only edits alike. A delete is the presence of
 * the `deleted` key. Its contents are never read: the drive feed sends `{}`
 * and only the list feed sends `{ state: 'deleted' }`, so a test on
 * `deleted.state` would silently miss every delete on the drive feed.
 */
export function classifyEntry(entry: IDataObject): SharePointEvent | undefined {
	if (entry.deleted !== undefined) {
		// A deleted folder keeps its `folder` facet, while a deleted file loses
		// its `file` one, so the facet test has to run the other way round here.
		return entry.folder === undefined ? 'deleted' : undefined;
	}
	// Folders, the drive root and ancestor entries all arrive on the feed.
	return entry.file === undefined ? undefined : 'changed';
}

/** Keeps the last entry per id, as the delta Remarks instruct. */
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
export function selectChanges(entries: IDataObject[], events: SharePointEvent[]): IDataObject[] {
	const wanted = new Set(events);

	return collapseById(entries).filter((entry) => {
		const event = classifyEntry(entry);
		return event !== undefined && wanted.has(event);
	});
}
