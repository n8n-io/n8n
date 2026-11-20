/**
 * n8n hands a `fixedCollection` back in more than one shape depending on how it
 * was filled in, so every reader goes through here rather than indexing it.
 */
import type { IDataObject } from 'n8n-workflow';

export function getCollectionEntries(
	value: Record<string, unknown> | IDataObject | undefined,
	collectionName: string,
): unknown[] {
	const direct = value?.[collectionName];

	if (Array.isArray(direct)) {
		return direct;
	}

	if (direct && typeof direct === 'object') {
		const directObject = direct as IDataObject;
		const named = directObject[collectionName];

		if (Array.isArray(named)) {
			return named;
		}

		for (const candidate of Object.values(directObject)) {
			if (Array.isArray(candidate)) {
				return candidate;
			}
		}
	}

	return [];
}
