export const JSONSafeParse = (source?: string) => {
	try {
		if (!source) {
			return undefined;
		}
		return JSON.parse(source);
	} catch {
		return undefined;
	}
};
