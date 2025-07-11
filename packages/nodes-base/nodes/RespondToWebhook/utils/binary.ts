import { isHtmlRenderedContentType, sandboxHtmlResponse } from 'n8n-core';
import type { IBinaryData, IDataObject, IN8nHttpResponse } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';
import type { Readable } from 'stream';

const setContentLength = (responseBody: IN8nHttpResponse | Readable, headers: IDataObject) => {
	if (Buffer.isBuffer(responseBody)) {
		headers['content-length'] = responseBody.length;
	} else if (typeof responseBody === 'string') {
		headers['content-length'] = Buffer.byteLength(responseBody, 'utf8');
	}
};

/**
 * Returns a response body for a binary data and sets the content-type header.
 */
export const getBinaryResponse = (binaryData: IBinaryData, headers: IDataObject) => {
	const contentType = headers['content-type'] as string;
	const shouldSandboxResponseData =
		isHtmlRenderedContentType(binaryData.mimeType) ||
		(contentType && isHtmlRenderedContentType(contentType));

	let responseBody: IN8nHttpResponse | Readable;

	if (binaryData.id) {
		responseBody = shouldSandboxResponseData
			? sandboxHtmlResponse(binaryData.data)
			: { binaryData };
	} else {
		const responseBuffer = Buffer.from(binaryData.data, BINARY_ENCODING);

		responseBody = shouldSandboxResponseData
			? sandboxHtmlResponse(responseBuffer.toString())
			: responseBuffer;

		setContentLength(responseBody, headers);
	}

	headers['content-type'] ??= binaryData.mimeType;

	return responseBody;
};
