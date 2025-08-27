import moment from 'moment-timezone';

export function parseToTimestamp(dateString: unknown): number {
	if (typeof dateString !== 'string') {
		throw new Error('Invalid date string');
	}
	const timestamp = moment(dateString).valueOf();
	if (isNaN(timestamp)) {
		throw new Error('Invalid date string');
	}
	return timestamp;
}
