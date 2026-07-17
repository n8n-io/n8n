import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/** v1's Simplify $select list — the exact trimmed fields v2 keeps returning; Get Many reuses it. */
export const LIST_SIMPLIFY_SELECT =
	'id,name,displayName,description,createdDateTime,lastModifiedDateTime,webUrl';

/**
 * Characters SharePoint forbids in file names. Sending any of these breaks
 * Graph's `:/name:/` addressing (a colon collapses the URL to the item entity
 * endpoint), so Graph rejects the upload with a misleading
 * `Entity only allows writes with a JSON Content-Type header` 400.
 *
 * Twin of the OneDrive node's validator; kept as a per-node copy until a
 * shared Microsoft helper with per-product wording exists.
 */
export const SHAREPOINT_ILLEGAL_FILE_NAME_CHARS = ['"', '*', ':', '<', '>', '?', '/', '\\', '|'];

/** Graph's cap for a single-request `PUT …:/content` upload; larger files need an upload session. */
export const MAX_SIMPLE_UPLOAD_BYTES = 250 * 1024 * 1024;

/**
 * Validates an upload file name before any Graph request is made. Throws a
 * `NodeOperationError` (carrying `itemIndex`) when the name is missing, blank,
 * or contains a character SharePoint doesn't allow, naming the offending
 * character(s) and suggesting a fix. The assertion signature narrows the name
 * to `string` for callers once it returns.
 */
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
