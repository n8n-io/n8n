import { DateTime } from 'luxon';
import { NodeOperationError, type IExecuteFunctions } from 'n8n-workflow';

import { validateAndSetDate } from '../../GenericFunctions';

const mockContext = {
	getNode: jest.fn().mockReturnValue('Youtube'),
} as unknown as IExecuteFunctions;

describe('validateAndSetDate', () => {
	const timezone = 'America/New_York';
	let filter: { [key: string]: string };

	beforeEach(() => {
		filter = {};
	});

	it('should convert a valid ISO date and set it with the specified timezone', () => {
		filter.publishedAfter = '2023-10-05T10:00:00.000Z';
		validateAndSetDate(filter, 'publishedAfter', timezone, mockContext);

		expect(filter.publishedAfter).toBe(
			DateTime.fromISO('2023-10-05T10:00:00.000Z').setZone(timezone).toISO(),
		);
	});

	it('should throw NodeOperationError for an invalid date', () => {
		filter.publishedAfter = 'invalid-date';

		expect(() => validateAndSetDate(filter, 'publishedAfter', timezone, mockContext)).toThrow(
			NodeOperationError,
		);

		expect(() => validateAndSetDate(filter, 'publishedAfter', timezone, mockContext)).toThrow(
			`The value "${filter.publishedAfter}" is not a valid DateTime.`,
		);
	});
});
