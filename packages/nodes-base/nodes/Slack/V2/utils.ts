export function formatTs(ts: string): string {
	// Format a Slack timestamp to include a decimal point for milliseconds

	console.log('formatTs', ts);

	// If ts has a decimal point, it is a timestamp
	if (ts.includes('.')) {
		return ts;
	} else {
		// Add a decimal point to the last 6 digits
		const decimalIndex = ts.length - 6;
		return ts.slice(0, decimalIndex) + '.' + ts.slice(decimalIndex);
	}
}
