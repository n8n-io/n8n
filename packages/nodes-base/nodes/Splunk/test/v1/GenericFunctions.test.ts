import { toUnixEpoch } from '../../v1/GenericFunctions';

describe('Splunk v1, toUnixEpoch', () => {
	test('converts an absolute timestamp', () => {
		expect(toUnixEpoch('2020-01-01T00:00:00.000Z')).toBe(1577836800);
	});

	test('still reads a four-digit number as a year', () => {
		expect(toUnixEpoch('2024')).toBe(1704067200);
	});

	test.each(['-15m', '-1d@d', 'now', '0', '1', '-1', '1577836800'])(
		'passes %s through for Splunk to read',
		(timestamp) => {
			expect(toUnixEpoch(timestamp)).toBe(timestamp);
		},
	);
});
