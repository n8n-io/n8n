export const mimeTypeFromResponse = (
	responseContentType: string | undefined,
): string | undefined => {
	if (!responseContentType) {
		return undefined;
	}

	return responseContentType.split(' ')[0].split(';')[0];
};
