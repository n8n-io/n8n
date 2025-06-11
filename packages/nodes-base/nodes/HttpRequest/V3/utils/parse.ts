export const mimeTypeFromResponse = (
	responseContentType: string | undefined,
): string | undefined => {
	if (!responseContentType) {
		return undefined;
	}

	// TODO Test:
	// 'image/png'
	// 'text/html; charset=utf-8'
	// 'multipart/form-data; boundary=ExampleBoundaryString'
	return responseContentType.split(' ')[0].split(';')[0];
};
