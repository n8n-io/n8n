import type { IDataObject } from 'n8n-workflow';

import { isStream, STREAM_REPLACEMENT } from '../../GenericFunctions';

/**
 * Builds the response copy that a manual run keeps in the node context.
 *
 * The execution saves the node context, so the copy must hold plain data only.
 * A response stream references its socket and request objects, so it is not
 * saved. The copy lists the properties it keeps, so a new property on the
 * response is not saved by default.
 */
export function getResponseForContext(response: IDataObject): IDataObject {
	const { statusCode, statusMessage, headers, body } = response;

	return {
		statusCode,
		statusMessage,
		headers,
		body: isStream(body) ? STREAM_REPLACEMENT : body,
	};
}
