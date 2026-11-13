import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { getId, splunkApiRequest, toUnixEpoch } from '../../v1/GenericFunctions';

describe('Splunk v1 splunkApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			baseUrl: 'https://splunk.example.com:8089',
			allowUnauthorizedCerts: false,
		});
		context.helpers.requestWithAuthentication.mockResolvedValue('<response/>');

		const userId = 'nathan/admin';
		await splunkApiRequest.call(
			context,
			'GET',
			requestPath`/services/authentication/users/${userId}`,
		);

		expect(String(context.helpers.requestWithAuthentication.mock.calls[0][1].uri)).toBe(
			'https://splunk.example.com:8089/services/authentication/users/nathan%2Fadmin',
		);
	});
});

describe('Splunk v1 getId', () => {
	it.each([
		['https://splunk.example.com:8089/services/authentication/users/nathan', 'nathan'],
		['Errors%20in%20the%20last%20hour', 'Errors in the last hour'],
		['Disk above 90%', 'Disk above 90%'],
	])('should return the id for %s', (value, expected) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue(value);

		expect(getId.call(context, 0, 'userId', '/services/authentication/users/')).toBe(expected);
	});
});

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
