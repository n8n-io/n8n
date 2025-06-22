import type { IBinaryData, IRequestOptions } from 'n8n-workflow';

export const setFilename = (
	preparedBinaryData: IBinaryData,
	requestOptions: IRequestOptions,
	responseFileName: string | undefined,
) => {
	if (
		!preparedBinaryData.fileName &&
		preparedBinaryData.fileExtension &&
		typeof requestOptions.uri === 'string' &&
		requestOptions.uri.endsWith(preparedBinaryData.fileExtension)
	) {
		return requestOptions.uri.split('/').pop();
	}

	if (!preparedBinaryData.fileName && preparedBinaryData.fileExtension) {
		return `${responseFileName ?? 'data'}.${preparedBinaryData.fileExtension}`;
	}

	return preparedBinaryData.fileName;
};
