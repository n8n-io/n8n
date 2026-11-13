import { mockDeep } from 'vitest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getDimensionsGA4, getMetricsGA4 } from '../../v2/methods/loadOptions';

describe('GoogleAnalyticsV2 - loadOptions request URLs', () => {
	const run = async (
		loadOptions: typeof getDimensionsGA4 | typeof getMetricsGA4,
		propertyId: string,
	) => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNodeParameter.mockImplementation((name: string) =>
			name === 'propertyType' ? 'ga4' : propertyId,
		);
		context.helpers.requestOAuth2.mockResolvedValue({ dimensions: [], metrics: [] });

		await loadOptions.call(context);

		const [credentialType, options] = context.helpers.requestOAuth2.mock.calls[0];
		return { credentialType, uri: String(options.uri), qs: options.qs };
	};

	it('should request the GA4 metadata of the property for dimensions', async () => {
		expect(await run(getDimensionsGA4, '123456789')).toEqual({
			credentialType: 'googleAnalyticsOAuth2',
			uri: 'https://analyticsdata.googleapis.com/v1beta/properties/123456789/metadata',
			qs: { fields: 'dimensions' },
		});
	});

	it('should request the GA4 metadata of the property for metrics', async () => {
		expect(await run(getMetricsGA4, '123456789')).toEqual({
			credentialType: 'googleAnalyticsOAuth2',
			uri: 'https://analyticsdata.googleapis.com/v1beta/properties/123456789/metadata',
			qs: { fields: 'metrics' },
		});
	});

	it('should encode a property ID that contains a slash as one path segment', async () => {
		expect((await run(getDimensionsGA4, '123456789/987654321')).uri).toBe(
			'https://analyticsdata.googleapis.com/v1beta/properties/123456789%2F987654321/metadata',
		);
	});

	it('should reject a property ID with a dot segment', async () => {
		await expect(run(getDimensionsGA4, '123456789/../987654321')).rejects.toThrow(
			'Invalid identifier',
		);
	});
});
