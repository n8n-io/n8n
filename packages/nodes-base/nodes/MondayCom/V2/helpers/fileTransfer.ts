import type { Readable } from 'stream';

import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';

import { PRESIGNED_URL_ALLOWED_HOST_SUFFIXES } from '../transport/constants';

/** A binary input ready to upload without being copied into memory. */
export interface BinaryUpload {
	body: Buffer | Readable;
	/** Byte length, needed to send a stream with a Content-Length. */
	contentLength: number;
	fileName: string;
	mimeType: string | undefined;
}

/**
 * Resolves an input binary property for upload. Files stored by the binary
 * data manager (filesystem/S3 mode) are streamed from storage, so a 500 MB
 * upload doesn't hold 500 MB in RAM; small inline payloads stay a Buffer.
 */
export async function resolveBinaryUpload(
	context: IExecuteFunctions,
	itemIndex: number,
	binaryPropertyName: string,
): Promise<BinaryUpload> {
	const binaryData = context.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const fileName = binaryData.fileName ?? 'file';

	if (binaryData.id) {
		const [body, metadata] = await Promise.all([
			context.helpers.getBinaryStream(binaryData.id),
			context.helpers.getBinaryMetadata(binaryData.id),
		]);
		return {
			body,
			contentLength: metadata.fileSize,
			fileName,
			mimeType: binaryData.mimeType ?? metadata.mimeType,
		};
	}

	const body = Buffer.from(binaryData.data, BINARY_ENCODING);
	return { body, contentLength: body.length, fileName, mimeType: binaryData.mimeType };
}

/** Dotted-quad IPv4; IPv6 literals keep their brackets in URL.hostname. */
const IP_LITERAL = /^(\d{1,3}(\.\d{1,3}){3}|\[.*\])$/;

/**
 * Guards the pre-signed storage URLs monday returns (bulk-import upload and
 * report) before the node sends data to, or reads data from, them: https
 * only, a hostname (no IP literal, userinfo or non-default port) on one of
 * the allowed storage domains. Requests to these URLs must also not follow
 * redirects (see `PRESIGNED_URL_REQUEST_OPTIONS`).
 */
export function assertPresignedStorageUrl(
	node: INode,
	url: string,
	purpose: string,
	itemIndex: number,
	allowedHostSuffixes: readonly string[] = PRESIGNED_URL_ALLOWED_HOST_SUFFIXES,
): void {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new NodeOperationError(node, `monday.com returned an invalid ${purpose} URL`, {
			itemIndex,
		});
	}

	const hostname = parsed.hostname.toLowerCase();
	const hostAllowed =
		allowedHostSuffixes.length === 0 ||
		allowedHostSuffixes.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
	const wellFormed =
		parsed.protocol === 'https:' &&
		parsed.port === '' &&
		parsed.username === '' &&
		parsed.password === '' &&
		!IP_LITERAL.test(hostname);

	if (!wellFormed || !hostAllowed) {
		throw new NodeOperationError(
			node,
			`monday.com returned an unexpected ${purpose} URL (${parsed.protocol}//${parsed.host}); refusing to use it`,
			{
				itemIndex,
				description:
					"Expected an https URL on monday.com's storage host. If this keeps happening, report it together with the job ID.",
			},
		);
	}
}

/**
 * Request options for pre-signed storage URLs: a redirect could send the
 * data somewhere the URL check never saw, so none are followed.
 */
export const PRESIGNED_URL_REQUEST_OPTIONS = { disableFollowRedirect: true } as const;
