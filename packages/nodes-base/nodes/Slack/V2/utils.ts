export function formatSlackTs(ts: string): string {
	// Format a Slack timestamp to include a decimal point for milliseconds

	// If ts has a decimal point, return it as is.
	// Otherwise, add a decimal point before the last 6 digits.
	if (ts.includes('.')) {
		return ts;
	} else {
		const decimalIndex = ts.length - 6;
		return ts.slice(0, decimalIndex) + '.' + ts.slice(decimalIndex);
	}
}
