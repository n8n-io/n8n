import type { IBinaryData, IDataObject, IN8nHttpResponse } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';
import type { Readable } from 'stream';

import { sandboxResponseData } from './sandbox';

const setContentLength = (responseBody: IN8nHttpResponse | Readable, headers: IDataObject) => {
	if (Buffer.isBuffer(responseBody)) {
		headers['content-length'] = responseBody.length;
	} else if (typeof responseBody === 'string') {
		headers['content-length'] = Buffer.byteLength(responseBody, 'utf8');
	}
};

export const getBinaryResponse = (binaryData: IBinaryData, headers: IDataObject) => {
	const mimeTypesToSanitize = ['text/html', 'application/xhtml+xml'];

	const contentType = headers['content-type'] as string;
	const shouldSandboxContentType = contentType ? mimeTypesToSanitize.includes(contentType) : false;

	let responseBody: IN8nHttpResponse | Readable;

	if (binaryData.id) {
		responseBody =
			mimeTypesToSanitize.includes(binaryData.mimeType) || shouldSandboxContentType
				? sandboxResponseData(binaryData.data)
				: { binaryData };
	} else {
		const responseBuffer = Buffer.from(binaryData.data, BINARY_ENCODING);

		responseBody =
			mimeTypesToSanitize.includes(binaryData.mimeType) || shouldSandboxContentType
				? sandboxResponseData(responseBuffer.toString())
				: responseBuffer;

		setContentLength(responseBody, headers);
	}

	headers['content-type'] ??= binaryData.mimeType;

	return responseBody;
};
