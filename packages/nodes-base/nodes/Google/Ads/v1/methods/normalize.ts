export function normalize(value: string): string {
	const normalizedValue = value
		.replace(/\s/g,'') // remove whitespaces
		.toLowerCase();
	return normalizedValue;
}
