import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/** v1's Simplify $select list — the exact trimmed fields v2 keeps returning; Get Many reuses it. */
export const LIST_SIMPLIFY_SELECT =
	'id,name,displayName,description,createdDateTime,lastModifiedDateTime,webUrl';

/** v1's item Simplify $select list — the trimmed top-level fields v2 keeps for an item Get. */
export const ITEM_SIMPLIFY_SELECT = 'id,createdDateTime,lastModifiedDateTime,webUrl';

/**
 * Validates and trims a value used verbatim as a URL path segment (a list or
 * item ID/title). Rejects empty, `.` and `..` — each would change the request
 * shape (`/items/` → the collection, `/items/.` → the collection, `/items/..`
 * → the parent list) instead of addressing one resource.
 */
export function assertPathSegment(node: INode, value: string, paramName: string): string {
	const trimmed = value.trim();
	if (trimmed === '') {
		throw new NodeOperationError(node, `The '${paramName}' parameter is empty`, {
			description: `Set the ${paramName.toLowerCase()} and try again.`,
		});
	}
	if (trimmed === '.' || trimmed === '..') {
		throw new NodeOperationError(node, `The '${paramName}' value '${trimmed}' is not valid`, {
			description: `Set a specific ${paramName.toLowerCase()} and try again.`,
		});
	}
	return trimmed;
}

/** Shape shared by every Graph collection reply a listSearch method here consumes. */
export type GraphSearchReply<T> = { '@odata.nextLink'?: string; value?: T[] };

/** Characters SharePoint forbids in file names; Graph rejects them with a misleading 400. */
export const SHAREPOINT_ILLEGAL_FILE_NAME_CHARS = ['"', '*', ':', '<', '>', '?', '/', '\\', '|'];

/** Graph's cap for a single-request `PUT …:/content` upload; larger files need an upload session. */
export const MAX_SIMPLE_UPLOAD_BYTES = 250 * 1024 * 1024;

export function validateSharePointFileName(
	node: INode,
	fileName: string | undefined,
	itemIndex: number,
): asserts fileName is string {
	if (fileName === undefined || fileName.trim() === '') {
		throw new NodeOperationError(node, 'File name must be set!', { itemIndex });
	}

	const illegalChars = SHAREPOINT_ILLEGAL_FILE_NAME_CHARS.filter((char) => fileName.includes(char));
	if (illegalChars.length > 0) {
		throw new NodeOperationError(
			node,
			`The file name "${fileName}" contains characters that SharePoint doesn't allow: ${illegalChars.join(' ')}`,
			{
				itemIndex,
				description:
					`SharePoint file names can't contain any of these characters: ${SHAREPOINT_ILLEGAL_FILE_NAME_CHARS.join(' ')}. Remove them from the file name and try again.` +
					(illegalChars.includes(':')
						? " If you're inserting a timestamp, use a colon-free format such as {{ $now.toFormat('yyyy-MM-dd_HH-mm-ss') }}."
						: ''),
			},
		);
	}
}
