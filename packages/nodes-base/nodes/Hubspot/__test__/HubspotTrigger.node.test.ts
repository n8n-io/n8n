import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getEntityProperties } from '../HubspotTrigger.node';
import { hubspotApiRequest } from '../V1/GenericFunctions';

vi.mock('../V1/GenericFunctions', () => ({
	hubspotApiRequest: vi.fn(),
	propertyEvents: [],
}));

const mockedHubspotApiRequest = vi.mocked(hubspotApiRequest);

describe('HubspotTrigger getEntityProperties', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('maps HubSpot properties into options', async () => {
		mockedHubspotApiRequest.mockResolvedValueOnce([
			{ label: 'Email', name: 'email' },
			{ label: 'First Name', name: 'firstname' },
		]);

		const context = {} as ILoadOptionsFunctions;
		const result = await getEntityProperties.call(context, '/properties/v2/contacts/properties');

		expect(result).toEqual([
			{ name: 'Email', value: 'email' },
			{ name: 'First Name', value: 'firstname' },
		]);
		expect(mockedHubspotApiRequest).toHaveBeenCalledWith(
			'GET',
			'/properties/v2/contacts/properties',
			{},
		);
		expect(mockedHubspotApiRequest.mock.contexts[0]).toBe(context);
	});

	it('throws for non-array responses', async () => {
		mockedHubspotApiRequest.mockResolvedValueOnce({ results: [] });
		const endpoint = '/properties/v2/contacts/properties';
		const context = {
			getNode: vi.fn().mockReturnValue({}),
		} as unknown as ILoadOptionsFunctions;

		await expect(getEntityProperties.call(context, endpoint)).rejects.toThrow(
			`HubSpot returned an unexpected response while loading properties from "${endpoint}". Expected an array of properties.`,
		);
	});

	it('filters invalid property entries', async () => {
		mockedHubspotApiRequest.mockResolvedValueOnce([
			{ label: 'Valid', name: 'valid_name' },
			{ label: 'Missing Name' },
			{ name: 'missing_label' },
			{ label: 123, name: 'bad_label_type' },
		]);

		const result = await getEntityProperties.call(
			{} as ILoadOptionsFunctions,
			'/properties/v2/contacts/properties',
		);

		expect(result).toEqual([{ name: 'Valid', value: 'valid_name' }]);
	});
});
