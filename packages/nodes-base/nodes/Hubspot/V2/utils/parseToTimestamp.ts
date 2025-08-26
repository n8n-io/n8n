export function parseToTimestamp(dateString: unknown): number {
	if (typeof dateString !== 'string') {
		throw new Error('Invalid date string');
	}
	const dateObject = new Date(dateString);
	if (isNaN(dateObject.getTime())) {
		throw new Error('Invalid date string');
	}
	return dateObject.getTime();
}
