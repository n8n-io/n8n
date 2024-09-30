export function parseToTimestamp(input: string | number): number {
	let date: Date;

	// Check if the input is already a number (timestamp in milliseconds)
	if (typeof input === 'number') {
		// If it's in milliseconds (13 digits), divide by 1000 to get seconds
		if (input.toString().length === 13) {
			return Math.floor(input / 1000);
		} else if (input.toString().length === 10) {
			// If it's already in seconds (10 digits), return it directly
			return input;
		}
	}

	// If the input is a string, try to parse it as a date
	if (typeof input === 'string') {
		date = new Date(input);

		// Check if the date is valid
		if (!isNaN(date.getTime())) {
			// Convert to seconds and return
			return Math.floor(date.getTime() / 1000);
		}
	}

	// If the input is invalid, throw an error or return a default value
	throw new Error(
		'Invalid date format. Please provide either a date in ISO format like 2024-08-25T15:34:47 or a 10 or 13 digits timestamp.',
	);
}
