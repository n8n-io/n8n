import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';

/** v1's Simplify $select list — the exact trimmed fields v2 keeps returning; Get Many reuses it. */
export const LIST_SIMPLIFY_SELECT =
	'id,name,displayName,description,createdDateTime,lastModifiedDateTime,webUrl';

/** v1's item Simplify $select list — the trimmed top-level fields v2 keeps for an item Get. */
export const ITEM_SIMPLIFY_SELECT = 'id,createdDateTime,lastModifiedDateTime,webUrl';

/**
 * Validates and trims a value used verbatim as a URL path segment. Rejects
 * empty, `.` and `..`, which would address a different resource than intended.
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

/**
 * Asserts the input binary exists, enforces the simple-upload size cap, and
 * returns the payload with its content type. Out-of-process binary data is
 * size-checked from its metadata — oversized files are rejected without ever
 * being read.
 */
export async function getUploadBufferWithinCap(
	ctx: IExecuteFunctions,
	itemIndex: number,
	binaryPropertyName: string,
): Promise<{ body: Buffer; contentType: string }> {
	const binaryData = ctx.helpers.assertBinaryData(itemIndex, binaryPropertyName);

	let body: Buffer | undefined;
	let fileSize: number;
	if (binaryData.id) {
		({ fileSize } = await ctx.helpers.getBinaryMetadata(binaryData.id));
	} else {
		body = Buffer.from(binaryData.data, BINARY_ENCODING);
		fileSize = body.byteLength;
	}
	if (fileSize > MAX_SIMPLE_UPLOAD_BYTES) {
		// Ceil so a just-over-the-cap file never reads as "250 MB is larger than 250 MB"
		const sizeMb = Math.ceil(fileSize / (1024 * 1024));
		throw new NodeOperationError(
			ctx.getNode(),
			`The file is ${sizeMb} MB, which is larger than the 250 MB limit for SharePoint uploads`,
			{
				itemIndex,
				description:
					'Files over 250 MB need to be uploaded in pieces, which this operation does not support yet.',
			},
		);
	}

	body ??= await ctx.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
	return { body, contentType: binaryData.mimeType ?? 'application/octet-stream' };
}
