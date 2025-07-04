import type { IBinaryData, IDataObject, IN8nHttpResponse } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';
import type { Readable } from 'stream';

import { sanitizeResponseData } from './sanitization';

export const getBinaryResponse = (binaryData: IBinaryData, headers: IDataObject) => {
	const mimeTypesToSanitize = ['text/html', 'application/xhtml+xml'];

	const contentType = headers['content-type'] as string;
	const shouldSandboxContentType = contentType ? mimeTypesToSanitize.includes(contentType) : false;

	let responseBody: IN8nHttpResponse | Readable;

	if (binaryData.id) {
		responseBody =
			mimeTypesToSanitize.includes(binaryData.mimeType) || shouldSandboxContentType
				? sanitizeResponseData(binaryData.data)
				: { binaryData };
	} else {
		const responseBuffer = Buffer.from(binaryData.data, BINARY_ENCODING);

		responseBody =
			mimeTypesToSanitize.includes(binaryData.mimeType) || shouldSandboxContentType
				? sanitizeResponseData(responseBuffer.toString())
				: responseBuffer;

		headers['content-length'] = (responseBody as Buffer).length;
	}

	headers['content-type'] ??= binaryData.mimeType;

	return responseBody;
};
