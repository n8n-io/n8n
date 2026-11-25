import type { IBinaryData, IRequestOptions } from 'n8n-workflow';

export const setFilename = (
	preparedBinaryData: IBinaryData,
	requestOptions: IRequestOptions,
	responseFileName: string | undefined,
) => {
	if (
		!preparedBinaryData.fileName &&
		preparedBinaryData.fileExtension &&
		typeof requestOptions.uri === 'string'
	) {
		let requestPathname: string | undefined;
		try {
			requestPathname = new URL(requestOptions.uri).pathname;
		} catch {}

		if (requestPathname?.endsWith(preparedBinaryData.fileExtension)) {
			return requestPathname.split('/').pop();
		}
	}

	if (!preparedBinaryData.fileName && preparedBinaryData.fileExtension) {
		return `${responseFileName ?? 'data'}.${preparedBinaryData.fileExtension}`;
	}

	return preparedBinaryData.fileName;
};
