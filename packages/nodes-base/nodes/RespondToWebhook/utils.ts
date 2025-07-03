import type { IBinaryData, IDataObject, IN8nHttpResponse } from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';
import type { Readable } from 'node:stream';

export const configuredOutputs = (
	version: number,
	parameters: { enableResponseOutput?: boolean },
) => {
	const multipleOutputs = version === 1.3 || (version >= 1.4 && parameters.enableResponseOutput);
	if (multipleOutputs) {
		return [
			{
				type: 'main',
				displayName: 'Input Data',
			},
			{
				type: 'main',
				displayName: 'Response',
			},
		];
	}

	return ['main'];
};

/*
 * To prevent XSS and CSRF, we sanitize the response body by wrapping it in an iframe.
 * This prevents the API from being accessed since the iframe origin will be empty.
 */
export const sanitizeResponseData = (responseBody: string) => {
	return `
		<iframe srcdoc="${responseBody}"
			style="position:fixed; top:0; left:0; width:100vw; height:100vh; border:none; overflow:auto;"
			allowtransparency="true">
		</iframe>`;
};

export const getBinaryResponse = (binaryData: IBinaryData, headers: IDataObject) => {
	let responseBody: IN8nHttpResponse | Readable;

	if (binaryData.id) {
		responseBody =
			binaryData.mimeType === 'text/html' ? sanitizeResponseData(binaryData.data) : { binaryData };
	} else {
		const responseBuffer = Buffer.from(binaryData.data, BINARY_ENCODING);

		responseBody =
			binaryData.mimeType === 'text/html'
				? sanitizeResponseData(responseBuffer.toString())
				: responseBuffer;

		headers['content-length'] = (responseBody as Buffer).length;
	}

	headers['content-type'] ??= binaryData.mimeType;

	return responseBody;
};
